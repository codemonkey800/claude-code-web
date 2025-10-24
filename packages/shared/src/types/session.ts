/**
 * Session type definitions for Claude Code Web
 * Defines the structure and status of coding sessions
 */

/**
 * Possible states for a session lifecycle
 */
export enum SessionStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Optional metadata that can be attached to a session
 */
export interface SessionMetadata {
  /** Unique identifier for the client that created this session */
  clientId?: string
  /** Tags for categorizing and organizing sessions */
  tags?: string[]
  /** Human-readable description of the session */
  description?: string
}

/**
 * Complete session object representing a coding session
 */
export interface Session {
  /** Unique identifier for the session (UUID v4) */
  id: string
  /** Current status of the session */
  status: SessionStatus
  /** Absolute path to the working directory for this session */
  workingDirectory: string
  /** Timestamp when the session was created */
  createdAt: Date
  /** Timestamp when the session was last updated */
  updatedAt: Date
  /** Optional metadata for additional session information */
  metadata?: SessionMetadata
}

/**
 * Payload for creating a new session
 */
export interface CreateSessionPayload {
  /** Optional working directory path. If not provided, server will use default */
  workingDirectory?: string
  /** Optional metadata to attach to the session */
  metadata?: SessionMetadata
}
