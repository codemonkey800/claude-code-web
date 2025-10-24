/**
 * WebSocket event type definitions
 * Defines strongly-typed events for bidirectional client-server communication
 */

import type { ErrorCode } from 'src/constants/events'

import type { CreateSessionPayload, Session } from './session'

/**
 * Base structure for all WebSocket events
 * All events must include type and timestamp
 */
export interface BaseEvent {
  /** Event type identifier (discriminator for type narrowing) */
  type: string
  /** ISO 8601 timestamp when the event was created */
  timestamp: string
  /** Optional correlation ID for tracking request-response pairs */
  id?: string
}

// ============================================================================
// Client to Server Events
// ============================================================================

/**
 * Ping event sent by client to test connection health
 * Server should respond with PongEvent
 */
export interface PingEvent extends BaseEvent {
  type: 'ping'
}

/**
 * Generic message event for testing echo functionality
 * Server should echo the message back to the client
 */
export interface MessageEvent extends BaseEvent {
  type: 'message'
  payload: {
    /** Message content to be echoed */
    content: string
  }
}

/**
 * Request to create a new session
 * Server responds with SessionCreatedEvent on success or ErrorEvent on failure
 */
export interface SessionCreateEvent extends BaseEvent {
  type: 'session:create'
  payload: CreateSessionPayload
}

/**
 * Union type of all possible client-to-server events
 * Use discriminated union pattern for type-safe event handling
 */
export type ClientToServerEvent = PingEvent | MessageEvent | SessionCreateEvent

// ============================================================================
// Server to Client Events
// ============================================================================

/**
 * Pong response to client's ping event
 * Confirms connection is alive and responsive
 */
export interface PongEvent extends BaseEvent {
  type: 'pong'
}

/**
 * Echo response containing the original message
 * Sent in response to MessageEvent
 */
export interface MessageResponseEvent extends BaseEvent {
  type: 'message'
  payload: {
    /** The echoed message content */
    content: string
    /** Flag indicating this is an echo response */
    echo: boolean
  }
}

/**
 * Successful session creation response
 * Contains the newly created session object
 */
export interface SessionCreatedEvent extends BaseEvent {
  type: 'session:created'
  payload: {
    /** The newly created session */
    session: Session
  }
}

/**
 * Error event for communicating failures to client
 * Contains error code, message, and optional details
 */
export interface ErrorEvent extends BaseEvent {
  type: 'error'
  payload: {
    /** Standard error code for categorization */
    code: ErrorCode
    /** Human-readable error message */
    message: string
    /** Optional additional error details (stack trace, context, etc.) */
    details?: unknown
  }
}

/**
 * Union type of all possible server-to-client events
 * Use discriminated union pattern for type-safe event handling
 */
export type ServerToClientEvent =
  | PongEvent
  | MessageResponseEvent
  | SessionCreatedEvent
  | ErrorEvent
