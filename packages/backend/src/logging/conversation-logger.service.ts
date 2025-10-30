import { appendFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { INTERNAL_EVENTS } from '@claude-code-web/shared'
import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { OnEvent } from '@nestjs/event-emitter'

/**
 * JSONL log entry structure for conversation messages
 */
interface ConversationLogEntry {
  /** ISO timestamp when the message was logged */
  timestamp: string
  /** Session ID this message belongs to */
  sessionId: string
  /** Query ID this message belongs to */
  queryId: string
  /** Message type (from Claude CLI: system, assistant, user, result, etc.) */
  messageType: string
  /** Full message payload from Claude CLI */
  message: unknown
}

/**
 * Service for logging conversation messages to JSONL files
 * Each session gets its own log file for easy debugging and analysis
 */
@Injectable()
export class ConversationLoggerService implements OnModuleInit {
  private readonly logger = new Logger(ConversationLoggerService.name)
  private readonly logsDirectory: string

  constructor(private readonly configService: ConfigService) {
    // Get logs directory from config or use default
    const baseDir = this.configService.get<string>('LOGS_DIR') || 'logs'
    this.logsDirectory = join(process.cwd(), baseDir, 'sessions')
  }

  /**
   * Ensure logs directory exists on module initialization
   */
  async onModuleInit(): Promise<void> {
    try {
      await mkdir(this.logsDirectory, { recursive: true })
      this.logger.log(`Logs directory created/verified: ${this.logsDirectory}`)
    } catch (error) {
      this.logger.error(
        `Failed to create logs directory: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Listen for Claude messages and log them to JSONL
   * Event payload: { sessionId, queryId, message }
   */
  @OnEvent(INTERNAL_EVENTS.CLAUDE_MESSAGE)
  async handleClaudeMessage(payload: {
    sessionId: string
    queryId: string
    message: unknown
  }): Promise<void> {
    const { sessionId, queryId, message } = payload

    // Extract message type from message object
    const messageType =
      typeof message === 'object' && message !== null && 'type' in message
        ? String(message.type)
        : 'unknown'

    // Build log entry
    const logEntry: ConversationLogEntry = {
      timestamp: new Date().toISOString(),
      sessionId,
      queryId,
      messageType,
      message,
    }

    // Write to JSONL file (one line per message)
    const logFilePath = join(this.logsDirectory, `${sessionId}.jsonl`)
    const logLine = JSON.stringify(logEntry) + '\n'

    try {
      await appendFile(logFilePath, logLine, 'utf-8')
      this.logger.debug(
        `Logged ${messageType} message for session ${sessionId} (query ${queryId})`,
      )
    } catch (error) {
      this.logger.error(
        `Failed to write log for session ${sessionId}: ${error instanceof Error ? error.message : String(error)}`,
      )

      // Try to create parent directory if it doesn't exist
      try {
        await mkdir(dirname(logFilePath), { recursive: true })
        await appendFile(logFilePath, logLine, 'utf-8')
        this.logger.debug(
          `Successfully logged after creating directory for session ${sessionId}`,
        )
      } catch (retryError) {
        this.logger.error(
          `Failed to log even after retry for session ${sessionId}: ${retryError instanceof Error ? retryError.message : String(retryError)}`,
        )
      }
    }
  }

  /**
   * Get the log file path for a session
   * @param sessionId - Session ID to get log path for
   * @returns Absolute path to the log file
   */
  getLogFilePath(sessionId: string): string {
    return join(this.logsDirectory, `${sessionId}.jsonl`)
  }
}
