import { Module } from '@nestjs/common'

import { WebSocketModule } from './modules/websocket/websocket.module.js'

@Module({
  imports: [WebSocketModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
