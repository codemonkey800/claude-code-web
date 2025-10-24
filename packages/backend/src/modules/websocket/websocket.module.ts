import { Module } from '@nestjs/common'

import { AppWebSocketGateway } from './websocket.gateway.js'

/**
 * WebSocket Module
 * Provides real-time bidirectional communication via Socket.io
 */
@Module({
  providers: [AppWebSocketGateway],
  exports: [AppWebSocketGateway],
})
export class WebSocketModule {}
