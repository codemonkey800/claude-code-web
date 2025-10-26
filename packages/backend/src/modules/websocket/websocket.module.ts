import { Module } from '@nestjs/common'

import { SessionModule } from '../session/session.module'
import { AppWebSocketGateway } from './websocket.gateway'

/**
 * WebSocket Module
 * Provides real-time bidirectional communication via Socket.io
 * Imports SessionModule to access SessionService for validation
 */
@Module({
  imports: [SessionModule],
  providers: [AppWebSocketGateway],
  exports: [AppWebSocketGateway],
})
export class WebSocketModule {}
