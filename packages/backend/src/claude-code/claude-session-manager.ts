import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import type { EventEmitter2 } from '@nestjs/event-emitter'

import { ClaudeSessionSubprocess } from './claude-session-subprocess'

/**
 * Session state information
 */
export interface SessionState {
  sessionId: string
  isAlive: boolean
  sdkSessionId: string | null
}

/**
 * Manages all active Claude CLI subprocesses across sessions
 * Provides session-level lifecycle management and message routing
 */
@Injectable()
export class ClaudeSessionManager implements OnModuleDestroy {
  private readonly logger = new Logger(ClaudeSessionManager.name)
  private readonly sessions = new Map<string, ClaudeSessionSubprocess>()

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly killTimeout: number = 5000,
  ) {}

  /**
   * Create a new session subprocess
   * @param sessionId - Session ID to create subprocess for
   * @param workingDirectory - Working directory for the subprocess
   * @throws {Error} if session already exists
   */
  createSession(sessionId: string, workingDirectory: string): void {
    if (this.sessions.has(sessionId)) {
      throw new Error(`Session ${sessionId} already has an active subprocess`)
    }

    this.logger.log(
      `Creating subprocess for session ${sessionId} in ${workingDirectory}`,
    )

    // Create subprocess instance
    const subprocess = new ClaudeSessionSubprocess(
      sessionId,
      workingDirectory,
      this.eventEmitter,
      this.killTimeout,
    )

    // Initialize (spawn subprocess)
    subprocess.initialize()

    // Track in map
    this.sessions.set(sessionId, subprocess)

    this.logger.log(
      `Subprocess created for session ${sessionId} (total active: ${this.sessions.size})`,
    )
  }

  /**
   * Send a message to an existing session subprocess
   * @param sessionId - Session ID to send message to
   * @param prompt - User prompt to send
   * @throws {Error} if session not found or not healthy
   * @returns Promise that resolves when message is sent, rejects on error
   */
  async sendMessage(sessionId: string, prompt: string): Promise<void> {
    const subprocess = this.sessions.get(sessionId)

    if (!subprocess) {
      throw new Error(`Cannot send message: session ${sessionId} not found`)
    }

    if (!subprocess.isHealthy()) {
      throw new Error(
        `Cannot send message: subprocess for session ${sessionId} is not healthy`,
      )
    }

    // Await and propagate any errors from subprocess
    await subprocess.sendMessage(prompt)
  }

  /**
   * Destroy a session subprocess
   * @param sessionId - Session ID to destroy subprocess for
   */
  async destroySession(sessionId: string): Promise<void> {
    const subprocess = this.sessions.get(sessionId)

    if (!subprocess) {
      this.logger.debug(`Session ${sessionId} not found, nothing to destroy`)
      return
    }

    this.logger.log(`Destroying subprocess for session ${sessionId}`)

    // Shutdown subprocess
    await subprocess.shutdown()

    // Remove from map
    this.sessions.delete(sessionId)

    this.logger.log(
      `Subprocess destroyed for session ${sessionId} (total active: ${this.sessions.size})`,
    )
  }

  /**
   * Get session state
   * @param sessionId - Session ID to get state for
   * @returns Session state or null if not found
   */
  getSessionState(sessionId: string): SessionState | null {
    const subprocess = this.sessions.get(sessionId)

    if (!subprocess) {
      return null
    }

    return {
      sessionId,
      isAlive: subprocess.isAlive(),
      sdkSessionId: subprocess.getSdkSessionId(),
    }
  }

  /**
   * Check if a session has an active subprocess
   * @param sessionId - Session ID to check
   * @returns True if session exists and subprocess is alive
   */
  hasSession(sessionId: string): boolean {
    const subprocess = this.sessions.get(sessionId)
    return subprocess !== undefined && subprocess.isAlive()
  }

  /**
   * Get all active session IDs
   * @returns Array of session IDs
   */
  getActiveSessionIds(): string[] {
    return Array.from(this.sessions.keys())
  }

  /**
   * Get count of active sessions
   * @returns Number of active sessions
   */
  getActiveSessionCount(): number {
    return this.sessions.size
  }

  /**
   * Cleanup all sessions on module destruction
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log(
      `Module destroying, cleaning up ${this.sessions.size} active subprocesses`,
    )

    const destroyPromises = Array.from(this.sessions.keys()).map(sessionId =>
      this.destroySession(sessionId),
    )

    await Promise.all(destroyPromises)

    this.logger.log('All subprocesses cleaned up')
  }
}
