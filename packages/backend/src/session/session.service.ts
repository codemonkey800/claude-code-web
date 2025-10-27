import { randomUUID } from 'node:crypto'

import {
  type CreateSessionPayload,
  type Session,
  SessionStatus,
} from '@claude-code-web/shared'
import { Injectable, Logger } from '@nestjs/common'

import { FileSystemService } from 'src/filesystem/filesystem.service'

/**
 * Service for managing coding workspace sessions
 * Handles session lifecycle, storage, and state management
 */
@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name)
  private readonly sessions = new Map<string, Session>()

  constructor(private readonly fileSystemService: FileSystemService) {}

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
