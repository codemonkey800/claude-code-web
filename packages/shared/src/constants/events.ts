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
  /** Generic message event for testing echo functionality */
  MESSAGE: 'message',
  /** Request to create a new session */
  SESSION_CREATE: 'session:create',

  // Server to Client events
  /** Pong response to ping event */
  PONG: 'pong',
  /** Notification that a session was successfully created */
  SESSION_CREATED: 'session:created',
  /** Error event for handling failures */
  ERROR: 'error',
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
