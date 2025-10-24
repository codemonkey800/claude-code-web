import { randomUUID } from 'node:crypto'

import {
  type CreateSessionPayload,
  type Session,
  SessionStatus,
} from '@claude-code-web/shared'
import { Injectable, Logger } from '@nestjs/common'

/**
 * Service for managing coding workspace sessions
 * Handles session lifecycle, storage, and state management
 */
@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name)
  private readonly sessions = new Map<string, Session>()

  /**
   * Creates a new session with the provided payload
   * @param payload - Session creation parameters
   * @returns The newly created session
   */
  createSession(payload: CreateSessionPayload): Session {
    const sessionId = randomUUID()
    const now = new Date()

    const session: Session = {
      id: sessionId,
      status: SessionStatus.PENDING,
      workingDirectory: payload.workingDirectory || process.cwd(),
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
   * @param id - The session ID to update
   * @param status - The new status
   * @returns The updated session if found, null otherwise
   */
  updateSessionStatus(id: string, status: SessionStatus): Session | null {
    const session = this.sessions.get(id)

    if (!session) {
      this.logger.warn(`Cannot update status - session not found: ${id}`)
      return null
    }

    session.status = status
    session.updatedAt = new Date()
    this.sessions.set(id, session)

    this.logger.log(`Updated session ${id} status to: ${status}`)

    return session
  }

  /**
   * Deletes a session by its ID
   * @param id - The session ID to delete
   * @returns True if the session was deleted, false if not found
   */
  deleteSession(id: string): boolean {
    const existed = this.sessions.delete(id)

    if (existed) {
      this.logger.log(`Deleted session: ${id}`)
    } else {
      this.logger.warn(`Cannot delete - session not found: ${id}`)
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
}
