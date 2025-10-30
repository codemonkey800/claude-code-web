import { execSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'

import {
  type ClaudeCodeQueryRequest,
  type ClaudeCodeQueryResult,
  type ClaudeCodeQueryState,
  INTERNAL_EVENTS,
} from '@claude-code-web/shared'
import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { EventEmitter2 } from '@nestjs/event-emitter'

import { ClaudeSessionManager } from './claude-session-manager'

/**
 * Claude Code subprocess service implementation
 * Manages long-running Claude CLI subprocesses per session
 * Uses ClaudeSessionManager to keep subprocesses alive across multiple queries
 */
@Injectable()
export class ClaudeCodeSubprocessService implements OnModuleInit {
  private readonly logger = new Logger(ClaudeCodeSubprocessService.name)
  private readonly sessionManager: ClaudeSessionManager
  private readonly queries = new Map<string, ClaudeCodeQueryState>()
  private readonly queryTimeout: number

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {
    const killTimeout =
      this.configService.get<number>('CLAUDE_SUBPROCESS_KILL_TIMEOUT') || 5000
    this.queryTimeout =
      this.configService.get<number>('CLAUDE_QUERY_TIMEOUT') || 300000
    this.sessionManager = new ClaudeSessionManager(eventEmitter, killTimeout)
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

  /**
   * Initialize Claude Code for a session
   * Creates a long-running subprocess that stays alive until shutdown
   */
  initialize(sessionId: string, workingDirectory: string): Promise<void> {
    this.logger.log(
      `Initializing Claude Code subprocess for session ${sessionId} in ${workingDirectory}`,
    )

    try {
      this.sessionManager.createSession(sessionId, workingDirectory)
      this.logger.log(
        `Initialized Claude Code subprocess for session ${sessionId}`,
      )
      return Promise.resolve()
    } catch (error) {
      const errorMessage = `Failed to initialize Claude Code for session ${sessionId}: ${error instanceof Error ? error.message : String(error)}`
      this.logger.error(errorMessage)
      return Promise.reject(
        error instanceof Error ? error : new Error(errorMessage),
      )
    }
  }

  /**
   * Execute a query by sending a message to the existing subprocess
   * Waits for the subprocess to emit a 'result' message before resolving
   */
  async executeQuery(
    request: ClaudeCodeQueryRequest,
  ): Promise<ClaudeCodeQueryResult> {
    const queryId = randomUUID()
    const { sessionId, prompt, model, abortSignal } = request

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

      // Send message to existing subprocess
      this.logger.log(
        `Sending query ${queryId} to session ${sessionId} with model ${model || 'default'}`,
      )

      await this.sessionManager.sendMessage(sessionId, prompt)

      // Wait for result message
      const result = await this.waitForQueryResult(
        queryId,
        sessionId,
        abortSignal,
      )

      // Query completed successfully
      queryState.status = 'completed'
      queryState.completedAt = new Date()

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
      // Cleanup query state
      this.queries.delete(queryId)
    }
  }

  /**
   * Wait for a 'result' message from the subprocess
   * Resolves when result is received, rejects on timeout or abort
   */
  private waitForQueryResult(
    queryId: string,
    sessionId: string,
    abortSignal?: AbortSignal,
  ): Promise<ClaudeCodeQueryResult> {
    const startTime = Date.now()

    return new Promise((resolve, reject) => {
      const timeout = setTimeout((): void => {
        cleanup()
        reject(
          new Error(`Query timeout after ${this.queryTimeout / 1000} seconds`),
        )
      }, this.queryTimeout)

      // Handle abort signal
      const abortHandler = (): void => {
        cleanup()
        reject(new Error('Query aborted by user'))
      }

      if (abortSignal) {
        abortSignal.addEventListener('abort', abortHandler)
      }

      // Listen for messages
      const messageHandler = (data: {
        sessionId: string
        queryId: string | null
        message: { type: string; [key: string]: unknown }
      }): void => {
        // Filter for this session only
        if (data.sessionId !== sessionId) {
          return
        }

        // Update last activity
        const queryState = this.queries.get(queryId)
        if (queryState) {
          queryState.lastActivityAt = new Date()
        }

        // Check for result message
        if (data.message.type === 'result') {
          cleanup()

          const duration = Date.now() - startTime

          const result: ClaudeCodeQueryResult = {
            queryId,
            sessionId,
            status: 'success',
            duration,
            sdkSessionId:
              this.sessionManager.getSessionState(sessionId)?.sdkSessionId ||
              undefined,
          }

          resolve(result)
        }
      }

      const cleanup = (): void => {
        clearTimeout(timeout)
        this.eventEmitter.off(INTERNAL_EVENTS.CLAUDE_MESSAGE, messageHandler)
        if (abortSignal) {
          abortSignal.removeEventListener('abort', abortHandler)
        }
      }

      // Start listening
      this.eventEmitter.on(INTERNAL_EVENTS.CLAUDE_MESSAGE, messageHandler)
    })
  }

  /**
   * Cancel an ongoing query
   * Note: With long-running subprocess, we can't easily cancel a query
   * This method is kept for interface compatibility but is a no-op
   */
  cancelQuery(queryId: string): Promise<void> {
    this.logger.warn(
      `cancelQuery called for ${queryId}, but cancellation is not supported with long-running subprocesses`,
    )
    return Promise.resolve()
  }

  /**
   * Shutdown Claude Code for a session
   * Terminates the long-running subprocess
   */
  async shutdown(sessionId: string): Promise<void> {
    this.logger.log(`Shutting down Claude Code for session ${sessionId}`)

    try {
      await this.sessionManager.destroySession(sessionId)

      // Cleanup any remaining queries for this session
      for (const [queryId, state] of this.queries.entries()) {
        if (state.sessionId === sessionId) {
          this.queries.delete(queryId)
        }
      }

      this.logger.log(`Subprocess destroyed for session ${sessionId}`)
    } catch (error) {
      this.logger.error(
        `Error shutting down session ${sessionId}: ${error instanceof Error ? error.message : String(error)}`,
      )
      throw error
    }
  }

  /**
   * Get current execution status for a query
   */
  getQueryState(queryId: string): ClaudeCodeQueryState | null {
    return this.queries.get(queryId) || null
  }
}
