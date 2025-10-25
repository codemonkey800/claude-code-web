import {
  type MessageEvent,
  type MessageResponseEvent,
  type PingEvent,
  type PongEvent,
  WS_EVENTS,
} from '@claude-code-web/shared'
import { Logger } from '@nestjs/common'
import {
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import type { Server, Socket } from 'socket.io'

/**
 * WebSocket Gateway for handling real-time bidirectional communication
 * Currently implements ping/pong for connection health testing
 */
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:8080',
    credentials: true,
  },
})
export class AppWebSocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(AppWebSocketGateway.name)
  private readonly connectedClients = new Map<string, Socket>()

  @WebSocketServer()
  server!: Server

  /**
   * Handle new client connections
   */
  handleConnection(client: Socket): void {
    this.connectedClients.set(client.id, client)
    this.logger.log(
      `Client connected: ${client.id} (Total: ${this.connectedClients.size})`,
    )
  }

  /**
   * Handle client disconnections
   */
  handleDisconnect(client: Socket): void {
    this.connectedClients.delete(client.id)
    this.logger.log(
      `Client disconnected: ${client.id} (Total: ${this.connectedClients.size})`,
    )
  }

  /**
   * Handle ping events from clients
   * Responds with pong event preserving correlation id
   */
  @SubscribeMessage(WS_EVENTS.PING)
  handlePing(client: Socket, data: PingEvent): void {
    this.logger.debug(`Received ping from client: ${client.id}`)

    const pongEvent: PongEvent = {
      type: WS_EVENTS.PONG,
      timestamp: new Date().toISOString(),
      id: data.id,
    }

    client.emit(WS_EVENTS.PONG, pongEvent)
    this.logger.debug(`Sent pong to client: ${client.id}`)
  }

  /**
   * Handle message events from clients
   * Echoes the message back with echo flag set to true
   */
  @SubscribeMessage(WS_EVENTS.MESSAGE)
  handleMessage(client: Socket, data: MessageEvent): void {
    this.logger.debug(`Received message from client: ${client.id}`)

    const response: MessageResponseEvent = {
      type: WS_EVENTS.MESSAGE,
      timestamp: new Date().toISOString(),
      id: data.id,
      payload: {
        content: data.payload.content,
        echo: true,
      },
    }

    client.emit(WS_EVENTS.MESSAGE, response)
    this.logger.debug(`Sent echo response to client: ${client.id}`)
  }
}
