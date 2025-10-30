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

/**
 * Claude CLI Message Types
 * These types match the actual message structure from the Claude CLI subprocess output
 */

/** Text content in assistant messages */
export interface ClaudeTextContent {
  type: 'text'
  text: string
}

/** Tool use content in assistant messages */
export interface ClaudeToolUse {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}

/** Tool result content in user messages */
export interface ClaudeToolResult {
  type: 'tool_result'
  tool_use_id: string
  content: string
  is_error?: boolean
}

/** Token usage metrics */
export interface ClaudeUsageMetrics {
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens?: number
  cache_read_input_tokens?: number
  cache_creation?: {
    ephemeral_5m_input_tokens?: number
    ephemeral_1h_input_tokens?: number
  }
  service_tier?: string
}

/** MCP server status */
export interface ClaudeMCPServer {
  name: string
  status: 'connected' | 'failed' | 'disconnected'
}

/**
 * System initialization message from Claude CLI
 * Sent at the start of each query with session configuration
 */
export interface ClaudeSystemMessage {
  type: 'system'
  subtype: 'init' | 'completion'
  cwd?: string
  session_id?: string
  tools?: string[]
  mcp_servers?: ClaudeMCPServer[]
  model?: string
  permissionMode?: string
  slash_commands?: string[]
  apiKeySource?: string
  claude_code_version?: string
  output_style?: string
  agents?: string[]
  skills?: string[]
  plugins?: string[]
  uuid?: string
}

/**
 * Assistant message from Claude
 * Contains Claude's responses (text or tool calls)
 */
export interface ClaudeAssistantMessage {
  type: 'assistant'
  message: {
    model: string
    id: string
    type: 'message'
    role: 'assistant'
    content: Array<ClaudeTextContent | ClaudeToolUse>
    stop_reason: string | null
    stop_sequence: string | null
    usage: ClaudeUsageMetrics
  }
  parent_tool_use_id?: string | null
  session_id?: string
  uuid?: string
}

/**
 * User message containing tool results
 * Sent back to Claude after tool execution
 */
export interface ClaudeUserMessage {
  type: 'user'
  message: {
    role: 'user'
    content: Array<ClaudeToolResult>
  }
  parent_tool_use_id?: string
  session_id?: string
  uuid?: string
}

/**
 * User prompt message
 * Represents the user's original text prompt (not tool results)
 * Used for displaying user messages in the chat UI
 */
export interface ClaudeUserPromptMessage {
  type: 'user_prompt'
  message: {
    role: 'user'
    content: string
  }
  timestamp: string
  session_id?: string
  uuid?: string
}

/**
 * Query result message
 * Sent at the end of query execution with summary statistics
 */
export interface ClaudeResultMessage {
  type: 'result'
  subtype: 'success' | 'error'
  is_error: boolean
  duration_ms: number
  duration_api_ms: number
  num_turns: number
  result: unknown
  session_id?: string
  total_cost_usd?: number
  usage?: ClaudeUsageMetrics & {
    server_tool_use?: {
      web_search_requests: number
    }
  }
  modelUsage?: Record<string, unknown>
  permission_denials?: unknown[]
  uuid?: string
}

/**
 * Discriminated union of all Claude CLI message types
 * Use the `type` field to narrow to specific message type
 */
export type ClaudeMessage =
  | ClaudeSystemMessage
  | ClaudeAssistantMessage
  | ClaudeUserMessage
  | ClaudeUserPromptMessage
  | ClaudeResultMessage
