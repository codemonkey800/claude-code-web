import { type ChildProcess, execSync, spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import {
  createInterface,
  type Interface as ReadlineInterface,
} from 'node:readline'

import {
  type ClaudeCodeQueryRequest,
  type ClaudeCodeQueryResult,
  type ClaudeCodeQueryState,
  INTERNAL_EVENTS,
} from '@claude-code-web/shared'
import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { EventEmitter2 } from '@nestjs/event-emitter'

import { DEFAULT_CLAUDE_SUBPROCESS_KILL_TIMEOUT } from 'src/config/env.validation'

import type { IClaudeCodeService } from './interfaces/claude-code.interface'

/**
 * CLI message types from stdout
 */
interface CLIMessage {
  type: string
  subtype?: string
  session_id?: string
  [key: string]: unknown
}

interface CLISystemMessage extends CLIMessage {
  type: 'system'
  subtype: 'init' | 'completion'
  session_id?: string
}

/**
 * Claude Code subprocess service implementation
 * Spawns the global `claude` CLI as a subprocess and communicates via stdin/stdout
 * using JSON streaming protocol (matching happy-cli architecture)
 */
@Injectable()
export class ClaudeCodeSubprocessService
  implements IClaudeCodeService, OnModuleInit
{
  private readonly logger = new Logger(ClaudeCodeSubprocessService.name)
  private readonly queries = new Map<string, ClaudeCodeQueryState>()
  private readonly subprocesses = new Map<string, ChildProcess>()
  private readonly readlineInterfaces = new Map<string, ReadlineInterface>()
  private readonly killTimeout: number

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {
    this.killTimeout =
      this.configService.get<number>('CLAUDE_SUBPROCESS_KILL_TIMEOUT') ||
      DEFAULT_CLAUDE_SUBPROCESS_KILL_TIMEOUT
  }

  /**
   * Check if Claude CLI is available on module initialization
   */
  onModuleInit(): void {
    try {
      execSync('claude --version', { stdio: 'ignore' })
      this.logger.log('Claude CLI found and available')
    } catch (_error) {
      this.logger.error(
        'Claude CLI not found. Please install: npm install -g @anthropic-ai/claude-code',
      )
      throw new Error(
        'Claude CLI not found. Please install: npm install -g @anthropic-ai/claude-code',
      )
    }
  }

  initialize(sessionId: string, workingDirectory: string): Promise<void> {
    this.logger.log(
      `Initialized Claude Code subprocess for session ${sessionId} in ${workingDirectory}`,
    )
    return Promise.resolve()
  }

  async executeQuery(
    request: ClaudeCodeQueryRequest,
  ): Promise<ClaudeCodeQueryResult> {
    const queryId = randomUUID()
    const { sessionId, prompt, workingDirectory, model, abortSignal } = request

    // Track query state
    const queryState: ClaudeCodeQueryState = {
      queryId,
      sessionId,
      status: 'initializing',
      startedAt: new Date(),
      lastActivityAt: new Date(),
    }
    this.queries.set(queryId, queryState)

    // Emit start event
    this.eventEmitter.emit(INTERNAL_EVENTS.CLAUDE_QUERY_STARTED, {
      queryId,
      sessionId,
    })

    try {
      queryState.status = 'running'

      // Build CLI arguments (matching happy-cli)
      const args = [
        '--output-format',
        'stream-json',
        '--verbose',
        '--input-format',
        'stream-json',
        '--permission-mode',
        'bypassPermissions', // Auto-approve all tools
      ]

      // Optional arguments
      if (model) {
        args.push('--model', model)
      }

      // Spawn subprocess
      this.logger.debug(
        `Spawning Claude CLI: claude ${args.join(' ')} (cwd: ${workingDirectory})`,
      )

      const subprocess = spawn('claude', args, {
        cwd: workingDirectory,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env }, // Inherits CLAUDE_API_KEY or ~/.claude/ tokens
      })

      this.subprocesses.set(queryId, subprocess)

      // Setup abort handling
      if (abortSignal) {
        abortSignal.addEventListener('abort', () => {
          this.logger.log(`Aborting query ${queryId}`)
          subprocess.kill('SIGTERM')
        })
      }

      // Setup stdout readline interface
      const rl = createInterface({
        input: subprocess.stdout,
        crlfDelay: Infinity,
      })
      this.readlineInterfaces.set(queryId, rl)

      // Parse and emit messages line by line
      rl.on('line', (line: string) => {
        try {
          const message = JSON.parse(line) as CLIMessage
          queryState.lastActivityAt = new Date()

          // Capture CLI session_id from system init message
          if (message.type === 'system' && message.subtype === 'init') {
            const systemMsg = message as CLISystemMessage
            queryState.sdkSessionId = systemMsg.session_id
            this.logger.debug(
              `Captured session ID from Claude CLI: ${systemMsg.session_id}`,
            )
          }

          // Emit message event
          this.eventEmitter.emit(INTERNAL_EVENTS.CLAUDE_MESSAGE, {
            sessionId,
            queryId,
            message,
          })

          // Check if query completed
          if (message.type === 'result') {
            queryState.status = 'completed'
            queryState.completedAt = new Date()
          }
        } catch (error) {
          this.logger.error(`Failed to parse message: ${line}`, error)
        }
      })

      // Handle stderr
      subprocess.stderr.on('data', (data: Buffer) => {
        const errorText = data.toString()
        this.logger.error(`Claude CLI stderr: ${errorText}`)

        // Check for authentication errors
        if (
          errorText.includes('not authenticated') ||
          errorText.includes('CLAUDE_API_KEY')
        ) {
          const authError = new Error(
            'Claude CLI not authenticated. Run: claude auth (or set CLAUDE_API_KEY environment variable)',
          )
          this.eventEmitter.emit(INTERNAL_EVENTS.CLAUDE_QUERY_ERROR, {
            queryId,
            error: authError,
          })
        }
      })

      // Write initial prompt to stdin
      const initialMessage = {
        type: 'user',
        message: {
          role: 'user',
          content: prompt,
        },
      }

      subprocess.stdin.write(JSON.stringify(initialMessage) + '\n')

      // Wait for process to complete
      await new Promise<void>((resolve, reject) => {
        subprocess.on('exit', (code: number | null) => {
          if (code === 0 || code === null) {
            resolve()
          } else {
            reject(
              new Error(
                `Claude CLI exited with code ${code}. Check if CLI is authenticated (run: claude auth)`,
              ),
            )
          }
        })

        subprocess.on('error', (error: Error) => {
          this.logger.error(`Subprocess error: ${error.message}`)
          reject(error)
        })
      })

      // Query completed successfully
      queryState.status = 'completed'
      if (!queryState.completedAt) {
        queryState.completedAt = new Date()
      }

      const result: ClaudeCodeQueryResult = {
        queryId,
        sessionId,
        status: 'success',
        duration:
          queryState.completedAt.getTime() - queryState.startedAt.getTime(),
        sdkSessionId: queryState.sdkSessionId,
      }

      this.eventEmitter.emit(INTERNAL_EVENTS.CLAUDE_QUERY_COMPLETED, {
        queryId,
        result,
      })

      this.logger.log(
        `Query ${queryId} completed for session ${sessionId} in ${result.duration}ms`,
      )

      return result
    } catch (error) {
      queryState.status = abortSignal?.aborted ? 'cancelled' : 'error'
      queryState.error = error instanceof Error ? error.message : String(error)
      queryState.completedAt = new Date()

      this.eventEmitter.emit(INTERNAL_EVENTS.CLAUDE_QUERY_ERROR, {
        queryId,
        error,
      })

      this.logger.error(
        `Query ${queryId} failed for session ${sessionId}: ${queryState.error}`,
      )

      throw error
    } finally {
      // Cleanup
      await this.cleanup(queryId)
    }
  }

  cancelQuery(queryId: string): Promise<void> {
    const subprocess = this.subprocesses.get(queryId)
    if (subprocess && !subprocess.killed) {
      subprocess.kill('SIGTERM')
      this.logger.log(`Cancelled query ${queryId}`)
    }
    return Promise.resolve()
  }

  async shutdown(sessionId: string): Promise<void> {
    this.logger.log(`Shutdown Claude Code for session ${sessionId}`)
    // Cleanup all queries for this session
    for (const [queryId, state] of this.queries.entries()) {
      if (state.sessionId === sessionId) {
        await this.cancelQuery(queryId)
        await this.cleanup(queryId)
      }
    }
  }

  getQueryState(queryId: string): ClaudeCodeQueryState | null {
    return this.queries.get(queryId) || null
  }

  /**
   * Cleanup resources for a query with proper process termination
   */
  private async cleanup(queryId: string): Promise<void> {
    // Close readline interface
    const rl = this.readlineInterfaces.get(queryId)
    if (rl) {
      rl.close()
      this.readlineInterfaces.delete(queryId)
    }

    // Kill subprocess with SIGTERM -> SIGKILL fallback
    const subprocess = this.subprocesses.get(queryId)
    if (subprocess && !subprocess.killed) {
      try {
        // Send SIGTERM for graceful shutdown
        subprocess.kill('SIGTERM')

        // Wait for graceful shutdown with timeout
        const killPromise = new Promise<void>(resolve => {
          subprocess.once('exit', () => {
            this.logger.debug(`Query ${queryId} subprocess exited gracefully`)
            resolve()
          })
        })

        const timeoutPromise = new Promise<void>(resolve => {
          setTimeout(() => {
            if (!subprocess.killed) {
              this.logger.warn(
                `Query ${queryId} subprocess did not exit gracefully, sending SIGKILL`,
              )
              subprocess.kill('SIGKILL')
            }
            resolve()
          }, this.killTimeout)
        })

        // Wait for either graceful exit or timeout + force kill
        await Promise.race([killPromise, timeoutPromise])

        // Close streams explicitly
        subprocess.stdin?.destroy()
        subprocess.stdout?.destroy()
        subprocess.stderr?.destroy()
      } catch (error) {
        this.logger.error(
          `Error killing subprocess for query ${queryId}: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }

    // Clean up tracking maps
    this.subprocesses.delete(queryId)
    this.queries.delete(queryId)
  }
}
