import { Module } from '@nestjs/common'

import { ClaudeCodeModule } from 'src/claude-code/claude-code.module'
import { FileSystemModule } from 'src/filesystem/filesystem.module'

import { SessionController } from './session.controller'
import { SessionService } from './session.service'

/**
 * Module for managing coding workspace sessions
 * Provides REST API endpoints and SessionService for use throughout the application
 */
@Module({
  imports: [FileSystemModule, ClaudeCodeModule],
  controllers: [SessionController],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}
