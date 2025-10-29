import { randomUUID } from 'node:crypto'

import {
  type CreateSessionPayload,
  getErrorMessage,
  INTERNAL_EVENTS,
  type Session,
  SessionStatus,
  sleep,
} from '@claude-code-web/shared'
import { Injectable, Logger } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'

import { FileSystemService } from 'src/filesystem/filesystem.service'

/**
 * Service for managing coding workspace sessions
 * Handles session lifecycle, storage, and state management
 */
@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name)
  private readonly sessions = new Map<string, Session>()

  constructor(
    private readonly fileSystemService: FileSystemService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Creates a new session with the provided payload
   * Validates the working directory before creating the session
   * @param payload - Session creation parameters
   * @returns The newly created session
   * @throws {Error} if the working directory is invalid
   */
  async createSession(payload: CreateSessionPayload): Promise<Session> {
    const sessionId = randomUUID()
    const now = new Date()

    // Determine working directory (use payload or default to cwd)
    const workingDirectory = payload.workingDirectory || process.cwd()

    // Validate the working directory using FileSystemService
    const validation =
      await this.fileSystemService.validatePath(workingDirectory)

    if (!validation.valid) {
      this.logger.error(
        `Failed to create session: Invalid working directory - ${validation.error}`,
      )
      throw new Error(
        `Invalid working directory: ${validation.error || 'Path validation failed'}`,
      )
    }

    if (!validation.isDirectory) {
      this.logger.error(
        `Failed to create session: Path is not a directory - ${workingDirectory}`,
      )
      throw new Error(
        `Working directory must be a directory, not a file: ${workingDirectory}`,
      )
    }

    // Use the resolved absolute path from validation
    const resolvedPath = validation.resolvedPath || workingDirectory

    const session: Session = {
      id: sessionId,
      status: SessionStatus.INITIALIZING,
      workingDirectory: resolvedPath,
      createdAt: now,
      updatedAt: now,
      metadata: payload.metadata,
    }

    this.sessions.set(sessionId, session)
    this.logger.log(
      `Created session ${sessionId} in directory: ${session.workingDirectory}`,
    )

    return session
  }

  /**
   * Retrieves a session by its ID
   * @param id - The session ID to retrieve
   * @returns The session if found, null otherwise
   */
  getSession(id: string): Session | null {
    const session = this.sessions.get(id)

    if (!session) {
      this.logger.warn(`Session not found: ${id}`)
      return null
    }

    return session
  }

  /**
   * Retrieves all sessions
   * @returns Array of all sessions
   */
  getAllSessions(): Session[] {
    return Array.from(this.sessions.values())
  }

  /**
   * Updates the status of a session
   * Validates state transitions and emits events
   * @param id - The session ID to update
   * @param status - The new status
   * @returns The updated session if found and transition is valid, null otherwise
   */
  updateSessionStatus(id: string, status: SessionStatus): Session | null {
    const session = this.sessions.get(id)

    if (!session) {
      this.logger.warn(`Cannot update status - session not found: ${id}`)
      return null
    }

    // Validate state transition
    if (!this.canTransitionTo(session.status, status)) {
      this.logger.warn(
        `Invalid state transition for session ${id}: ${session.status} -> ${status}`,
      )
      return null
    }

    // Store old status for event emission
    const oldStatus = session.status

    // Update session
    session.status = status
    session.updatedAt = new Date()
    this.sessions.set(id, session)

    this.logger.log(`Updated session ${id} status: ${oldStatus} -> ${status}`)

    // Emit event for WebSocket broadcasting
    this.eventEmitter.emit(INTERNAL_EVENTS.SESSION_STATUS_CHANGED, {
      sessionId: id,
      oldStatus,
      newStatus: status,
      session,
    })

    return session
  }

  /**
   * Deletes a session by its ID
   * Automatically stops the session if it's ACTIVE or INITIALIZING
   * @param id - The session ID to delete
   * @returns True if the session was deleted, false if not found
   */
  async deleteSession(id: string): Promise<boolean> {
    const session = this.sessions.get(id)

    if (!session) {
      this.logger.warn(`Cannot delete - session not found: ${id}`)
      return false
    }

    // If session is not terminated, stop it first
    if (session.status !== SessionStatus.TERMINATED) {
      this.logger.log(
        `Stopping ${session.status} session before deletion: ${id}`,
      )
      await this.stopSession(id)
    }

    // Now safe to delete
    const existed = this.sessions.delete(id)

    if (existed) {
      this.logger.log(`Deleted session: ${id}`)
      // Emit event for WebSocket broadcast
      this.eventEmitter.emit(INTERNAL_EVENTS.SESSION_DELETED, {
        sessionId: id,
        reason: 'Deleted via REST API',
      })
    }

    return existed
  }

  /**
   * Gets the total number of sessions
   * @returns The count of sessions
   */
  getSessionCount(): number {
    return this.sessions.size
  }

  /**
   * Starts a session by transitioning from INITIALIZING to ACTIVE
   * Prepares for future Claude Code SDK initialization
   * @param id - The session ID to start
   * @returns The updated session with ACTIVE status
   * @throws {Error} if session not found, not in INITIALIZING state, or initialization fails
   */
  async startSession(id: string): Promise<Session> {
    const session = this.getSession(id)

    if (!session) {
      const error = `Cannot start session - session not found: ${id}`
      this.logger.error(error)
      throw new Error(error)
    }

    if (session.status !== SessionStatus.INITIALIZING) {
      const error = `Cannot start session ${id} - must be in INITIALIZING state, got: ${session.status}`
      this.logger.error(error)
      throw new Error(error)
    }

    try {
      // TODO: Initialize Claude Code SDK here when integrated
      // await this.claudeCodeService.initialize(session.workingDirectory)
      await sleep(1000) // Placeholder for async SDK initialization

      // Transition to ACTIVE
      const updated = this.updateSessionStatus(id, SessionStatus.ACTIVE)

      if (!updated) {
        throw new Error('Failed to transition session to ACTIVE')
      }

      this.logger.log(`Started session ${id}`)
      return updated
    } catch (error) {
      this.logger.error(
        `Failed to start session ${id}, transitioning to TERMINATED`,
        error,
      )
      // On failure, transition to TERMINATED
      this.updateSessionStatus(id, SessionStatus.TERMINATED)
      throw error
    }
  }

  /**
   * Stops a session by transitioning to TERMINATED
   * Gracefully shuts down Claude Code SDK (when integrated)
   * @param id - The session ID to stop
   * @returns The updated session with TERMINATED status
   * @throws {Error} if session not found
   */
  async stopSession(id: string): Promise<Session> {
    const session = this.getSession(id)

    if (!session) {
      const error = `Cannot stop session - session not found: ${id}`
      this.logger.error(error)
      throw new Error(error)
    }

    // If already terminated, return as-is (idempotent)
    if (session.status === SessionStatus.TERMINATED) {
      this.logger.debug(`Session ${id} already terminated`)
      return session
    }

    try {
      // TODO: Gracefully shut down Claude Code SDK here when integrated
      // await this.claudeCodeService.shutdown(id)
      await sleep(1000) // Placeholder for async SDK cleanup

      // Transition to TERMINATED
      const updated = this.updateSessionStatus(id, SessionStatus.TERMINATED)

      if (!updated) {
        throw new Error('Failed to transition session to TERMINATED')
      }

      this.logger.log(`Stopped session ${id}`)
      return updated
    } catch (error) {
      this.logger.error(
        `Error stopping session ${id}, forcing termination`,
        error,
      )
      // Force transition to TERMINATED even on error
      const updated = this.updateSessionStatus(id, SessionStatus.TERMINATED)
      if (!updated) {
        throw new Error(
          `Failed to force terminate session ${id} after error: ${getErrorMessage(error)}`,
        )
      }
      return updated
    }
  }

  /**
   * Validates whether a state transition is allowed
   * @param from - Current session status
   * @param to - Target session status
   * @returns True if the transition is valid, false otherwise
   */
  private canTransitionTo(from: SessionStatus, to: SessionStatus): boolean {
    // TERMINATED is a terminal state - no transitions allowed
    if (from === SessionStatus.TERMINATED) {
      return false
    }

    // Define valid transitions
    switch (from) {
      case SessionStatus.INITIALIZING:
        // INITIALIZING can transition to ACTIVE or TERMINATED
        return to === SessionStatus.ACTIVE || to === SessionStatus.TERMINATED
      case SessionStatus.ACTIVE:
        // ACTIVE can only transition to TERMINATED
        return to === SessionStatus.TERMINATED
      default:
        return false
    }
  }
}
