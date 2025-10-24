import { Module } from '@nestjs/common'

import { SessionService } from './session.service.js'

/**
 * Module for managing coding workspace sessions
 * Provides SessionService for use throughout the application
 */
@Module({
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}
