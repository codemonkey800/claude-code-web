import type {
  ClaudeCodeQueryRequest,
  ClaudeCodeQueryResult,
  ClaudeCodeQueryState,
} from '@claude-code-web/shared'

/**
 * Abstract interface for Claude Code operations
 * Allows swapping between mock and real SDK implementations
 */
export interface IClaudeCodeService {
  /**
   * Initialize Claude Code for a session
   * @param sessionId - Session ID to initialize for
   * @param workingDirectory - Absolute path to working directory
   */
  initialize(sessionId: string, workingDirectory: string): Promise<void>

  /**
   * Execute a query with streaming output
   * Emits CLAUDE_MESSAGE events via EventEmitter2 as messages arrive from SDK
   * @param request - Query execution request
   * @returns Promise that resolves with query result summary
   */
  executeQuery(request: ClaudeCodeQueryRequest): Promise<ClaudeCodeQueryResult>

  /**
   * Cancel an ongoing query
   * @param queryId - Query ID to cancel
   */
  cancelQuery(queryId: string): Promise<void>

  /**
   * Shutdown Claude Code for a session
   * @param sessionId - Session ID to shutdown
   */
  shutdown(sessionId: string): Promise<void>

  /**
   * Get current execution status for a query
   * @param queryId - Query ID to check
   * @returns Query state or null if not found
   */
  getQueryState(queryId: string): ClaudeCodeQueryState | null
}
