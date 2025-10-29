import type { IncomingHttpHeaders } from 'node:http'

import {
  type Session,
  type SessionMetadata,
  SessionStatus,
} from '@claude-code-web/shared'
import { Test, TestingModule } from '@nestjs/testing'

import { SessionController } from './session.controller'
import { SessionService } from './session.service'

/**
 * Serialized session with ISO string dates (as returned by REST API)
 */
interface SerializedSession {
  id: string
  status: SessionStatus
  workingDirectory: string
  createdAt: string
  updatedAt: string
  metadata?: SessionMetadata
}

/**
 * Response types for controller endpoints
 */
type CreateSessionResponse =
  | { status: 201; body: SerializedSession }
  | { status: 400; body: { message: string; errors?: unknown[] } }
  | { status: 500; body: { message: string } }

type GetAllSessionsResponse =
  | { status: 200; body: SerializedSession[] }
  | { status: 500; body: { message: string } }

type GetSessionResponse =
  | { status: 200; body: SerializedSession }
  | { status: 404; body: { message: string } }
  | { status: 500; body: { message: string } }

type UpdateSessionResponse =
  | { status: 200; body: SerializedSession }
  | { status: 400; body: { message: string; errors?: unknown[] } }
  | { status: 404; body: { message: string } }
  | { status: 500; body: { message: string } }

type DeleteSessionResponse =
  | { status: 204; body: void }
  | { status: 404; body: { message: string } }
  | { status: 500; body: { message: string } }

