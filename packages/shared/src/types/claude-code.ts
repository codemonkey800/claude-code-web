/**
 * Claude Code integration types for Claude Code Web
 *
 * This file contains types for Claude Code subprocess integration.
 * Messages are received from the global `claude` CLI subprocess via stdout.
 */

/**
 * Request to execute a Claude Code query
 */
export interface ClaudeCodeQueryRequest {
  /** Session ID to associate this query with */
  sessionId: string
  /** User prompt to send to Claude */
  prompt: string
  /** Working directory for Claude Code to operate in */
  workingDirectory: string
  /** Permission mode for tool usage */
  permissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan'
  /** Claude model to use (defaults to claude-sonnet-4-5) */
  model?: string
  /** Optional abort signal for cancellation */
  abortSignal?: AbortSignal
}

/**
 * Query execution state tracking (SDK doesn't provide this)
 */
export interface ClaudeCodeQueryState {
  /** Our internal query ID */
  queryId: string
  /** Session ID this query belongs to */
  sessionId: string
  /** Current execution status */
  status: 'initializing' | 'running' | 'completed' | 'error' | 'cancelled'
  /** When the query was started */
  startedAt: Date
  /** Last time we received a message from Claude */
  lastActivityAt: Date
  /** When the query completed (success or error) */
  completedAt?: Date
  /** Error message if query failed */
  error?: string
  /** CLI's internal session_id from system init message */
  sdkSessionId?: string
}

/**
 * Query execution result summary
 */
export interface ClaudeCodeQueryResult {
  /** Our internal query ID */
  queryId: string
  /** Session ID this query belongs to */
  sessionId: string
  /** Execution outcome */
  status: 'success' | 'error'
  /** Total execution time in milliseconds */
  duration: number
  /** CLI's internal session_id (if captured) */
  sdkSessionId?: string
  /** Error message if execution failed */
  error?: string
}

/**
 * Payload for sending a query via REST API
 */
export interface SendQueryPayload {
  /** User prompt to send to Claude */
  prompt: string
  /** Optional Claude model to use (defaults to claude-sonnet-4-5) */
  model?: string
}

/**
 * Response from sending a query via REST API
 * The query executes asynchronously with streaming results via WebSocket
 */
export interface SendQueryResponse {
  /** Query ID for tracking this execution */
  queryId: string
  /** Session ID this query belongs to */
  sessionId: string
}

/**
 * Payload for starting a session with optional initial query
 */
export interface StartSessionPayload {
  /** Optional initial prompt to send after starting */
  prompt?: string
  /** Optional Claude model to use (defaults to claude-sonnet-4-5) */
  model?: string
}
