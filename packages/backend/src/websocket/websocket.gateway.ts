import {
  ERROR_CODES,
  type ErrorEvent,
  type MessageEvent,
  type MessageResponseEvent,
  type PingEvent,
  type PongEvent,
  type Session,
  type SessionDeletedEvent,
  type SessionJoinedEvent,
  type SessionJoinEvent,
  type SessionLeaveEvent,
  type SessionLeftEvent,
  type SessionMessageEvent,
  type SessionMessageResponseEvent,
  type SessionStatusUpdateEvent,
  WS_EVENTS,
} from '@claude-code-web/shared'
import { Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import {
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import type { Server, Socket } from 'socket.io'

import { SessionService } from 'src/session/session.service'

/**
 * WebSocket Gateway for handling real-time bidirectional communication
 * Implements session rooms for session-scoped messaging
 *
 * Note: The @WebSocketGateway decorator is evaluated at class definition time,
 * before dependency injection is available, so we cannot use ConfigService here.
 * The FRONTEND_URL is validated through the env.validation.ts schema and defaults
 * to 'http://localhost:8080' for development. The main CORS configuration in
 * main.ts uses ConfigService at runtime for the REST API.
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
  // Track which sockets are in which session rooms
  private readonly sessionRooms = new Map<string, Set<string>>()

  @WebSocketServer()
  server!: Server

  constructor(private readonly sessionService: SessionService) {}

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
   * Clean up from all session rooms
   */
  handleDisconnect(client: Socket): void {
    this.connectedClients.delete(client.id)

    const sessionsToDelete: string[] = []

    // Clean up from all session rooms
    for (const [sessionId, sockets] of this.sessionRooms.entries()) {
      if (sockets.has(client.id)) {
        sockets.delete(client.id)
        this.logger.debug(
          `Removed disconnected client ${client.id} from session ${sessionId}`,
        )

        // Mark empty session rooms for deletion
        if (sockets.size === 0) {
          sessionsToDelete.push(sessionId)
        }
      }
    }

    // Remove empty session rooms after iteration
    for (const sessionId of sessionsToDelete) {
      this.sessionRooms.delete(sessionId)
      this.logger.debug(`Removed empty session room: ${sessionId}`)
    }

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
   * Handle message events from clients (deprecated - use handleSessionMessage)
   * Echoes the message back with echo flag set to true
   * @deprecated Use handleSessionMessage for session-scoped messaging
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

  /**
   * Handle session join requests
   * Validates session exists and adds client to session room
   */
  @SubscribeMessage(WS_EVENTS.SESSION_JOIN)
  handleJoinSession(client: Socket, data: SessionJoinEvent): void {
    const { sessionId } = data.payload

    this.logger.log(
      `Client ${client.id} attempting to join session: ${sessionId}`,
    )

    // Validate session exists
    const session = this.sessionService.getSession(sessionId)
    if (!session) {
      this.logger.warn(
        `Client ${client.id} attempted to join non-existent session: ${sessionId}`,
      )

      const errorEvent: ErrorEvent = {
        type: WS_EVENTS.ERROR,
        timestamp: new Date().toISOString(),
        id: data.id,
        payload: {
          code: ERROR_CODES.SESSION_NOT_FOUND,
          message: `Session not found: ${sessionId}`,
        },
      }

      client.emit(WS_EVENTS.ERROR, errorEvent)
      return
    }

    // Add client to Socket.io room
    void client.join(sessionId)

    // Track in our session rooms map
    let sessionSockets = this.sessionRooms.get(sessionId)
    if (!sessionSockets) {
      sessionSockets = new Set()
      this.sessionRooms.set(sessionId, sessionSockets)
    }
    sessionSockets.add(client.id)

    this.logger.log(
      `Client ${client.id} joined session ${sessionId} (${sessionSockets.size} clients in room)`,
    )

    // Send confirmation to client
    const joinedEvent: SessionJoinedEvent = {
      type: WS_EVENTS.SESSION_JOINED,
      timestamp: new Date().toISOString(),
      id: data.id,
      payload: {
        sessionId,
        session,
      },
    }

    client.emit(WS_EVENTS.SESSION_JOINED, joinedEvent)
  }

  /**
   * Handle session leave requests
   * Removes client from session room
   */
  @SubscribeMessage(WS_EVENTS.SESSION_LEAVE)
  handleLeaveSession(client: Socket, data: SessionLeaveEvent): void {
    const { sessionId } = data.payload

    this.logger.log(`Client ${client.id} leaving session: ${sessionId}`)

    // Remove from Socket.io room
    void client.leave(sessionId)

    // Remove from tracking map
    const sockets = this.sessionRooms.get(sessionId)
    if (sockets) {
      sockets.delete(client.id)

      // Clean up empty rooms
      if (sockets.size === 0) {
        this.sessionRooms.delete(sessionId)
        this.logger.debug(`Removed empty session room: ${sessionId}`)
      }
    }

    // Send confirmation
    const leftEvent: SessionLeftEvent = {
      type: WS_EVENTS.SESSION_LEFT,
      timestamp: new Date().toISOString(),
      id: data.id,
      payload: {
        sessionId,
      },
    }

    client.emit(WS_EVENTS.SESSION_LEFT, leftEvent)
  }

  /**
   * Handle session-scoped messages
   * Broadcasts message to all clients in the session room
   */
  @SubscribeMessage(WS_EVENTS.SESSION_MESSAGE)
  handleSessionMessage(client: Socket, data: SessionMessageEvent): void {
    const { sessionId, content } = data.payload

    this.logger.debug(
      `Received session message from client ${client.id} for session ${sessionId}`,
    )

    // Validate client is in the session room
    const sockets = this.sessionRooms.get(sessionId)
    if (!sockets || !sockets.has(client.id)) {
      this.logger.warn(
        `Client ${client.id} attempted to send message to session ${sessionId} without joining`,
      )

      const errorEvent: ErrorEvent = {
        type: WS_EVENTS.ERROR,
        timestamp: new Date().toISOString(),
        id: data.id,
        payload: {
          code: ERROR_CODES.INVALID_REQUEST,
          message: `You must join session ${sessionId} before sending messages`,
        },
      }

      client.emit(WS_EVENTS.ERROR, errorEvent)
      return
    }

    // Validate session still exists
    const session = this.sessionService.getSession(sessionId)
    if (!session) {
      this.logger.warn(
        `Client ${client.id} attempted to send message to deleted session ${sessionId}`,
      )

      // Force client to leave the room
      void client.leave(sessionId)
      sockets.delete(client.id)
      if (sockets.size === 0) {
        this.sessionRooms.delete(sessionId)
      }

      const errorEvent: ErrorEvent = {
        type: WS_EVENTS.ERROR,
        timestamp: new Date().toISOString(),
        id: data.id,
        payload: {
          code: ERROR_CODES.SESSION_NOT_FOUND,
          message: `Session no longer exists: ${sessionId}`,
        },
      }

      client.emit(WS_EVENTS.ERROR, errorEvent)
      return
    }

    // Broadcast to all clients in the session room
    const messageResponse: SessionMessageResponseEvent = {
      type: WS_EVENTS.SESSION_MESSAGE,
      timestamp: new Date().toISOString(),
      id: data.id,
      payload: {
        sessionId,
        content,
        senderId: client.id,
      },
    }

    this.server.to(sessionId).emit(WS_EVENTS.SESSION_MESSAGE, messageResponse)
    this.logger.debug(
      `Broadcast message to ${sockets.size} clients in session ${sessionId}`,
    )
  }

  /**
   * Handle session deletion events from REST API
   * Broadcasts deletion notice and disconnects all clients from the session
   */
  @OnEvent('session.deleted')
  handleSessionDeleted(payload: { sessionId: string; reason?: string }): void {
    const { sessionId, reason } = payload

    this.logger.log(
      `Session ${sessionId} deleted, notifying clients: ${reason || 'No reason provided'}`,
    )

    const sockets = this.sessionRooms.get(sessionId)
    if (!sockets || sockets.size === 0) {
      this.logger.debug(`No clients in deleted session ${sessionId}`)
      return
    }

    // Broadcast deletion event to all clients in room
    const deletedEvent: SessionDeletedEvent = {
      type: WS_EVENTS.SESSION_DELETED,
      timestamp: new Date().toISOString(),
      payload: {
        sessionId,
        reason,
      },
    }

    this.server.to(sessionId).emit(WS_EVENTS.SESSION_DELETED, deletedEvent)

    // Remove all clients from the room
    for (const socketId of sockets) {
      const socket = this.connectedClients.get(socketId)
      if (socket) {
        void socket.leave(sessionId)
      }
    }

    // Clean up tracking
    this.sessionRooms.delete(sessionId)
    this.logger.log(
      `Removed ${sockets.size} clients from deleted session ${sessionId}`,
    )
  }

  /**
   * Handle session status update events from REST API
   * Broadcasts status change to all clients in the session
   */
  @OnEvent('session.updated')
  handleSessionUpdated(payload: { sessionId: string; session: Session }): void {
    const { sessionId, session } = payload

    this.logger.debug(`Session ${sessionId} updated, notifying clients`)

    const sockets = this.sessionRooms.get(sessionId)
    if (!sockets || sockets.size === 0) {
      this.logger.debug(`No clients in updated session ${sessionId}`)
      return
    }

    // Broadcast status update to all clients in room
    const statusUpdateEvent: SessionStatusUpdateEvent = {
      type: WS_EVENTS.SESSION_STATUS,
      timestamp: new Date().toISOString(),
      payload: {
        sessionId,
        session,
      },
    }

    this.server.to(sessionId).emit(WS_EVENTS.SESSION_STATUS, statusUpdateEvent)
    this.logger.debug(
      `Broadcast status update to ${sockets.size} clients in session ${sessionId}`,
    )
  }
}
