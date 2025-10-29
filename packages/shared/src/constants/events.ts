/**
 * WebSocket event constants and configuration
 * Defines all event names, error codes, and system configuration
 */

/**
 * WebSocket event names for client-server communication
 * Using const assertion for type safety and autocomplete
 */
export const WS_EVENTS = {
  // Client to Server events
  /** Ping event to test connection health */
  PING: 'ping',
  /** Generic message event for testing echo functionality (deprecated) */
  MESSAGE: 'message',
  /** Request to join a session room */
  SESSION_JOIN: 'session:join',
  /** Request to leave a session room */
  SESSION_LEAVE: 'session:leave',
  /** Session-scoped message event */
  SESSION_MESSAGE: 'session:message',

  // Server to Client events
  /** Pong response to ping event */
  PONG: 'pong',
  /** Confirmation that client joined a session */
  SESSION_JOINED: 'session:joined',
  /** Confirmation that client left a session */
  SESSION_LEFT: 'session:left',
  /** Notification that a session was deleted */
  SESSION_DELETED: 'session:deleted',
  /** Notification that a session status was updated */
  SESSION_STATUS: 'session:status',
  /** Error event for handling failures */
  ERROR: 'error',

  // Claude Code WebSocket events (server to client)
  /** Claude Code message stream (contains SDK message) */
  CLAUDE_MESSAGE: 'claude:message',
  /** Claude Code query result (completion summary) */
  CLAUDE_QUERY_RESULT: 'claude:query-result',
} as const

/**
 * Type-safe union of all possible WebSocket event types
 */
export type WsEventType = (typeof WS_EVENTS)[keyof typeof WS_EVENTS]

/**
 * Standard error codes for consistent error handling
 */
export const ERROR_CODES = {
  /** Generic internal server error */
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  /** Request failed validation */
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  /** Requested session does not exist */
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  /** Request format or content is invalid */
  INVALID_REQUEST: 'INVALID_REQUEST',
  /** Client is not authorized to perform this action */
  UNAUTHORIZED: 'UNAUTHORIZED',
} as const

/**
 * Type-safe union of all possible error codes
 */
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]

/**
 * Internal backend EventEmitter2 event names
 * Used for server-side event communication between modules
 */
export const INTERNAL_EVENTS = {
  /** Emitted when a session is updated via REST API */
  SESSION_UPDATED: 'session.updated',
  /** Emitted when a session is deleted */
  SESSION_DELETED: 'session.deleted',
  /** Emitted when a session status transitions to a new state */
  SESSION_STATUS_CHANGED: 'session.status.changed',

  // Claude Code lifecycle events
  /** Emitted when a Claude Code query starts */
  CLAUDE_QUERY_STARTED: 'claude.query.started',
  /** Emitted when a Claude Code query completes successfully */
  CLAUDE_QUERY_COMPLETED: 'claude.query.completed',
  /** Emitted when a Claude Code query encounters an error */
  CLAUDE_QUERY_ERROR: 'claude.query.error',

  // Claude Code streaming events
  /** Emitted for every message from the Claude Agent SDK (generic event) */
  CLAUDE_MESSAGE: 'claude.message',
} as const

/**
 * Type-safe union of all possible internal event types
 */
export type InternalEventType =
  (typeof INTERNAL_EVENTS)[keyof typeof INTERNAL_EVENTS]

/**
 * System-wide configuration constants
 * All time values are in milliseconds
 */
export const CONFIG = {
  /** Delay before attempting WebSocket reconnection (3 seconds) */
  WS_RECONNECT_DELAY: 3000,
  /** Interval between ping messages to keep connection alive (30 seconds) */
  WS_PING_INTERVAL: 30000,
  /** Time before an idle session expires (1 hour) */
  SESSION_TIMEOUT: 3600000,
} as const
