import { randomUUID } from 'node:crypto'

import {
  type ClaudeCodeQueryRequest,
  type CreateSessionPayload,
  getErrorMessage,
  INTERNAL_EVENTS,
  type SendQueryPayload,
  type SendQueryResponse,
  type Session,
  type SessionError,
  SessionStatus,
} from '@claude-code-web/shared'
import { Injectable, Logger } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'

import { FileSystemService } from 'src/filesystem/filesystem.service'
import { ClaudeCodeSubprocessService } from 'src/modules/claude-code/claude-code-subprocess.service'

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
    private readonly claudeCodeService: ClaudeCodeSubprocessService,
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
      metadata: {
        ...payload.metadata,
        errorLog: [],
        errorCount: 0,
        lastActivityAt: now,
      },
    }

    this.sessions.set(sessionId, session)
    this.logger.log(
      `Created session ${sessionId} in directory: ${session.workingDirectory}`,
    )

    return session
  }

  /**
   * Retrieves a session by its ID
   * Calculates session duration dynamically
   * @param id - The session ID to retrieve
   * @returns The session if found, null otherwise
   */
  getSession(id: string): Session | null {
    const session = this.sessions.get(id)

    if (!session) {
      this.logger.warn(`Session not found: ${id}`)
      return null
    }

    // Calculate duration dynamically
    const duration = this.getSessionDuration(id)
    if (duration !== null) {
      return {
        ...session,
        metadata: {
          ...session.metadata,
          sessionDuration: duration,
        },
      }
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

    // Track activity
    this.recordActivity(id)

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
      // Initialize Claude Code SDK
      await this.claudeCodeService.initialize(id, session.workingDirectory)

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
      // Gracefully shut down Claude Code SDK
      await this.claudeCodeService.shutdown(id)

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
   * Records an error in the session's error log
   * Automatically prunes old errors if the log exceeds the maximum size
   * @param sessionId - The session ID to record the error for
   * @param error - Error details to record
   * @returns True if error was recorded, false if session not found
   */
  recordError(
    sessionId: string,
    error: Omit<SessionError, 'timestamp'>,
  ): boolean {
    const session = this.sessions.get(sessionId)

    if (!session) {
      this.logger.warn(`Cannot record error - session not found: ${sessionId}`)
      return false
    }

    // Initialize metadata if not present
    if (!session.metadata) {
      session.metadata = {}
    }

    // Initialize error tracking fields
    if (!session.metadata.errorLog) {
      session.metadata.errorLog = []
    }
    if (session.metadata.errorCount === undefined) {
      session.metadata.errorCount = 0
    }

    // Create error entry with timestamp
    const errorEntry: SessionError = {
      ...error,
      timestamp: new Date(),
    }

    // Add to error log
    session.metadata.errorLog.push(errorEntry)
    session.metadata.errorCount += 1
    session.metadata.lastErrorAt = errorEntry.timestamp

    // Prune old errors if needed
    const maxSize = session.metadata.configuration?.maxErrorLogSize ?? 50
    if (session.metadata.errorLog.length > maxSize) {
      // Remove oldest errors
      session.metadata.errorLog = session.metadata.errorLog.slice(-maxSize)
    }

    // Update session timestamp
    session.updatedAt = new Date()
    this.sessions.set(sessionId, session)

    this.logger.debug(
      `Recorded error for session ${sessionId}: ${error.message} (${error.code || 'no code'})`,
    )

    return true
  }

  /**
   * Records activity for a session by updating lastActivityAt timestamp
   * @param sessionId - The session ID to record activity for
   * @returns True if activity was recorded, false if session not found
   */
  recordActivity(sessionId: string): boolean {
    const session = this.sessions.get(sessionId)

    if (!session) {
      this.logger.warn(
        `Cannot record activity - session not found: ${sessionId}`,
      )
      return false
    }

    // Initialize metadata if not present
    if (!session.metadata) {
      session.metadata = {}
    }

    session.metadata.lastActivityAt = new Date()
    session.updatedAt = new Date()
    this.sessions.set(sessionId, session)

    return true
  }

  /**
   * Calculates the session duration in milliseconds
   * @param sessionId - The session ID to calculate duration for
   * @returns Duration in milliseconds, or null if session not found
   */
  getSessionDuration(sessionId: string): number | null {
    const session = this.sessions.get(sessionId)

    if (!session) {
      return null
    }

    const now = new Date()
    return now.getTime() - session.createdAt.getTime()
  }

  /**
   * Sends a query to Claude Code for an active session
   * Executes the query asynchronously with streaming results via WebSocket
   * If session is INITIALIZING, automatically starts it first (fallback protection)
   * @param sessionId - The session ID to send the query to
   * @param payload - The query payload containing prompt and optional model
   * @returns Query ID and session ID
   * @throws {Error} if session not found or in invalid state
   */
  async sendQuery(
    sessionId: string,
    payload: SendQueryPayload,
  ): Promise<SendQueryResponse> {
    const session = this.getSession(sessionId)

    if (!session) {
      const error = `Cannot send query - session not found: ${sessionId}`
      this.logger.error(error)
      throw new Error(error)
    }

    // Auto-start INITIALIZING sessions (fallback protection against race conditions)
    if (session.status === SessionStatus.INITIALIZING) {
      this.logger.log(
        `Session ${sessionId} is INITIALIZING, auto-starting before sending query`,
      )
      try {
        await this.startSession(sessionId)
      } catch (error) {
        const errorMsg = `Failed to auto-start session ${sessionId}: ${getErrorMessage(error)}`
        this.logger.error(errorMsg)
        throw new Error(errorMsg)
      }
    } else if (session.status !== SessionStatus.ACTIVE) {
      // Not INITIALIZING or ACTIVE - invalid state
      const error = `Cannot send query to session ${sessionId} - must be in ACTIVE or INITIALIZING state, got: ${session.status}`
      this.logger.error(error)
      throw new Error(error)
    }

    // Build the query request
    const request: ClaudeCodeQueryRequest = {
      sessionId,
      prompt: payload.prompt,
      workingDirectory: session.workingDirectory,
      model: payload.model,
      permissionMode: 'bypassPermissions', // Auto-approve all tools
    }

    // Record activity
    this.recordActivity(sessionId)

    this.logger.log(
      `Sending query to session ${sessionId} with model ${payload.model || 'default'}`,
    )

    // Execute query asynchronously (don't await - it's fire-and-forget)
    // The executeQuery method emits events via EventEmitter2 which are broadcast via WebSocket
    this.claudeCodeService
      .executeQuery(request)
      .then(result => {
        this.logger.log(
          `Query completed for session ${sessionId}: ${result.status} (${result.duration}ms)`,
        )
      })
      .catch(error => {
        this.logger.error(
          `Query failed for session ${sessionId}: ${getErrorMessage(error)}`,
        )
        this.recordError(sessionId, {
          message: `Query execution failed: ${getErrorMessage(error)}`,
          code: 'QUERY_EXECUTION_ERROR',
          context: 'session.sendQuery',
        })
      })

    // Return immediately with a queryId placeholder
    // The actual queryId is generated inside executeQuery, but we don't wait for it
    // For now, return session info - client will receive messages via WebSocket
    return {
      queryId: randomUUID(), // Generate a correlation ID for the client
      sessionId,
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