describe('SessionController', () => {
  let controller: SessionController
  let sessionService: jest.Mocked<SessionService>

  // Mock headers for requests
  const mockHeaders: IncomingHttpHeaders = {}

  // Helper to create a mock session
  const createMockSession = (overrides?: Partial<Session>): Session => ({
    id: '550e8400-e29b-41d4-a716-446655440000',
    status: SessionStatus.INITIALIZING,
    workingDirectory: '/test/dir',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  })

  beforeEach(async () => {
    const mockSessionService = {
      createSession: jest.fn(),
      getSession: jest.fn(),
      getAllSessions: jest.fn(),
      updateSessionStatus: jest.fn(),
      deleteSession: jest.fn(),
      getSessionCount: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionController],
      providers: [
        {
          provide: SessionService,
          useValue: mockSessionService,
        },
      ],
    }).compile()

    controller = module.get<SessionController>(SessionController)
    sessionService = module.get(SessionService)

    jest.clearAllMocks()
  })

  describe('createSession endpoint', () => {
    it('should create session and return 201 status', async () => {
      const mockSession = createMockSession()
      sessionService.createSession.mockReturnValue(mockSession)

      const handlerInstance = controller.handler()
      const result = (await handlerInstance.createSession({
        headers: mockHeaders,
        body: { workingDirectory: '/test/dir' },
      })) as CreateSessionResponse

      expect(result.status).toBe(201)
      if (result.status === 201) {
        expect(result.body).toHaveProperty('id', mockSession.id)
      }
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(sessionService.createSession).toHaveBeenCalledWith({
        workingDirectory: '/test/dir',
      })
    })

    it('should serialize Date objects to ISO strings', async () => {
      const mockSession = createMockSession()
      sessionService.createSession.mockReturnValue(mockSession)

      const handlerInstance = controller.handler()
      const result = (await handlerInstance.createSession({
        headers: mockHeaders,
        body: { workingDirectory: '/test/dir' },
      })) as CreateSessionResponse

      expect(result.status).toBe(201)
      if (result.status === 201) {
        expect(result.body.createdAt).toBe('2024-01-01T00:00:00.000Z')
        expect(result.body.updatedAt).toBe('2024-01-01T00:00:00.000Z')
        expect(typeof result.body.createdAt).toBe('string')
        expect(typeof result.body.updatedAt).toBe('string')
      }
    })

    it('should handle errors and return 500 status', async () => {
      sessionService.createSession.mockImplementation(() => {
        throw new Error('Database error')
      })

      const handlerInstance = controller.handler()
      const result = (await handlerInstance.createSession({
        headers: mockHeaders,
        body: { workingDirectory: '/test/dir' },
      })) as CreateSessionResponse

      expect(result.status).toBe(500)
      if (result.status === 500) {
        expect(result.body).toEqual({
          message: 'Failed to create session',
        })
      }
    })

    it('should call SessionService.createSession with correct payload', async () => {
      const mockSession = createMockSession()
      sessionService.createSession.mockReturnValue(mockSession)

      const payload = {
        workingDirectory: '/custom/dir',
        metadata: {
          clientId: 'test-client',
          tags: ['test'],
          description: 'Test session',
        },
      }

      const handlerInstance = controller.handler()
      await handlerInstance.createSession({
        headers: mockHeaders,
        body: payload,
      })

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(sessionService.createSession).toHaveBeenCalledWith(payload)
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(sessionService.createSession).toHaveBeenCalledTimes(1)
    })
  })

  describe('getAllSessions endpoint', () => {
    it('should return all sessions with 200 status', async () => {
      const mockSessions = [
        createMockSession({ id: '550e8400-e29b-41d4-a716-446655440000' }),
        createMockSession({ id: '550e8400-e29b-41d4-a716-446655440001' }),
      ]
      sessionService.getAllSessions.mockReturnValue(mockSessions)

      const handlerInstance = controller.handler()
      const result = (await handlerInstance.getAllSessions({
        headers: mockHeaders,
      })) as GetAllSessionsResponse

      expect(result.status).toBe(200)
      if (result.status === 200) {
        expect(result.body).toHaveLength(2)
      }
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(sessionService.getAllSessions).toHaveBeenCalledTimes(1)
    })

    it('should serialize all sessions correctly', async () => {
      const mockSessions = [
        createMockSession(),
        createMockSession({ id: '550e8400-e29b-41d4-a716-446655440001' }),
      ]
      sessionService.getAllSessions.mockReturnValue(mockSessions)

      const handlerInstance = controller.handler()
      const result = (await handlerInstance.getAllSessions({
        headers: mockHeaders,
      })) as GetAllSessionsResponse

      expect(result.status).toBe(200)
      if (result.status === 200) {
        result.body.forEach((session: SerializedSession) => {
          expect(typeof session.createdAt).toBe('string')
          expect(typeof session.updatedAt).toBe('string')
        })
      }
    })

    it('should handle errors and return 500 status', async () => {
      sessionService.getAllSessions.mockImplementation(() => {
        throw new Error('Database error')
      })

      const handlerInstance = controller.handler()
      const result = (await handlerInstance.getAllSessions({
        headers: mockHeaders,
      })) as GetAllSessionsResponse

      expect(result.status).toBe(500)
      if (result.status === 500) {
        expect(result.body).toEqual({
          message: 'Failed to fetch sessions',
        })
      }
    })
  })

  describe('getSession endpoint', () => {
    it('should return session with 200 status when found', async () => {
      const mockSession = createMockSession()
      sessionService.getSession.mockReturnValue(mockSession)

      const handlerInstance = controller.handler()
      const result = (await handlerInstance.getSession({
        params: { id: mockSession.id },
        headers: mockHeaders,
      })) as GetSessionResponse

      expect(result.status).toBe(200)
      if (result.status === 200) {
        expect(result.body).toHaveProperty('id', mockSession.id)
      }
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(sessionService.getSession).toHaveBeenCalledWith(mockSession.id)
    })

    it('should return 404 when session not found', async () => {
      sessionService.getSession.mockReturnValue(null)

      const handlerInstance = controller.handler()
      const result = (await handlerInstance.getSession({
        params: { id: '550e8400-e29b-41d4-a716-446655440099' },
        headers: mockHeaders,
      })) as GetSessionResponse

      expect(result.status).toBe(404)
      if (result.status === 404) {
        expect(result.body).toEqual({
          message: 'Session not found: 550e8400-e29b-41d4-a716-446655440099',
        })
      }
    })

    it('should handle errors and return 500 status', async () => {
      sessionService.getSession.mockImplementation(() => {
        throw new Error('Database error')
      })

      const handlerInstance = controller.handler()
      const result = (await handlerInstance.getSession({
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        headers: mockHeaders,
      })) as GetSessionResponse

      expect(result.status).toBe(500)
      if (result.status === 500) {
        expect(result.body).toEqual({
          message: 'Failed to fetch session',
        })
      }
    })
  })

  describe('updateSessionStatus endpoint', () => {
    it('should update session and return 200 status', async () => {
      const mockSession = createMockSession({ status: SessionStatus.ACTIVE })
      sessionService.updateSessionStatus.mockReturnValue(mockSession)

      const handlerInstance = controller.handler()
      const result = (await handlerInstance.updateSessionStatus({
        params: { id: mockSession.id },
        headers: mockHeaders,
        body: { status: SessionStatus.ACTIVE },
      })) as UpdateSessionResponse

      expect(result.status).toBe(200)
      if (result.status === 200) {
        expect(result.body).toHaveProperty('status', SessionStatus.ACTIVE)
      }
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(sessionService.updateSessionStatus).toHaveBeenCalledWith(
        mockSession.id,
        SessionStatus.ACTIVE,
      )
    })

    it('should return 404 when session not found', async () => {
      sessionService.updateSessionStatus.mockReturnValue(null)

      const handlerInstance = controller.handler()
      const result = (await handlerInstance.updateSessionStatus({
        params: { id: '550e8400-e29b-41d4-a716-446655440099' },
        headers: mockHeaders,
        body: { status: SessionStatus.ACTIVE },
      })) as UpdateSessionResponse

      expect(result.status).toBe(404)
      if (result.status === 404) {
        expect(result.body).toEqual({
          message: 'Session not found: 550e8400-e29b-41d4-a716-446655440099',
        })
      }
    })

    it('should handle errors and return 500 status', async () => {
      sessionService.updateSessionStatus.mockImplementation(() => {
        throw new Error('Database error')
      })

      const handlerInstance = controller.handler()
      const result = (await handlerInstance.updateSessionStatus({
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        headers: mockHeaders,
        body: { status: SessionStatus.ACTIVE },
      })) as UpdateSessionResponse

      expect(result.status).toBe(500)
      if (result.status === 500) {
        expect(result.body).toEqual({
          message: 'Failed to update session',
        })
      }
    })

    it('should validate status enum values', async () => {
      const mockSession = createMockSession()
      sessionService.updateSessionStatus.mockReturnValue(mockSession)

      const handlerInstance = controller.handler()

      const statuses = [
        SessionStatus.INITIALIZING,
        SessionStatus.ACTIVE,
        SessionStatus.TERMINATED,
      ]

      for (const status of statuses) {
        sessionService.updateSessionStatus.mockReturnValue({
          ...mockSession,
          status,
        })

        const result = (await handlerInstance.updateSessionStatus({
          params: { id: mockSession.id },
          headers: mockHeaders,
          body: { status },
        })) as UpdateSessionResponse

        expect(result.status).toBe(200)
        if (result.status === 200) {
          expect(result.body).toHaveProperty('status', status)
        }
      }
    })
  })

  describe('deleteSession endpoint', () => {
    it('should delete session and return 204 status', async () => {
      sessionService.deleteSession.mockResolvedValue(true)

      const handlerInstance = controller.handler()
      const result = (await handlerInstance.deleteSession({
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        headers: mockHeaders,
        body: null,
      })) as DeleteSessionResponse

      expect(result.status).toBe(204)
      if (result.status === 204) {
        expect(result.body).toBeUndefined()
      }
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(sessionService.deleteSession).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
      )
    })

    it('should return 404 when session not found', async () => {
      sessionService.deleteSession.mockResolvedValue(false)

      const handlerInstance = controller.handler()
      const result = (await handlerInstance.deleteSession({
        params: { id: '550e8400-e29b-41d4-a716-446655440099' },
        headers: mockHeaders,
        body: null,
      })) as DeleteSessionResponse

      expect(result.status).toBe(404)
      if (result.status === 404) {
        expect(result.body).toEqual({
          message: 'Session not found: 550e8400-e29b-41d4-a716-446655440099',
        })
      }
    })

    it('should handle errors and return 500 status', async () => {
      sessionService.deleteSession.mockRejectedValue(
        new Error('Database error'),
      )

      const handlerInstance = controller.handler()
      const result = (await handlerInstance.deleteSession({
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        headers: mockHeaders,
        body: null,
      })) as DeleteSessionResponse

      expect(result.status).toBe(500)
      if (result.status === 500) {
        expect(result.body).toEqual({
          message: 'Failed to delete session',
        })
      }
    })
  })

  describe('serializeSession', () => {
    it('should convert Date objects to ISO strings', async () => {
      const mockSession = createMockSession()
      sessionService.createSession.mockReturnValue(mockSession)

      // Test serialization through the createSession endpoint
      const handlerInstance = controller.handler()
      const result = (await handlerInstance.createSession({
        headers: mockHeaders,
        body: { workingDirectory: '/test/dir' },
      })) as CreateSessionResponse

      expect(result.status).toBe(201)
      if (result.status === 201) {
        expect(result.body.createdAt).toBe('2024-01-01T00:00:00.000Z')
        expect(result.body.updatedAt).toBe('2024-01-01T00:00:00.000Z')
        expect(typeof result.body.createdAt).toBe('string')
        expect(typeof result.body.updatedAt).toBe('string')
      }
    })

    it('should preserve all other session properties', async () => {
      const mockSession = createMockSession({
        metadata: {
          clientId: 'test-client',
          tags: ['test'],
          description: 'Test description',
        },
      })
      sessionService.getSession.mockReturnValue(mockSession)

      // Test serialization through the getSession endpoint
      const handlerInstance = controller.handler()
      const result = (await handlerInstance.getSession({
        params: { id: mockSession.id },
        headers: mockHeaders,
      })) as GetSessionResponse

      expect(result.status).toBe(200)
      if (result.status === 200) {
        expect(result.body.id).toBe(mockSession.id)
        expect(result.body.status).toBe(mockSession.status)
        expect(result.body.workingDirectory).toBe(mockSession.workingDirectory)
        expect(result.body.metadata).toEqual(mockSession.metadata)
      }
    })
  })
})
