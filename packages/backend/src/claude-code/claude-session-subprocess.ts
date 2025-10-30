import { type ChildProcess, spawn } from 'node:child_process'
import {
  createInterface,
  type Interface as ReadlineInterface,
} from 'node:readline'

import { INTERNAL_EVENTS } from '@claude-code-web/shared'
import { Logger } from '@nestjs/common'
import type { EventEmitter2 } from '@nestjs/event-emitter'

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
 * Manages a single long-running Claude CLI subprocess for a session
 * Keeps stdin open for multiple queries - CLI handles message queuing internally
 */
export class ClaudeSessionSubprocess {
  private readonly logger = new Logger(ClaudeSessionSubprocess.name)
  private subprocess: ChildProcess | null = null
  private readlineInterface: ReadlineInterface | null = null
  private stdinOpen = false
  private sdkSessionId: string | null = null
  private readonly killTimeout: number

  constructor(
    private readonly sessionId: string,
    private readonly workingDirectory: string,
    private readonly eventEmitter: EventEmitter2,
    killTimeout: number = 5000,
  ) {
    this.killTimeout = killTimeout
  }

  /**
   * Initialize the subprocess with stream-json input mode
   * This keeps stdin open for multiple message writes
   */
  initialize(): void {
    if (this.subprocess) {
      throw new Error(
        `Subprocess already initialized for session ${this.sessionId}`,
      )
    }

    // Build CLI arguments - critical: --input-format stream-json
    const args = [
      '--input-format',
      'stream-json', // Keeps stdin open!
      '--output-format',
      'stream-json',
      '--verbose',
      '--permission-mode',
      'bypassPermissions', // Auto-approve all tools
    ]

    this.logger.log(
      `Spawning Claude CLI for session ${this.sessionId}: claude ${args.join(' ')} (cwd: ${this.workingDirectory})`,
    )

    // Spawn subprocess
    this.subprocess = spawn('claude', args, {
      cwd: this.workingDirectory,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }, // Inherits CLAUDE_API_KEY or ~/.claude/ tokens
    })

    this.stdinOpen = true

    // Setup output handlers
    this.setupOutputHandlers()

    // Setup error handlers
    this.setupErrorHandlers()

