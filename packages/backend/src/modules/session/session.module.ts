import { Module } from '@nestjs/common'

import { SessionController } from './session.controller'
import { SessionService } from './session.service'

/**
 * Module for managing coding workspace sessions
 * Provides REST API endpoints and SessionService for use throughout the application
 */
@Module({
  controllers: [SessionController],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}
