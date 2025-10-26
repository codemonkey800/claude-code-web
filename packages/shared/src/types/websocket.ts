/**
 * WebSocket event type definitions
 * Defines strongly-typed events for bidirectional client-server communication
 */

import type { ErrorCode } from 'src/constants/events'

import type { Session } from './session'

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
 * Generic message event for testing echo functionality (deprecated - use SessionMessageEvent)
 * Server should echo the message back to the client
 * @deprecated Use SessionMessageEvent for session-scoped messaging
 */
export interface MessageEvent extends BaseEvent {
  type: 'message'
  payload: {
    /** Message content to be echoed */
    content: string
  }
}

/**
 * Request to join a session room
 * Client must join a session before sending session-scoped messages
 */
export interface SessionJoinEvent extends BaseEvent {
  type: 'session:join'
  payload: {
    /** ID of the session to join */
    sessionId: string
  }
}

/**
 * Request to leave a session room
 * Client will no longer receive messages from this session
 */
export interface SessionLeaveEvent extends BaseEvent {
  type: 'session:leave'
  payload: {
    /** ID of the session to leave */
    sessionId: string
  }
}

/**
 * Session-scoped message event
 * Sends a message within the context of a specific session
 */
export interface SessionMessageEvent extends BaseEvent {
  type: 'session:message'
  payload: {
    /** ID of the session this message belongs to */
    sessionId: string
    /** Message content */
    content: string
  }
}

/**
 * Union type of all possible client-to-server events
 * Use discriminated union pattern for type-safe event handling
 */
export type ClientToServerEvent =
  | PingEvent
  | MessageEvent
  | SessionJoinEvent
  | SessionLeaveEvent
  | SessionMessageEvent

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
 * Echo response containing the original message (deprecated - use SessionMessageResponseEvent)
 * Sent in response to MessageEvent
 * @deprecated Use SessionMessageResponseEvent for session-scoped messaging
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
 * Confirmation that client successfully joined a session
 * Sent in response to SessionJoinEvent
 */
export interface SessionJoinedEvent extends BaseEvent {
  type: 'session:joined'
  payload: {
    /** ID of the session that was joined */
    sessionId: string
    /** The full session object */
    session: Session
  }
}

/**
 * Confirmation that client left a session
 * Sent in response to SessionLeaveEvent
 */
export interface SessionLeftEvent extends BaseEvent {
  type: 'session:left'
  payload: {
    /** ID of the session that was left */
    sessionId: string
  }
}

/**
 * Session-scoped message response
 * Broadcast to all clients in the session room
 */
export interface SessionMessageResponseEvent extends BaseEvent {
  type: 'session:message'
  payload: {
    /** ID of the session this message belongs to */
    sessionId: string
    /** Message content */
    content: string
    /** ID of the client who sent the message */
    senderId: string
  }
}

/**
 * Notification that a session was deleted
 * Broadcast to all clients in the session room before disconnecting them
 */
export interface SessionDeletedEvent extends BaseEvent {
  type: 'session:deleted'
  payload: {
    /** ID of the session that was deleted */
    sessionId: string
    /** Reason for deletion (optional) */
    reason?: string
  }
}

/**
 * Notification that a session's status was updated
 * Broadcast to all clients in the session room
 */
export interface SessionStatusUpdateEvent extends BaseEvent {
  type: 'session:status'
  payload: {
    /** ID of the session that was updated */
    sessionId: string
    /** The full updated session object */
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
  | SessionJoinedEvent
  | SessionLeftEvent
  | SessionMessageResponseEvent
  | SessionDeletedEvent
  | SessionStatusUpdateEvent
  | ErrorEvent
