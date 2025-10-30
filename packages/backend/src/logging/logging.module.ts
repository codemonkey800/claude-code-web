import { Module } from '@nestjs/common'

import { ConversationLoggerService } from './conversation-logger.service'

/**
 * Logging module for conversation and session logging
 * Provides JSONL logging of Claude Code conversations
 */
@Module({
  providers: [ConversationLoggerService],
  exports: [ConversationLoggerService],
})
export class LoggingModule {}