    this.logger.log(`Subprocess spawned for session ${this.sessionId}`)
  }

  /**
   * Send a message to the subprocess
   * Writes directly to stdin - Claude CLI handles message queuing internally
   * @returns Promise that resolves when message is written, rejects on error
   */
  async sendMessage(prompt: string): Promise<void> {
    if (!this.subprocess || !this.stdinOpen) {
      throw new Error(
        `Cannot send message to session ${this.sessionId}: subprocess not initialized or stdin closed`,
      )
    }

    if (!this.subprocess.stdin) {
      throw new Error(
        `Cannot write to stdin for session ${this.sessionId}: stdin is null`,
      )
    }

    this.logger.debug(`Sending message to session ${this.sessionId}`)

    // Build message payload
    const message = {
      type: 'user',
      message: {
        role: 'user',
        content: prompt,
      },
    }

    // Write to stdin with proper error handling
    // Capture subprocess reference to avoid TypeScript null issues in Promise
    const subprocess = this.subprocess

    return new Promise((resolve, reject) => {
      // Double-check subprocess and stdin are still valid
      if (!subprocess || !subprocess.stdin) {
        const stdinError = new Error(
          'subprocess or stdin became null during write',
        )
        reject(stdinError)
        return
      }

      subprocess.stdin.write(
        JSON.stringify(message) + '\n',
        (error?: Error | null) => {
          if (error) {
            this.logger.error(
              `Failed to write message to stdin for session ${this.sessionId}: ${error.message}`,
            )
            // Emit error event for monitoring
            this.eventEmitter.emit(INTERNAL_EVENTS.CLAUDE_QUERY_ERROR, {
              sessionId: this.sessionId,
              error,
            })
            reject(error)
          } else {
            this.logger.debug(
              `Message written to stdin for session ${this.sessionId}`,
            )
            resolve()
          }
        },
      )
    })
  }

  /**
   * Setup output handlers for stdout
   */
  private setupOutputHandlers(): void {
    if (
      !this.subprocess ||
      !this.subprocess.stdout ||
      !this.subprocess.stderr
    ) {
      this.logger.error(
        `Cannot setup output handlers for session ${this.sessionId}: subprocess or streams are null`,
      )
      return
    }

    // Setup readline interface for line-by-line parsing
    this.readlineInterface = createInterface({
      input: this.subprocess.stdout,
      crlfDelay: Infinity,
    })

    // Parse and emit messages line by line
    this.readlineInterface.on('line', (line: string) => {
      try {
        const message = JSON.parse(line) as CLIMessage

        // Capture CLI session_id from system init message
        if (message.type === 'system' && message.subtype === 'init') {
          const systemMsg = message as CLISystemMessage
          this.sdkSessionId = systemMsg.session_id || null
          this.logger.debug(
            `Captured SDK session ID from Claude CLI: ${systemMsg.session_id}`,
          )
        }

        // Emit message event
        this.eventEmitter.emit(INTERNAL_EVENTS.CLAUDE_MESSAGE, {
          sessionId: this.sessionId,
          queryId: null, // No query ID for long-running subprocess
          message,
        })

        // Emit ready event when query completes
        if (message.type === 'result') {
          this.eventEmitter.emit(INTERNAL_EVENTS.CLAUDE_READY, {
            sessionId: this.sessionId,
          })
        }
      } catch (error) {
        this.logger.error(
          `Failed to parse message for session ${this.sessionId}: ${line}`,
          error,
        )
      }
    })

    // Handle stderr
    this.subprocess.stderr.on('data', (data: Buffer) => {
      const errorText = data.toString()
      this.logger.error(
        `Claude CLI stderr for session ${this.sessionId}: ${errorText}`,
      )

      // Check for authentication errors
      if (
        errorText.includes('not authenticated') ||
        errorText.includes('CLAUDE_API_KEY')
      ) {
        const authError = new Error(
          'Claude CLI not authenticated. Run: claude auth (or set CLAUDE_API_KEY environment variable)',
        )
        this.eventEmitter.emit(INTERNAL_EVENTS.CLAUDE_QUERY_ERROR, {
          sessionId: this.sessionId,
          error: authError,
        })
      }
    })
  }

  /**
   * Setup error handlers for subprocess
   */
  private setupErrorHandlers(): void {
    if (!this.subprocess) {
      return
    }

    this.subprocess.on('exit', (code: number | null, signal: string | null) => {
      this.logger.log(
        `Subprocess exited for session ${this.sessionId} (code: ${code}, signal: ${signal})`,
      )

      this.stdinOpen = false

      // If unexpected exit, emit error and crash events
      if (code !== null && code !== 0) {
        this.logger.error(
          `Subprocess crashed for session ${this.sessionId} with code ${code}`,
        )
        const error = new Error(
          `Claude CLI exited with code ${code}. Check if CLI is authenticated (run: claude auth)`,
        )

        // Emit query error for current query
        this.eventEmitter.emit(INTERNAL_EVENTS.CLAUDE_QUERY_ERROR, {
          sessionId: this.sessionId,
          error,
        })

        // Emit subprocess crashed event for session recovery
        this.eventEmitter.emit(INTERNAL_EVENTS.CLAUDE_SUBPROCESS_CRASHED, {
          sessionId: this.sessionId,
          exitCode: code,
          signal,
          error,
        })
      }
    })

    this.subprocess.on('error', (error: Error) => {
      this.logger.error(
        `Subprocess error for session ${this.sessionId}: ${error.message}`,
      )
      this.eventEmitter.emit(INTERNAL_EVENTS.CLAUDE_QUERY_ERROR, {
        sessionId: this.sessionId,
        error,
      })
    })
  }

  /**
   * Gracefully shutdown the subprocess
   * Closes stdin and waits for process to exit
   */
  async shutdown(): Promise<void> {
    if (!this.subprocess) {
      this.logger.debug(
        `No subprocess to shutdown for session ${this.sessionId}`,
      )
      return
    }

    this.logger.log(`Shutting down subprocess for session ${this.sessionId}`)

    // Close readline interface
    if (this.readlineInterface) {
      this.readlineInterface.close()
      this.readlineInterface = null
    }

    // Close stdin to signal end
    if (this.stdinOpen && this.subprocess.stdin) {
      try {
        this.subprocess.stdin.end()
        this.stdinOpen = false
      } catch (error) {
        this.logger.error(
          `Error closing stdin for session ${this.sessionId}: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }

    // Wait for graceful shutdown with timeout
    await this.forceKillWithTimeout()

    // Clean up
    this.subprocess = null

    this.logger.log(
      `Subprocess shutdown complete for session ${this.sessionId}`,
    )
  }

  /**
   * Force kill subprocess with SIGTERM -> SIGKILL fallback
   */
  private async forceKillWithTimeout(): Promise<void> {
    if (!this.subprocess || this.subprocess.killed) {
      return
    }

    // Capture subprocess reference to avoid race conditions
    const subprocess = this.subprocess

    try {
      // Send SIGTERM for graceful shutdown
      subprocess.kill('SIGTERM')

      // Wait for graceful shutdown with timeout
      const killPromise = new Promise<void>(resolve => {
        subprocess.once('exit', () => {
          this.logger.debug(
            `Subprocess exited gracefully for session ${this.sessionId}`,
          )
          resolve()
        })
      })

      const timeoutPromise = new Promise<void>(resolve => {
        setTimeout(() => {
          if (!subprocess.killed) {
            this.logger.warn(
              `Subprocess did not exit gracefully for session ${this.sessionId}, sending SIGKILL`,
            )
            subprocess.kill('SIGKILL')
          }
          resolve()
        }, this.killTimeout)
      })

      // Wait for either graceful exit or timeout + force kill
      await Promise.race([killPromise, timeoutPromise])

      // Close streams explicitly
      if (subprocess.stdin) {
        subprocess.stdin.destroy()
      }
      if (subprocess.stdout) {
        subprocess.stdout.destroy()
      }
      if (subprocess.stderr) {
        subprocess.stderr.destroy()
      }
    } catch (error) {
      this.logger.error(
        `Error killing subprocess for session ${this.sessionId}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Get the SDK session ID (captured from init message)
   */
  getSdkSessionId(): string | null {
    return this.sdkSessionId
  }

  /**
   * Check if subprocess is alive
   */
  isAlive(): boolean {
    return this.subprocess !== null && !this.subprocess.killed && this.stdinOpen
  }

  /**
   * Check if subprocess is healthy and ready to accept messages
   * More comprehensive than isAlive() - checks stdin stream validity
   */
  isHealthy(): boolean {
    return (
      this.isAlive() &&
      this.subprocess?.stdin !== null &&
      this.subprocess?.stdin !== undefined &&
      !this.subprocess?.stdin.destroyed
    )
  }
}
