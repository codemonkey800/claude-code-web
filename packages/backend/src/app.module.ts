import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { EventEmitterModule } from '@nestjs/event-emitter'

import { AppController } from './app.controller'
import { ClaudeCodeModule } from './claude-code/claude-code.module'
import { DEFAULT_MAX_EVENT_LISTENERS, validate } from './config/env.validation'
import { FileSystemModule } from './filesystem/filesystem.module'
import { LoggingModule } from './logging/logging.module'
import { SessionModule } from './session/session.module'
import { WebSocketModule } from './websocket/websocket.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.development.local', '.env.development', '.env'],
      validate,
    }),
    EventEmitterModule.forRoot({
      // Use wildcards for event names
      wildcard: true,
      // Set this to `true` to use wildcards
      delimiter: '.',
      // Maximum number of listeners per event
      // Configurable via MAX_EVENT_LISTENERS environment variable
      maxListeners: process.env.MAX_EVENT_LISTENERS
        ? Number(process.env.MAX_EVENT_LISTENERS)
        : DEFAULT_MAX_EVENT_LISTENERS,
    }),
    FileSystemModule,
    LoggingModule,
    ClaudeCodeModule,
    SessionModule,
    WebSocketModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
