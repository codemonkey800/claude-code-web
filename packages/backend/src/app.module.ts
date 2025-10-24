import { Module } from '@nestjs/common'

import { SessionModule } from './modules/session/session.module.js'
import { WebSocketModule } from './modules/websocket/websocket.module.js'

@Module({
  imports: [SessionModule, WebSocketModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
