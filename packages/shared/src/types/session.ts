/**
 * Session type definitions for Claude Code Web
 * Defines the structure and status of coding sessions
 */

/**
 * Possible states for a session lifecycle
 */
export enum SessionStatus {
  /** Session created, Claude Code starting up */
  INITIALIZING = 'initializing',
  /** Claude Code running, accepting commands */
  ACTIVE = 'active',
  /** Session ended (any reason) */
  TERMINATED = 'terminated',
}

/**
 * Structured error log entry for session errors
 */
export interface SessionError {
  /** When the error occurred */
  timestamp: Date
  /** Human-readable error message */
  message: string
  /** Error code/type (e.g., 'FILESYSTEM_ERROR', 'PERMISSION_DENIED') */
  code?: string
  /** Where the error occurred (e.g., 'filesystem.browse', 'session.start') */
  context?: string
  /** Additional error details if available */
  details?: unknown
}

/**
 * Session configuration settings
 */
export interface SessionConfiguration {
  /** Maximum number of errors to keep in the error log (default: 50) */
  maxErrorLogSize?: number
  /** Session considered idle after this many minutes of inactivity */
  idleTimeoutMinutes?: number
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
  /** Recent error log entries */
  errorLog?: SessionError[]
  /** Total number of errors since session creation */
  errorCount?: number
  /** Timestamp of the most recent error */
  lastErrorAt?: Date
  /** Session configuration settings */
  configuration?: SessionConfiguration
  /** Timestamp of the last activity (for idle detection) */
  lastActivityAt?: Date
  /** Calculated session duration in milliseconds */
  sessionDuration?: number
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
