import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { validate } from './config/env.validation.js'
import { SessionModule } from './modules/session/session.module.js'
import { WebSocketModule } from './modules/websocket/websocket.module.js'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.development.local', '.env.development', '.env'],
      validate,
    }),
    SessionModule,
    WebSocketModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
