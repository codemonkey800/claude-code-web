import {
  type ClaudeCodeQueryResult,
  ERROR_CODES,
  type ErrorEvent,
  INTERNAL_EVENTS,
  type PingEvent,
  type PongEvent,
  safeValidateClientEvent,
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
 */
@WebSocketGateway({
  cors: {
    origin: '*',
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
   * Clean up from all session rooms using Socket.io's built-in room tracking
   */
  handleDisconnect(client: Socket): void {
    this.connectedClients.delete(client.id)

    // Get all rooms this socket is in (Socket.io tracks this automatically)
    // Filter out the socket's own ID (Socket.io adds socket ID as a room)
    const rooms = Array.from(client.rooms).filter(room => room !== client.id)

    // Clean up from all session rooms
    for (const sessionId of rooms) {
      const sockets = this.sessionRooms.get(sessionId)
      if (sockets) {
        sockets.delete(client.id)
        this.logger.debug(
          `Removed disconnected client ${client.id} from session ${sessionId}`,
        )

        // Remove empty session rooms
        if (sockets.size === 0) {
          this.sessionRooms.delete(sessionId)
          this.logger.debug(`Removed empty session room: ${sessionId}`)
        }
      }
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
  handlePing(client: Socket, data: unknown): void {
    // Validate incoming event
    const validation = safeValidateClientEvent(data)

    if (!validation.success) {
      this.logger.warn(`Invalid ping event from ${client.id}`)
      const errorEvent: ErrorEvent = {
        type: WS_EVENTS.ERROR,
        timestamp: new Date().toISOString(),
        payload: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid event format',
          details: validation.error.errors,
        },
      }
      client.emit(WS_EVENTS.ERROR, errorEvent)
      return
    }

    if (validation.data.type !== WS_EVENTS.PING) {
      return // Wrong event type
    }

    const pingEvent = validation.data as PingEvent
    this.logger.debug(`Received ping from client: ${client.id}`)

    const pongEvent: PongEvent = {
      type: WS_EVENTS.PONG,
      timestamp: new Date().toISOString(),
      id: pingEvent.id,
    }

    client.emit(WS_EVENTS.PONG, pongEvent)
    this.logger.debug(`Sent pong to client: ${client.id}`)
  }

  /**
   * Handle session join requests
   * Validates session exists and adds client to session room
   */
  @SubscribeMessage(WS_EVENTS.SESSION_JOIN)
  handleJoinSession(client: Socket, data: unknown): void {
    // Validate incoming event
    const validation = safeValidateClientEvent(data)

    if (!validation.success) {
      this.logger.warn(`Invalid session join event from ${client.id}`)
      const errorEvent: ErrorEvent = {
        type: WS_EVENTS.ERROR,
        timestamp: new Date().toISOString(),
        payload: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid event format',
          details: validation.error.errors,
        },
      }
      client.emit(WS_EVENTS.ERROR, errorEvent)
      return
    }

    if (validation.data.type !== WS_EVENTS.SESSION_JOIN) {
      return // Wrong event type
    }

    const joinEvent = validation.data as SessionJoinEvent
    const { sessionId } = joinEvent.payload

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
        id: joinEvent.id,
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

    // Send confirmation to client with session data
    const joinedEvent: SessionJoinedEvent = {
      type: WS_EVENTS.SESSION_JOINED,
      timestamp: new Date().toISOString(),
      id: joinEvent.id,
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
  handleLeaveSession(client: Socket, data: unknown): void {
    // Validate incoming event
    const validation = safeValidateClientEvent(data)

    if (!validation.success) {
      this.logger.warn(`Invalid session leave event from ${client.id}`)
      const errorEvent: ErrorEvent = {
        type: WS_EVENTS.ERROR,
        timestamp: new Date().toISOString(),
        payload: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid event format',
          details: validation.error.errors,
        },
      }
      client.emit(WS_EVENTS.ERROR, errorEvent)
      return
    }

    if (validation.data.type !== WS_EVENTS.SESSION_LEAVE) {
      return // Wrong event type
    }

    const leaveEvent = validation.data as SessionLeaveEvent
    const { sessionId } = leaveEvent.payload

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
      id: leaveEvent.id,
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
  handleSessionMessage(client: Socket, data: unknown): void {
    // Validate incoming event
    const validation = safeValidateClientEvent(data)

    if (!validation.success) {
      this.logger.warn(`Invalid session message event from ${client.id}`)
      const errorEvent: ErrorEvent = {
        type: WS_EVENTS.ERROR,
        timestamp: new Date().toISOString(),
        payload: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid event format',
          details: validation.error.errors,
        },
      }
      client.emit(WS_EVENTS.ERROR, errorEvent)
      return
    }

    if (validation.data.type !== WS_EVENTS.SESSION_MESSAGE) {
      return // Wrong event type
    }

    const messageEvent = validation.data as SessionMessageEvent
    const { sessionId, content } = messageEvent.payload

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
        id: messageEvent.id,
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
        id: messageEvent.id,
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
      id: messageEvent.id,
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
  @OnEvent(INTERNAL_EVENTS.SESSION_DELETED)
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
   * Handle session status change events from SessionService
   * Broadcasts status transition to all clients in the session
   */
  @OnEvent(INTERNAL_EVENTS.SESSION_STATUS_CHANGED)
  handleSessionStatusChanged(payload: {
    sessionId: string
    oldStatus: string
    newStatus: string
    session: Session
  }): void {
    const { sessionId, oldStatus, newStatus, session } = payload

    this.logger.log(
      `Session ${sessionId} status changed: ${oldStatus} -> ${newStatus}`,
    )

    const sockets = this.sessionRooms.get(sessionId)
    if (!sockets || sockets.size === 0) {
      this.logger.debug(`No clients in session ${sessionId} to notify`)
      return
    }

    // Broadcast status change to all clients in room
    const statusUpdateEvent: SessionStatusUpdateEvent = {
      type: WS_EVENTS.SESSION_STATUS,
      timestamp: new Date().toISOString(),
      payload: {
        sessionId,
        session,
      },
    }

    this.server.to(sessionId).emit(WS_EVENTS.SESSION_STATUS, statusUpdateEvent)
    this.logger.log(
      `Broadcast status change to ${sockets.size} clients in session ${sessionId}`,
    )
  }

  /**
   * Handle Claude messages from ClaudeCodeService
   * Forwards SDK messages to session room clients
   */
  @OnEvent(INTERNAL_EVENTS.CLAUDE_MESSAGE)
  handleClaudeMessage(payload: {
    sessionId: string
    queryId: string
    message: unknown // SDK message type (assistant, tool_call, etc.)
  }): void {
    const { sessionId, queryId, message } = payload

    // Validate sessionId
    if (!sessionId) {
      this.logger.warn('Received CLAUDE_MESSAGE with invalid sessionId')
      return
    }

    const sockets = this.sessionRooms.get(sessionId)
    if (!sockets || sockets.size === 0) {
      this.logger.debug(`No clients in session ${sessionId} for Claude message`)
      return
    }

    // Broadcast SDK message directly to clients
    this.server.to(sessionId).emit(WS_EVENTS.CLAUDE_MESSAGE, {
      type: WS_EVENTS.CLAUDE_MESSAGE,
      timestamp: new Date().toISOString(),
      payload: {
        sessionId,
        queryId,
        message, // Full SDK message (type: assistant|tool_call|tool_result|error|system)
      },
    })

    this.logger.debug(
      `Broadcast Claude message to ${sockets.size} clients in session ${sessionId}`,
    )
  }

  /**
   * Handle query completion events
   */
  @OnEvent(INTERNAL_EVENTS.CLAUDE_QUERY_COMPLETED)
  handleClaudeQueryCompleted(payload: {
    queryId: string
    result: ClaudeCodeQueryResult
  }): void {
    const { result } = payload

    // Validate result and sessionId
    if (!result || !result.sessionId) {
      this.logger.warn('Received CLAUDE_QUERY_COMPLETED with invalid result')
      return
    }

    const sockets = this.sessionRooms.get(result.sessionId)
    if (!sockets || sockets.size === 0) {
      this.logger.debug(
        `No clients in session ${result.sessionId} for query result`,
      )
      return
    }

    this.server.to(result.sessionId).emit(WS_EVENTS.CLAUDE_QUERY_RESULT, {
      type: WS_EVENTS.CLAUDE_QUERY_RESULT,
      timestamp: new Date().toISOString(),
      payload: { result },
    })

    this.logger.log(
      `Query ${result.queryId} completed for session ${result.sessionId} (${result.duration}ms)`,
    )
  }

  /**
   * Handle Claude ready events
   * Emitted when Claude subprocess is ready for the next prompt
   */
  @OnEvent(INTERNAL_EVENTS.CLAUDE_READY)
  handleClaudeReady(payload: { sessionId: string }): void {
    const { sessionId } = payload

    // Validate sessionId
    if (!sessionId) {
      this.logger.warn('Received CLAUDE_READY with invalid sessionId')
      return
    }

    const sockets = this.sessionRooms.get(sessionId)
    if (!sockets || sockets.size === 0) {
      this.logger.debug(`No clients in session ${sessionId} for ready event`)
      return
    }

    this.server.to(sessionId).emit(WS_EVENTS.CLAUDE_READY, {
      type: WS_EVENTS.CLAUDE_READY,
      timestamp: new Date().toISOString(),
      payload: { sessionId },
    })

    this.logger.debug(`Claude ready event broadcast to session ${sessionId}`)
  }
}
