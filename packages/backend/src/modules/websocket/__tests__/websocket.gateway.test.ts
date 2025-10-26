import {
  ERROR_CODES,
  type Session,
  SessionStatus,
  WS_EVENTS,
} from '@claude-code-web/shared'
import { Test, TestingModule } from '@nestjs/testing'
import type { Server, Socket } from 'socket.io'

import { SessionService } from '../../session/session.service'
import { AppWebSocketGateway } from '../websocket.gateway'

/**
 * Mock Socket.io socket for testing
 */
interface MockSocket {
  id: string
  emit: jest.Mock
  join: jest.Mock
  leave: jest.Mock
  rooms: Set<string>
}

describe('AppWebSocketGateway', () => {
  let gateway: AppWebSocketGateway
  let sessionService: jest.Mocked<SessionService>
  let mockServer: jest.Mocked<Partial<Server>>

  // Helper to create a mock Socket
  const createMockSocket = (id: string): jest.Mocked<MockSocket> => {
    return {
      id,
      emit: jest.fn(),
      join: jest.fn().mockResolvedValue(undefined),
      leave: jest.fn(),
      rooms: new Set([id]),
    }
  }

  // Helper to create a mock Session
  const createMockSession = (overrides?: Partial<Session>): Session => ({
    id: '550e8400-e29b-41d4-a716-446655440000',
    status: SessionStatus.PENDING,
    workingDirectory: '/test/dir',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  })

  // Helper to get room emit function from mocked server.to()
  const getRoomEmit = (): jest.Mock => {
    const toMock = mockServer.to as jest.Mock
    const result = toMock.mock.results[0]?.value as
      | { emit: jest.Mock }
      | undefined
    if (!result) {
      throw new Error('No result found on mocked server.to()')
    }
    // Explicitly return the emit mock with proper typing
    const emitMock: jest.Mock = result.emit
    return emitMock
  }

  beforeEach(async () => {
    const mockSessionService = {
      createSession: jest.fn(),
      getSession: jest.fn(),
      getAllSessions: jest.fn(),
      updateSessionStatus: jest.fn(),
      deleteSession: jest.fn(),
      getSessionCount: jest.fn(),
    }

    const mockEmit = jest.fn()
    mockServer = {
      to: jest.fn().mockReturnValue({
        emit: mockEmit,
      }),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppWebSocketGateway,
        {
          provide: SessionService,
          useValue: mockSessionService,
        },
      ],
    }).compile()

    gateway = module.get<AppWebSocketGateway>(AppWebSocketGateway)
    sessionService = module.get(SessionService)

    // Manually set the server since it's decorated with @WebSocketServer()
    gateway.server = mockServer as Server

    jest.clearAllMocks()
  })

  describe('Connection/Disconnection Management', () => {
    it('should track connected clients on connection', () => {
      const mockClient = createMockSocket('client-1')

      gateway.handleConnection(mockClient as unknown as Socket)

      const connectedClients = gateway['connectedClients']
      expect(connectedClients.size).toBe(1)
      expect(connectedClients.has('client-1')).toBe(true)
    })

    it('should remove client from connectedClients on disconnect', () => {
      const mockClient = createMockSocket('client-1')

      gateway.handleConnection(mockClient as unknown as Socket)
      expect(gateway['connectedClients'].size).toBe(1)

      gateway.handleDisconnect(mockClient as unknown as Socket)
      expect(gateway['connectedClients'].size).toBe(0)
    })

    it('should clean up client from all session rooms on disconnect', () => {
      const mockClient = createMockSocket('client-1')
      const sessionId = '550e8400-e29b-41d4-a716-446655440000'

      gateway.handleConnection(mockClient as unknown as Socket)

      // Manually add client to a session room
      const sessionRooms = gateway['sessionRooms']
      sessionRooms.set(sessionId, new Set(['client-1']))

      gateway.handleDisconnect(mockClient as unknown as Socket)

      expect(sessionRooms.has(sessionId)).toBe(false)
    })

    it('should remove empty session rooms on disconnect', () => {
      const mockClient1 = createMockSocket('client-1')
      const mockClient2 = createMockSocket('client-2')
      const sessionId = '550e8400-e29b-41d4-a716-446655440000'

      gateway.handleConnection(mockClient1 as unknown as Socket)
      gateway.handleConnection(mockClient2 as unknown as Socket)

      // Add both clients to session room
      const sessionRooms = gateway['sessionRooms']
      sessionRooms.set(sessionId, new Set(['client-1', 'client-2']))

      // Disconnect first client - room should still exist
      gateway.handleDisconnect(mockClient1 as unknown as Socket)
      expect(sessionRooms.has(sessionId)).toBe(true)
      expect(sessionRooms.get(sessionId)?.size).toBe(1)

      // Disconnect second client - room should be removed
      gateway.handleDisconnect(mockClient2 as unknown as Socket)
      expect(sessionRooms.has(sessionId)).toBe(false)
    })
  })

  describe('Session Join (handleJoinSession)', () => {
    it('should validate session exists before joining', () => {
      const mockClient = createMockSocket('client-1')
      const sessionId = '550e8400-e29b-41d4-a716-446655440000'
      const mockSession = createMockSession({ id: sessionId })

      sessionService.getSession.mockReturnValue(mockSession)

      gateway.handleJoinSession(mockClient as unknown as Socket, {
        type: WS_EVENTS.SESSION_JOIN,
        timestamp: new Date().toISOString(),
        payload: { sessionId },
      })

      expect(sessionService.getSession).toHaveBeenCalledWith(sessionId)
    })

    it('should add client to Socket.io room', () => {
      const mockClient = createMockSocket('client-1')
      const sessionId = '550e8400-e29b-41d4-a716-446655440000'
      const mockSession = createMockSession({ id: sessionId })

      sessionService.getSession.mockReturnValue(mockSession)

      gateway.handleJoinSession(mockClient as unknown as Socket, {
        type: WS_EVENTS.SESSION_JOIN,
        timestamp: new Date().toISOString(),
        payload: { sessionId },
      })

      expect(mockClient.join).toHaveBeenCalledWith(sessionId)
    })

    it('should track client in sessionRooms map', () => {
      const mockClient = createMockSocket('client-1')
      const sessionId = '550e8400-e29b-41d4-a716-446655440000'
      const mockSession = createMockSession({ id: sessionId })

      sessionService.getSession.mockReturnValue(mockSession)

      gateway.handleJoinSession(mockClient as unknown as Socket, {
        type: WS_EVENTS.SESSION_JOIN,
        timestamp: new Date().toISOString(),
        payload: { sessionId },
      })

      const sessionRooms = gateway['sessionRooms']
      expect(sessionRooms.has(sessionId)).toBe(true)
      expect(sessionRooms.get(sessionId)?.has('client-1')).toBe(true)
    })

    it("should emit 'session:joined' event with session data", () => {
      const mockClient = createMockSocket('client-1')
      const sessionId = '550e8400-e29b-41d4-a716-446655440000'
      const mockSession = createMockSession({ id: sessionId })

      sessionService.getSession.mockReturnValue(mockSession)

      gateway.handleJoinSession(mockClient as unknown as Socket, {
        type: WS_EVENTS.SESSION_JOIN,
        timestamp: new Date().toISOString(),
        id: 'request-123',
        payload: { sessionId },
      })

      expect(mockClient.emit).toHaveBeenCalledWith(
        WS_EVENTS.SESSION_JOINED,
        expect.objectContaining({
          type: WS_EVENTS.SESSION_JOINED,
          id: 'request-123',
          payload: {
            sessionId,
            session: mockSession,
          },
        }),
      )
    })

    it('should emit error event for non-existent session', () => {
      const mockClient = createMockSocket('client-1')
      const sessionId = '550e8400-e29b-41d4-a716-446655440099'

      sessionService.getSession.mockReturnValue(null)

      gateway.handleJoinSession(mockClient as unknown as Socket, {
        type: WS_EVENTS.SESSION_JOIN,
        timestamp: new Date().toISOString(),
        id: 'request-123',
        payload: { sessionId },
      })

      expect(mockClient.emit).toHaveBeenCalledWith(
        WS_EVENTS.ERROR,
        expect.objectContaining({
          type: WS_EVENTS.ERROR,
          id: 'request-123',
          payload: {
            code: ERROR_CODES.SESSION_NOT_FOUND,
            message: `Session not found: ${sessionId}`,
          },
        }),
      )
    })

    it('should handle multiple clients joining same session', () => {
      const mockClient1 = createMockSocket('client-1')
      const mockClient2 = createMockSocket('client-2')
      const sessionId = '550e8400-e29b-41d4-a716-446655440000'
      const mockSession = createMockSession({ id: sessionId })

      sessionService.getSession.mockReturnValue(mockSession)

      gateway.handleJoinSession(mockClient1 as unknown as Socket, {
        type: WS_EVENTS.SESSION_JOIN,
        timestamp: new Date().toISOString(),
        payload: { sessionId },
      })

      gateway.handleJoinSession(mockClient2 as unknown as Socket, {
        type: WS_EVENTS.SESSION_JOIN,
        timestamp: new Date().toISOString(),
        payload: { sessionId },
      })

      const sessionRooms = gateway['sessionRooms']
      const sockets = sessionRooms.get(sessionId)

      expect(sockets?.size).toBe(2)
      expect(sockets?.has('client-1')).toBe(true)
      expect(sockets?.has('client-2')).toBe(true)
    })
  })

  describe('Session Leave (handleLeaveSession)', () => {
    it('should remove client from Socket.io room', () => {
      const mockClient = createMockSocket('client-1')
      const sessionId = '550e8400-e29b-41d4-a716-446655440000'

      gateway.handleLeaveSession(mockClient as unknown as Socket, {
        type: WS_EVENTS.SESSION_LEAVE,
        timestamp: new Date().toISOString(),
        payload: { sessionId },
      })

      expect(mockClient.leave).toHaveBeenCalledWith(sessionId)
    })

    it('should remove client from sessionRooms map', () => {
      const mockClient = createMockSocket('client-1')
      const sessionId = '550e8400-e29b-41d4-a716-446655440000'

      // Setup: add client to session room
      const sessionRooms = gateway['sessionRooms']
      sessionRooms.set(sessionId, new Set(['client-1']))

      gateway.handleLeaveSession(mockClient as unknown as Socket, {
        type: WS_EVENTS.SESSION_LEAVE,
        timestamp: new Date().toISOString(),
        payload: { sessionId },
      })

      expect(sessionRooms.has(sessionId)).toBe(false)
    })

    it('should remove empty session rooms after last client leaves', () => {
      const mockClient1 = createMockSocket('client-1')
      const mockClient2 = createMockSocket('client-2')
      const sessionId = '550e8400-e29b-41d4-a716-446655440000'

      const sessionRooms = gateway['sessionRooms']
      sessionRooms.set(sessionId, new Set(['client-1', 'client-2']))

      // First client leaves
      gateway.handleLeaveSession(mockClient1 as unknown as Socket, {
        type: WS_EVENTS.SESSION_LEAVE,
        timestamp: new Date().toISOString(),
        payload: { sessionId },
      })

      expect(sessionRooms.has(sessionId)).toBe(true)
      expect(sessionRooms.get(sessionId)?.size).toBe(1)

      // Second client leaves
      gateway.handleLeaveSession(mockClient2 as unknown as Socket, {
        type: WS_EVENTS.SESSION_LEAVE,
        timestamp: new Date().toISOString(),
        payload: { sessionId },
      })

      expect(sessionRooms.has(sessionId)).toBe(false)
    })

    it("should emit 'session:left' confirmation event", () => {
      const mockClient = createMockSocket('client-1')
      const sessionId = '550e8400-e29b-41d4-a716-446655440000'

      gateway.handleLeaveSession(mockClient as unknown as Socket, {
        type: WS_EVENTS.SESSION_LEAVE,
        timestamp: new Date().toISOString(),
        id: 'request-123',
        payload: { sessionId },
      })

      expect(mockClient.emit).toHaveBeenCalledWith(
        WS_EVENTS.SESSION_LEFT,
        expect.objectContaining({
          type: WS_EVENTS.SESSION_LEFT,
          id: 'request-123',
          payload: { sessionId },
        }),
      )
    })
  })

  describe('Session Messages (handleSessionMessage)', () => {
    it('should broadcast message to all clients in session room', () => {
      const mockClient = createMockSocket('client-1')
      const sessionId = '550e8400-e29b-41d4-a716-446655440000'
      const content = 'Hello, session!'
      const mockSession = createMockSession({ id: sessionId })

      // Setup: add client to session room
      const sessionRooms = gateway['sessionRooms']
      sessionRooms.set(sessionId, new Set(['client-1']))

      // Mock session exists
      sessionService.getSession.mockReturnValue(mockSession)

      gateway.handleSessionMessage(mockClient as unknown as Socket, {
        type: WS_EVENTS.SESSION_MESSAGE,
        timestamp: new Date().toISOString(),
        id: 'request-123',
        payload: { sessionId, content },
      })

      expect(mockServer.to).toHaveBeenCalledWith(sessionId)
      const roomEmit = getRoomEmit()
      expect(roomEmit).toHaveBeenCalledWith(
        WS_EVENTS.SESSION_MESSAGE,
        expect.objectContaining({
          type: WS_EVENTS.SESSION_MESSAGE,
          id: 'request-123',
          payload: {
            sessionId,
            content,
            senderId: 'client-1',
          },
        }),
      )
    })

    it('should include senderId in message payload', () => {
      const mockClient = createMockSocket('client-1')
      const sessionId = '550e8400-e29b-41d4-a716-446655440000'
      const content = 'Test message'
      const mockSession = createMockSession({ id: sessionId })

      const sessionRooms = gateway['sessionRooms']
      sessionRooms.set(sessionId, new Set(['client-1']))

      // Mock session exists
      sessionService.getSession.mockReturnValue(mockSession)

      gateway.handleSessionMessage(mockClient as unknown as Socket, {
        type: WS_EVENTS.SESSION_MESSAGE,
        timestamp: new Date().toISOString(),
        payload: { sessionId, content },
      })

      const roomEmit = getRoomEmit()
      expect(roomEmit).toHaveBeenCalledWith(
        WS_EVENTS.SESSION_MESSAGE,
        expect.objectContaining({
          payload: expect.objectContaining({
            senderId: 'client-1',
          }),
        }),
      )
    })

    it('should emit error if client not in session room', () => {
      const mockClient = createMockSocket('client-1')
      const sessionId = '550e8400-e29b-41d4-a716-446655440000'
      const content = 'Hello'

      // Client is NOT in session room

      gateway.handleSessionMessage(mockClient as unknown as Socket, {
        type: WS_EVENTS.SESSION_MESSAGE,
        timestamp: new Date().toISOString(),
        id: 'request-123',
        payload: { sessionId, content },
      })

      expect(mockClient.emit).toHaveBeenCalledWith(
        WS_EVENTS.ERROR,
        expect.objectContaining({
          type: WS_EVENTS.ERROR,
          id: 'request-123',
          payload: {
            code: ERROR_CODES.INVALID_REQUEST,
            message: `You must join session ${sessionId} before sending messages`,
          },
        }),
      )
    })

    it('should preserve message correlation ID', () => {
      const mockClient = createMockSocket('client-1')
      const sessionId = '550e8400-e29b-41d4-a716-446655440000'
      const correlationId = 'correlation-xyz'
      const mockSession = createMockSession({ id: sessionId })

      const sessionRooms = gateway['sessionRooms']
      sessionRooms.set(sessionId, new Set(['client-1']))

      // Mock session exists
      sessionService.getSession.mockReturnValue(mockSession)

      gateway.handleSessionMessage(mockClient as unknown as Socket, {
        type: WS_EVENTS.SESSION_MESSAGE,
        timestamp: new Date().toISOString(),
        id: correlationId,
        payload: { sessionId, content: 'Test' },
      })

      const roomEmit = getRoomEmit()
      expect(roomEmit).toHaveBeenCalledWith(
        WS_EVENTS.SESSION_MESSAGE,
        expect.objectContaining({
          id: correlationId,
        }),
      )
    })
  })

  describe('Event Listeners - Session Deleted (handleSessionDeleted)', () => {
    it("should broadcast 'session:deleted' event to room", () => {
      const sessionId = '550e8400-e29b-41d4-a716-446655440000'
      const reason = 'User requested deletion'

      const sessionRooms = gateway['sessionRooms']
      sessionRooms.set(sessionId, new Set(['client-1', 'client-2']))

      const mockClient1 = createMockSocket('client-1')
      const mockClient2 = createMockSocket('client-2')
      gateway['connectedClients'].set(
        'client-1',
        mockClient1 as unknown as Socket,
      )
      gateway['connectedClients'].set(
        'client-2',
        mockClient2 as unknown as Socket,
      )

      gateway.handleSessionDeleted({ sessionId, reason })

      expect(mockServer.to).toHaveBeenCalledWith(sessionId)
      const roomEmit = getRoomEmit()
      expect(roomEmit).toHaveBeenCalledWith(
        WS_EVENTS.SESSION_DELETED,
        expect.objectContaining({
          type: WS_EVENTS.SESSION_DELETED,
          payload: { sessionId, reason },
        }),
      )
    })

    it('should remove all clients from session room', () => {
      const sessionId = '550e8400-e29b-41d4-a716-446655440000'
      const mockClient1 = createMockSocket('client-1')
      const mockClient2 = createMockSocket('client-2')

      gateway['connectedClients'].set(
        'client-1',
        mockClient1 as unknown as Socket,
      )
      gateway['connectedClients'].set(
        'client-2',
        mockClient2 as unknown as Socket,
      )

      const sessionRooms = gateway['sessionRooms']
      sessionRooms.set(sessionId, new Set(['client-1', 'client-2']))

      gateway.handleSessionDeleted({ sessionId })

      expect(mockClient1.leave).toHaveBeenCalledWith(sessionId)
      expect(mockClient2.leave).toHaveBeenCalledWith(sessionId)
    })

    it('should clean up sessionRooms tracking', () => {
      const sessionId = '550e8400-e29b-41d4-a716-446655440000'
      const mockClient = createMockSocket('client-1')

      gateway['connectedClients'].set(
        'client-1',
        mockClient as unknown as Socket,
      )

      const sessionRooms = gateway['sessionRooms']
      sessionRooms.set(sessionId, new Set(['client-1']))

      gateway.handleSessionDeleted({ sessionId })

      expect(sessionRooms.has(sessionId)).toBe(false)
    })

    it('should handle deletion of session with no clients', () => {
      const sessionId = '550e8400-e29b-41d4-a716-446655440000'

      // No clients in the session room
      expect(() => {
        gateway.handleSessionDeleted({ sessionId })
      }).not.toThrow()

      expect(mockServer.to).not.toHaveBeenCalled()
    })

    it('should include reason in deletion event', () => {
      const sessionId = '550e8400-e29b-41d4-a716-446655440000'
      const reason = 'Session expired'
      const mockClient = createMockSocket('client-1')

      gateway['connectedClients'].set(
        'client-1',
        mockClient as unknown as Socket,
      )

      const sessionRooms = gateway['sessionRooms']
      sessionRooms.set(sessionId, new Set(['client-1']))

      gateway.handleSessionDeleted({ sessionId, reason })

      const roomEmit = getRoomEmit()
      expect(roomEmit).toHaveBeenCalledWith(
        WS_EVENTS.SESSION_DELETED,
        expect.objectContaining({
          payload: expect.objectContaining({
            reason,
          }),
        }),
      )
    })
  })

  describe('Event Listeners - Session Updated (handleSessionUpdated)', () => {
    it("should broadcast 'session:status' event to room", () => {
      const sessionId = '550e8400-e29b-41d4-a716-446655440000'
      const session = createMockSession({
        id: sessionId,
        status: SessionStatus.ACTIVE,
      })

      const sessionRooms = gateway['sessionRooms']
      sessionRooms.set(sessionId, new Set(['client-1']))

      gateway.handleSessionUpdated({ sessionId, session })

      expect(mockServer.to).toHaveBeenCalledWith(sessionId)
      const roomEmit = getRoomEmit()
      expect(roomEmit).toHaveBeenCalledWith(
        WS_EVENTS.SESSION_STATUS,
        expect.objectContaining({
          type: WS_EVENTS.SESSION_STATUS,
          payload: { sessionId, session },
        }),
      )
    })

    it('should include updated session data in event', () => {
      const sessionId = '550e8400-e29b-41d4-a716-446655440000'
      const session = createMockSession({
        id: sessionId,
        status: SessionStatus.COMPLETED,
      })

      const sessionRooms = gateway['sessionRooms']
      sessionRooms.set(sessionId, new Set(['client-1']))

      gateway.handleSessionUpdated({ sessionId, session })

      const roomEmit = getRoomEmit()
      expect(roomEmit).toHaveBeenCalledWith(
        WS_EVENTS.SESSION_STATUS,
        expect.objectContaining({
          payload: {
            sessionId,
            session,
          },
        }),
      )
    })

    it('should handle update for session with no clients', () => {
      const sessionId = '550e8400-e29b-41d4-a716-446655440000'
      const session = createMockSession({ id: sessionId })

      // No clients in the session room
      expect(() => {
        gateway.handleSessionUpdated({ sessionId, session })
      }).not.toThrow()

      expect(mockServer.to).not.toHaveBeenCalled()
    })
  })

  describe('Ping/Pong', () => {
    it('should respond to ping with pong', () => {
      const mockClient = createMockSocket('client-1')

      gateway.handlePing(mockClient as unknown as Socket, {
        type: WS_EVENTS.PING,
        timestamp: new Date().toISOString(),
        id: 'ping-123',
      })

      expect(mockClient.emit).toHaveBeenCalledWith(
        WS_EVENTS.PONG,
        expect.objectContaining({
          type: WS_EVENTS.PONG,
          id: 'ping-123',
        }),
      )
    })

    it('should preserve correlation ID in pong response', () => {
      const mockClient = createMockSocket('client-1')
      const correlationId = 'unique-correlation-id'

      gateway.handlePing(mockClient as unknown as Socket, {
        type: WS_EVENTS.PING,
        timestamp: new Date().toISOString(),
        id: correlationId,
      })

      expect(mockClient.emit).toHaveBeenCalledWith(
        WS_EVENTS.PONG,
        expect.objectContaining({
          id: correlationId,
        }),
      )
    })
  })

  describe('Message Echo (deprecated functionality)', () => {
    it('should echo messages back to sender', () => {
      const mockClient = createMockSocket('client-1')
      const content = 'Test message'

      gateway.handleMessage(mockClient as unknown as Socket, {
        type: WS_EVENTS.MESSAGE,
        timestamp: new Date().toISOString(),
        id: 'msg-123',
        payload: { content },
      })

      expect(mockClient.emit).toHaveBeenCalledWith(
        WS_EVENTS.MESSAGE,
        expect.objectContaining({
          type: WS_EVENTS.MESSAGE,
          id: 'msg-123',
          payload: {
            content,
            echo: true,
          },
        }),
      )
    })

    it('should mark echo responses with echo flag', () => {
      const mockClient = createMockSocket('client-1')

      gateway.handleMessage(mockClient as unknown as Socket, {
        type: WS_EVENTS.MESSAGE,
        timestamp: new Date().toISOString(),
        payload: { content: 'Hello' },
      })

      expect(mockClient.emit).toHaveBeenCalledWith(
        WS_EVENTS.MESSAGE,
        expect.objectContaining({
          payload: expect.objectContaining({
            echo: true,
          }),
        }),
      )
    })
  })
})
