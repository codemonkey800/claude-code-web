/**
 * Barrel export file for @claude-code-web/shared
 * Public API for shared types, constants, and utilities
 */

// ============================================================================
// Type Exports
// ============================================================================

// Session types - SessionStatus, Session, SessionMetadata, CreateSessionPayload
export * from './types/session'

// WebSocket event types - ClientToServerEvent, ServerToClientEvent, and all specific events
export * from './types/websocket'

// ============================================================================
// Constants Exports
// ============================================================================

// Event names, error codes, and configuration constants
export * from './constants/events'

// ============================================================================
// Validation Exports
// ============================================================================

// Zod schemas and validation helper functions
export * from './utils/validation'

// Error handling utilities
export * from './utils/error'

// ============================================================================
// Contract Exports
// ============================================================================

// REST API contracts using ts-rest
export * from './contracts/sessions.contract'
