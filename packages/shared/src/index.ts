/**
 * Barrel export file for @claude-code-web/shared
 * Public API for shared types, constants, and utilities
 */

// ============================================================================
// Type Exports
// ============================================================================

// Session types - SessionStatus, Session, SessionMetadata, CreateSessionPayload
export * from './types/session'

// File system types - FileSystemNodeType, DirectoryEntry, FileEntry, FileSystemNode, etc.
export * from './types/filesystem'

// Claude Code types - ClaudeCodeQueryRequest, ClaudeCodeQueryState, ClaudeCodeQueryResult
export * from './types/claude-code'

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

// Utility functions
export * from './utils/sleep'

// ============================================================================
// Contract Exports
// ============================================================================

// REST API contracts using ts-rest
export * from './contracts/filesystem.contract'
export * from './contracts/sessions.contract'
