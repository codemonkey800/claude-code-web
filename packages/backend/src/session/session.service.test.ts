import { randomUUID } from 'node:crypto'

import { INTERNAL_EVENTS, SessionStatus, sleep } from '@claude-code-web/shared'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Test, TestingModule } from '@nestjs/testing'

import { FileSystemService } from 'src/filesystem/filesystem.service'
import { ClaudeCodeSubprocessService } from 'src/modules/claude-code/claude-code-subprocess.service'

import { SessionService } from './session.service'

// Mock the crypto module
jest.mock('node:crypto', () => ({
  randomUUID: jest.fn(),
}))

describe('SessionService', () => {
  let service: SessionService
  let mockEventEmitter: { emit: jest.Mock }

  beforeEach(async () => {
    const mockFileSystemService = {
      validatePath: jest.fn().mockImplementation((path: string) =>
        Promise.resolve({
          valid: true,
          isDirectory: true,
          resolvedPath: path,
        }),
      ),
    }

    mockEventEmitter = {
      emit: jest.fn(),
    }

    const mockClaudeCodeService = {
      initialize: jest.fn().mockResolvedValue(undefined),
      shutdown: jest.fn().mockResolvedValue(undefined),
      executeQuery: jest.fn().mockResolvedValue({
        queryId: 'mock-query-id',
        sessionId: 'mock-session-id',
        status: 'success',
        duration: 1000,
      }),
      cancelQuery: jest.fn(),
      getQueryState: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        {
          provide: FileSystemService,
          useValue: mockFileSystemService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        {
          provide: ClaudeCodeSubprocessService,
          useValue: mockClaudeCodeService,
        },
      ],
    }).compile()

    service = module.get<SessionService>(SessionService)
    jest.clearAllMocks()
  })

  describe('createSession', () => {
    it('should create a session with UUID', async () => {
      const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
      ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

      const payload = { workingDirectory: '/test/dir' }
      const session = await service.createSession(payload)

      expect(session.id).toBe(mockUuid)
      expect(randomUUID).toHaveBeenCalledTimes(1)
    })

    it('should set status to INITIALIZING by default', async () => {
      const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
      ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

      const payload = { workingDirectory: '/test/dir' }
      const session = await service.createSession(payload)

      expect(session.status).toBe(SessionStatus.INITIALIZING)
    })

    it('should use provided workingDirectory', async () => {
      const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
      ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

      const testDir = '/custom/test/directory'
      const payload = { workingDirectory: testDir }
      const session = await service.createSession(payload)

      expect(session.workingDirectory).toBe(testDir)
    })

    it('should default to process.cwd() when workingDirectory not provided', async () => {
      const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
      ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

      const payload = {}
      const session = await service.createSession(payload)

      expect(session.workingDirectory).toBe(process.cwd())
    })

    it('should set createdAt and updatedAt timestamps', async () => {
      const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
      ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

      const beforeCreation = new Date()
      const payload = { workingDirectory: '/test/dir' }
      const session = await service.createSession(payload)
      const afterCreation = new Date()

      expect(session.createdAt).toBeInstanceOf(Date)
      expect(session.updatedAt).toBeInstanceOf(Date)
      expect(session.createdAt.getTime()).toBeGreaterThanOrEqual(
        beforeCreation.getTime(),
      )
      expect(session.createdAt.getTime()).toBeLessThanOrEqual(
        afterCreation.getTime(),
      )
      expect(session.createdAt).toEqual(session.updatedAt)
    })

    it('should store metadata if provided', async () => {
      const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
      ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

      const metadata = {
        clientId: 'test-client',
        tags: ['frontend', 'typescript'],
        description: 'Test session',
      }
      const payload = { workingDirectory: '/test/dir', metadata }
      const session = await service.createSession(payload)

      expect(session.metadata?.clientId).toBe(metadata.clientId)
      expect(session.metadata?.tags).toEqual(metadata.tags)
      expect(session.metadata?.description).toBe(metadata.description)
      // Verify automatic metadata fields are also present
      expect(session.metadata?.errorLog).toEqual([])
      expect(session.metadata?.errorCount).toBe(0)
      expect(session.metadata?.lastActivityAt).toBeInstanceOf(Date)
    })

    it('should increment session count', async () => {
      const mockUuid1 = '550e8400-e29b-41d4-a716-446655440000'
      const mockUuid2 = '550e8400-e29b-41d4-a716-446655440001'
      ;(randomUUID as jest.Mock)
        .mockReturnValueOnce(mockUuid1)
        .mockReturnValueOnce(mockUuid2)

      const initialCount = service.getSessionCount()

      await service.createSession({ workingDirectory: '/test/dir1' })
      expect(service.getSessionCount()).toBe(initialCount + 1)

      await service.createSession({ workingDirectory: '/test/dir2' })
      expect(service.getSessionCount()).toBe(initialCount + 2)
    })
  })

  describe('getSession', () => {
    it('should return existing session by ID', async () => {
      const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
      ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

      const payload = { workingDirectory: '/test/dir' }
      const createdSession = await service.createSession(payload)

      const retrievedSession = service.getSession(mockUuid)

      // getSession adds sessionDuration dynamically
      expect(retrievedSession?.id).toBe(createdSession.id)
      expect(retrievedSession?.status).toBe(createdSession.status)
      expect(retrievedSession?.workingDirectory).toBe(
        createdSession.workingDirectory,
      )
      expect(retrievedSession?.metadata?.sessionDuration).toBeDefined()
    })

    it('should return null for non-existent session', () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440099'
      const session = service.getSession(nonExistentId)

      expect(session).toBeNull()
    })
  })

  describe('getAllSessions', () => {
    it('should return empty array when no sessions exist', () => {
      const sessions = service.getAllSessions()

      expect(sessions).toEqual([])
      expect(Array.isArray(sessions)).toBe(true)
    })

    it('should return all sessions', async () => {
      const mockUuid1 = '550e8400-e29b-41d4-a716-446655440000'
      const mockUuid2 = '550e8400-e29b-41d4-a716-446655440001'
      ;(randomUUID as jest.Mock)
        .mockReturnValueOnce(mockUuid1)
        .mockReturnValueOnce(mockUuid2)

      const session1 = await service.createSession({
        workingDirectory: '/test/dir1',
      })
      const session2 = await service.createSession({
        workingDirectory: '/test/dir2',
      })

      const allSessions = service.getAllSessions()

      expect(allSessions).toHaveLength(2)
      expect(allSessions).toContainEqual(session1)
      expect(allSessions).toContainEqual(session2)
    })

    it('should return independent array (not modify internal state)', async () => {
      const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
      ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

      await service.createSession({ workingDirectory: '/test/dir' })

      const sessions1 = service.getAllSessions()
      const sessions2 = service.getAllSessions()

      expect(sessions1).not.toBe(sessions2) // Different array instances
      expect(sessions1).toEqual(sessions2) // But same content
    })
  })

  describe('updateSessionStatus', () => {
    it('should update session status successfully for valid transitions', async () => {
      const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
      ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

      await service.createSession({ workingDirectory: '/test/dir' })

      const updatedSession = service.updateSessionStatus(
        mockUuid,
        SessionStatus.ACTIVE,
      )

      expect(updatedSession).not.toBeNull()
      expect(updatedSession?.status).toBe(SessionStatus.ACTIVE)
    })

    it('should update updatedAt timestamp', async () => {
      const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
      ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

      const session = await service.createSession({
        workingDirectory: '/test/dir',
      })
      const originalUpdatedAt = session.updatedAt

      // Wait a bit to ensure timestamp difference
      await sleep(10)

      const updatedSession = service.updateSessionStatus(
        mockUuid,
        SessionStatus.ACTIVE,
      )

      expect(updatedSession?.updatedAt).not.toEqual(originalUpdatedAt)
      expect(updatedSession?.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime(),
      )
    })

    it('should return null for non-existent session', () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440099'
      const result = service.updateSessionStatus(
        nonExistentId,
        SessionStatus.ACTIVE,
      )

      expect(result).toBeNull()
    })

    it('should emit event on successful status update', async () => {
      const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
      ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

      await service.createSession({
        workingDirectory: '/test/dir',
      })

      service.updateSessionStatus(mockUuid, SessionStatus.ACTIVE)

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        INTERNAL_EVENTS.SESSION_STATUS_CHANGED,
        expect.objectContaining({
          sessionId: mockUuid,
          oldStatus: SessionStatus.INITIALIZING,
          newStatus: SessionStatus.ACTIVE,
          session: expect.objectContaining({
            id: mockUuid,
            status: SessionStatus.ACTIVE,
          }) as unknown,
        }),
      )
    })

    it('should not emit event for invalid transitions', async () => {
      const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
      ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

      await service.createSession({ workingDirectory: '/test/dir' })
      service.updateSessionStatus(mockUuid, SessionStatus.TERMINATED)

      mockEventEmitter.emit.mockClear()

      // Try to transition from TERMINATED (should fail)
      const result = service.updateSessionStatus(mockUuid, SessionStatus.ACTIVE)

      expect(result).toBeNull()
      expect(mockEventEmitter.emit).not.toHaveBeenCalled()
    })

    describe('state transitions', () => {
      it('should allow INITIALIZING -> ACTIVE', async () => {
        const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
        ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

        await service.createSession({ workingDirectory: '/test/dir' })

        const result = service.updateSessionStatus(
          mockUuid,
          SessionStatus.ACTIVE,
        )

        expect(result).not.toBeNull()
        expect(result?.status).toBe(SessionStatus.ACTIVE)
      })

      it('should allow INITIALIZING -> TERMINATED', async () => {
        const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
        ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

        await service.createSession({ workingDirectory: '/test/dir' })

        const result = service.updateSessionStatus(
          mockUuid,
          SessionStatus.TERMINATED,
        )

        expect(result).not.toBeNull()
        expect(result?.status).toBe(SessionStatus.TERMINATED)
      })

      it('should allow ACTIVE -> TERMINATED', async () => {
        const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
        ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

        await service.createSession({ workingDirectory: '/test/dir' })
        service.updateSessionStatus(mockUuid, SessionStatus.ACTIVE)

        const result = service.updateSessionStatus(
          mockUuid,
          SessionStatus.TERMINATED,
        )

        expect(result).not.toBeNull()
        expect(result?.status).toBe(SessionStatus.TERMINATED)
      })

      it('should reject TERMINATED -> ACTIVE', async () => {
        const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
        ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

        await service.createSession({ workingDirectory: '/test/dir' })
        service.updateSessionStatus(mockUuid, SessionStatus.TERMINATED)

        const result = service.updateSessionStatus(
          mockUuid,
          SessionStatus.ACTIVE,
        )

        expect(result).toBeNull()
      })

      it('should reject TERMINATED -> INITIALIZING', async () => {
        const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
        ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

        await service.createSession({ workingDirectory: '/test/dir' })
        service.updateSessionStatus(mockUuid, SessionStatus.TERMINATED)

        const result = service.updateSessionStatus(
          mockUuid,
          SessionStatus.INITIALIZING,
        )

        expect(result).toBeNull()
      })

      it('should reject ACTIVE -> INITIALIZING', async () => {
        const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
        ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

        await service.createSession({ workingDirectory: '/test/dir' })
        service.updateSessionStatus(mockUuid, SessionStatus.ACTIVE)

        const result = service.updateSessionStatus(
          mockUuid,
          SessionStatus.INITIALIZING,
        )

        expect(result).toBeNull()
      })
    })
  })

  describe('startSession', () => {
    it('should successfully transition INITIALIZING -> ACTIVE', async () => {
      const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
      ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

      await service.createSession({ workingDirectory: '/test/dir' })

      const result = await service.startSession(mockUuid)

      expect(result.status).toBe(SessionStatus.ACTIVE)
      expect(result.id).toBe(mockUuid)
    })

    it('should update updatedAt timestamp', async () => {
      const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
      ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

      const session = await service.createSession({
        workingDirectory: '/test/dir',
      })
      const originalUpdatedAt = session.updatedAt

      // Wait a bit to ensure timestamp difference
      await sleep(10)

      const result = await service.startSession(mockUuid)

      expect(result.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime(),
      )
    })

    it('should throw error if session not found', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440099'

      await expect(service.startSession(nonExistentId)).rejects.toThrow(
        'Cannot start session - session not found',
      )
    })

    it('should throw error if session is already ACTIVE', async () => {
      const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
      ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

      await service.createSession({ workingDirectory: '/test/dir' })
      await service.startSession(mockUuid)

      await expect(service.startSession(mockUuid)).rejects.toThrow(
        'must be in INITIALIZING state',
      )
    })

    it('should throw error if session is TERMINATED', async () => {
      const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
      ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

      await service.createSession({ workingDirectory: '/test/dir' })
      service.updateSessionStatus(mockUuid, SessionStatus.TERMINATED)

      await expect(service.startSession(mockUuid)).rejects.toThrow(
        'must be in INITIALIZING state',
      )
    })

    it('should emit SESSION_STATUS_CHANGED event on success', async () => {
      const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
      ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

      await service.createSession({ workingDirectory: '/test/dir' })

      await service.startSession(mockUuid)

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        INTERNAL_EVENTS.SESSION_STATUS_CHANGED,
        expect.objectContaining({
          sessionId: mockUuid,
          oldStatus: SessionStatus.INITIALIZING,
          newStatus: SessionStatus.ACTIVE,
        }),
      )
    })

    describe('error handling', () => {
      it('should transition to TERMINATED when initialization fails', async () => {
        const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
        ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

        await service.createSession({ workingDirectory: '/test/dir' })

        // Mock updateSessionStatus to simulate initialization failure
        const originalUpdateStatus = service.updateSessionStatus.bind(service)
        let callCount = 0
        jest
          .spyOn(service, 'updateSessionStatus')
          .mockImplementation((id, status) => {
            callCount++
            // First call tries to set ACTIVE but we'll make it fail
            if (callCount === 1) {
              return null // Simulate failure
            }
            // Second call sets TERMINATED (error recovery)
            return originalUpdateStatus(id, status)
          })

        await expect(service.startSession(mockUuid)).rejects.toThrow(
          'Failed to transition session to ACTIVE',
        )

        // Verify session is in TERMINATED state after error
        const session = service.getSession(mockUuid)
        expect(session?.status).toBe(SessionStatus.TERMINATED)
      })

      it('should emit SESSION_STATUS_CHANGED to TERMINATED on failure', async () => {
        const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
        ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

        await service.createSession({ workingDirectory: '/test/dir' })

        // Mock updateSessionStatus to fail on first call (ACTIVE), succeed on second (TERMINATED)
        const originalUpdateStatus = service.updateSessionStatus.bind(service)
        let callCount = 0
        jest
          .spyOn(service, 'updateSessionStatus')
          .mockImplementation((id, status) => {
            callCount++
            if (callCount === 1) {
              return null
            }
            return originalUpdateStatus(id, status)
          })

        mockEventEmitter.emit.mockClear()

        try {
          await service.startSession(mockUuid)
        } catch {
          // Expected to throw
        }

        // Should have emitted status change to TERMINATED
        expect(mockEventEmitter.emit).toHaveBeenCalledWith(
          INTERNAL_EVENTS.SESSION_STATUS_CHANGED,
          expect.objectContaining({
            sessionId: mockUuid,
            oldStatus: SessionStatus.INITIALIZING,
            newStatus: SessionStatus.TERMINATED,
          }),
        )
      })

      it('should re-throw error after transitioning to TERMINATED', async () => {
        const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
        ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

        await service.createSession({ workingDirectory: '/test/dir' })

        // Mock updateSessionStatus to fail
        jest.spyOn(service, 'updateSessionStatus').mockReturnValue(null)

        await expect(service.startSession(mockUuid)).rejects.toThrow()
      })
    })
  })

  describe('stopSession', () => {
    it('should successfully transition INITIALIZING -> TERMINATED', async () => {
      const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
      ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

      await service.createSession({ workingDirectory: '/test/dir' })

      const result = await service.stopSession(mockUuid)

      expect(result.status).toBe(SessionStatus.TERMINATED)
      expect(result.id).toBe(mockUuid)
    })

    it('should successfully transition ACTIVE -> TERMINATED', async () => {
      const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
      ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

      await service.createSession({ workingDirectory: '/test/dir' })
      await service.startSession(mockUuid)

      const result = await service.stopSession(mockUuid)

      expect(result.status).toBe(SessionStatus.TERMINATED)
      expect(result.id).toBe(mockUuid)
    })

    it('should return session if already TERMINATED (idempotent)', async () => {
      const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
      ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

      await service.createSession({ workingDirectory: '/test/dir' })
      await service.stopSession(mockUuid)

      mockEventEmitter.emit.mockClear()

      const result = await service.stopSession(mockUuid)

      expect(result.status).toBe(SessionStatus.TERMINATED)
      // Should not emit event on second call (idempotent)
      expect(mockEventEmitter.emit).not.toHaveBeenCalled()
    })

    it('should update updatedAt timestamp when transitioning', async () => {
      const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
      ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

      const session = await service.createSession({
        workingDirectory: '/test/dir',
      })
      const originalUpdatedAt = session.updatedAt

      // Wait a bit to ensure timestamp difference
      await sleep(10)

      const result = await service.stopSession(mockUuid)

      expect(result.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime(),
      )
    })

    it('should throw error if session not found', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440099'

      await expect(service.stopSession(nonExistentId)).rejects.toThrow(
        'Cannot stop session - session not found',
      )
    })

    it('should emit SESSION_STATUS_CHANGED event when transitioning', async () => {
      const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
      ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

      await service.createSession({ workingDirectory: '/test/dir' })

      await service.stopSession(mockUuid)

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        INTERNAL_EVENTS.SESSION_STATUS_CHANGED,
        expect.objectContaining({
          sessionId: mockUuid,
          oldStatus: SessionStatus.INITIALIZING,
          newStatus: SessionStatus.TERMINATED,
        }),
      )
    })

    describe('error handling', () => {
      it('should force transition to TERMINATED when shutdown fails', async () => {
        const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
        ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

        await service.createSession({ workingDirectory: '/test/dir' })

        // Mock updateSessionStatus to fail on first call, succeed on second
        const originalUpdateStatus = service.updateSessionStatus.bind(service)
        let callCount = 0
        jest
          .spyOn(service, 'updateSessionStatus')
          .mockImplementation((id, status) => {
            callCount++
            // First call fails (simulating error during shutdown)
            if (callCount === 1) {
              return null
            }
            // Second call succeeds (forced termination)
            return originalUpdateStatus(id, status)
          })

        const result = await service.stopSession(mockUuid)

        expect(result.status).toBe(SessionStatus.TERMINATED)
        expect(result.id).toBe(mockUuid)
      })

      it('should return session after forced termination on error', async () => {
        const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
        ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

        await service.createSession({ workingDirectory: '/test/dir' })

        // Mock to fail first, succeed second
        const originalUpdateStatus = service.updateSessionStatus.bind(service)
        let callCount = 0
        jest
          .spyOn(service, 'updateSessionStatus')
          .mockImplementation((id, status) => {
            callCount++
            if (callCount === 1) {
              return null
            }
            return originalUpdateStatus(id, status)
          })

        const result = await service.stopSession(mockUuid)

        // Should return successfully even after error
        expect(result).toBeDefined()
        expect(result.status).toBe(SessionStatus.TERMINATED)

        // Verify session is actually terminated
        const session = service.getSession(mockUuid)
        expect(session?.status).toBe(SessionStatus.TERMINATED)
      })

      it('should throw error if forced termination also fails', async () => {
        const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
        ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

        await service.createSession({ workingDirectory: '/test/dir' })

        // Mock updateSessionStatus to always fail
        jest.spyOn(service, 'updateSessionStatus').mockReturnValue(null)

        await expect(service.stopSession(mockUuid)).rejects.toThrow(
          'Failed to transition session to TERMINATED',
        )
      })
    })
  })

  describe('deleteSession', () => {
    it('should stop and delete INITIALIZING session', async () => {
      const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
      ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

      await service.createSession({ workingDirectory: '/test/dir' })

      const result = await service.deleteSession(mockUuid)

      expect(result).toBe(true)

      // Verify session is actually deleted
      const session = service.getSession(mockUuid)
      expect(session).toBeNull()
    })

    it('should stop and delete ACTIVE session', async () => {
      const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
      ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

      await service.createSession({ workingDirectory: '/test/dir' })
      await service.startSession(mockUuid)

      const result = await service.deleteSession(mockUuid)

      expect(result).toBe(true)

      // Verify session is actually deleted
      const session = service.getSession(mockUuid)
      expect(session).toBeNull()
    })

    it('should directly delete TERMINATED session without calling stopSession', async () => {
      const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
      ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

      await service.createSession({ workingDirectory: '/test/dir' })
      await service.stopSession(mockUuid)

      // Clear previous event emissions
      mockEventEmitter.emit.mockClear()

      const result = await service.deleteSession(mockUuid)

      expect(result).toBe(true)
      // Should only emit SESSION_DELETED, not SESSION_STATUS_CHANGED
      expect(mockEventEmitter.emit).toHaveBeenCalledTimes(1)
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        INTERNAL_EVENTS.SESSION_DELETED,
        {
          sessionId: mockUuid,
          reason: 'Deleted via REST API',
        },
      )
    })

    it('should emit SESSION_DELETED event from service', async () => {
      const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
      ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

      await service.createSession({ workingDirectory: '/test/dir' })

      await service.deleteSession(mockUuid)

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        INTERNAL_EVENTS.SESSION_DELETED,
        {
          sessionId: mockUuid,
          reason: 'Deleted via REST API',
        },
      )
    })

    it('should return false for non-existent session', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440099'
      const result = await service.deleteSession(nonExistentId)

      expect(result).toBe(false)
    })

    it('should decrement session count', async () => {
      const mockUuid1 = '550e8400-e29b-41d4-a716-446655440000'
      const mockUuid2 = '550e8400-e29b-41d4-a716-446655440001'
      ;(randomUUID as jest.Mock)
        .mockReturnValueOnce(mockUuid1)
        .mockReturnValueOnce(mockUuid2)

      await service.createSession({ workingDirectory: '/test/dir1' })
      await service.createSession({ workingDirectory: '/test/dir2' })

      const countBefore = service.getSessionCount()

      await service.deleteSession(mockUuid1)

      expect(service.getSessionCount()).toBe(countBefore - 1)
    })
  })

  describe('getSessionCount', () => {
    it('should return 0 initially', () => {
      const count = service.getSessionCount()

      expect(count).toBe(0)
    })

    it('should return correct count after operations', async () => {
      const mockUuid1 = '550e8400-e29b-41d4-a716-446655440000'
      const mockUuid2 = '550e8400-e29b-41d4-a716-446655440001'
      const mockUuid3 = '550e8400-e29b-41d4-a716-446655440002'
      ;(randomUUID as jest.Mock)
        .mockReturnValueOnce(mockUuid1)
        .mockReturnValueOnce(mockUuid2)
        .mockReturnValueOnce(mockUuid3)

      expect(service.getSessionCount()).toBe(0)

      await service.createSession({ workingDirectory: '/test/dir1' })
      expect(service.getSessionCount()).toBe(1)

      await service.createSession({ workingDirectory: '/test/dir2' })
      expect(service.getSessionCount()).toBe(2)

      await service.createSession({ workingDirectory: '/test/dir3' })
      expect(service.getSessionCount()).toBe(3)
    })

    it('should update after create/delete operations', async () => {
      const mockUuid1 = '550e8400-e29b-41d4-a716-446655440000'
      const mockUuid2 = '550e8400-e29b-41d4-a716-446655440001'
      ;(randomUUID as jest.Mock)
        .mockReturnValueOnce(mockUuid1)
        .mockReturnValueOnce(mockUuid2)

      await service.createSession({ workingDirectory: '/test/dir1' })
      await service.createSession({ workingDirectory: '/test/dir2' })
      expect(service.getSessionCount()).toBe(2)

      await service.deleteSession(mockUuid1)
      expect(service.getSessionCount()).toBe(1)

      await service.deleteSession(mockUuid2)
      expect(service.getSessionCount()).toBe(0)
    })
  })

  describe('metadata tracking', () => {
    describe('recordError', () => {
      it('should record an error in the error log', async () => {
        const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
        ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

        await service.createSession({ workingDirectory: '/test/dir' })

        const result = service.recordError(mockUuid, {
          message: 'Test error',
          code: 'TEST_ERROR',
          context: 'test.context',
          details: { foo: 'bar' },
        })

        expect(result).toBe(true)

        const session = service.getSession(mockUuid)
        expect(session?.metadata?.errorLog).toHaveLength(1)
        expect(session?.metadata?.errorLog?.[0]).toMatchObject({
          message: 'Test error',
          code: 'TEST_ERROR',
          context: 'test.context',
          details: { foo: 'bar' },
        })
        expect(session?.metadata?.errorLog?.[0].timestamp).toBeInstanceOf(Date)
      })

      it('should increment error count', async () => {
        const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
        ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

        await service.createSession({ workingDirectory: '/test/dir' })

        service.recordError(mockUuid, { message: 'Error 1' })
        service.recordError(mockUuid, { message: 'Error 2' })
        service.recordError(mockUuid, { message: 'Error 3' })

        const session = service.getSession(mockUuid)
        expect(session?.metadata?.errorCount).toBe(3)
        expect(session?.metadata?.errorLog).toHaveLength(3)
      })

      it('should update lastErrorAt timestamp', async () => {
        const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
        ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

        await service.createSession({ workingDirectory: '/test/dir' })

        const beforeError = new Date()
        service.recordError(mockUuid, { message: 'Test error' })
        const afterError = new Date()

        const session = service.getSession(mockUuid)
        expect(session?.metadata?.lastErrorAt).toBeInstanceOf(Date)
        expect(
          session?.metadata?.lastErrorAt?.getTime(),
        ).toBeGreaterThanOrEqual(beforeError.getTime())
        expect(session?.metadata?.lastErrorAt?.getTime()).toBeLessThanOrEqual(
          afterError.getTime(),
        )
      })

      it('should prune old errors when exceeding max size', async () => {
        const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
        ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

        await service.createSession({
          workingDirectory: '/test/dir',
          metadata: {
            configuration: {
              maxErrorLogSize: 3,
            },
          },
        })

        // Add 5 errors (should keep only last 3)
        service.recordError(mockUuid, { message: 'Error 1' })
        service.recordError(mockUuid, { message: 'Error 2' })
        service.recordError(mockUuid, { message: 'Error 3' })
        service.recordError(mockUuid, { message: 'Error 4' })
        service.recordError(mockUuid, { message: 'Error 5' })

        const session = service.getSession(mockUuid)
        expect(session?.metadata?.errorLog).toHaveLength(3)
        expect(session?.metadata?.errorCount).toBe(5) // Total count should still be 5
        // Should have kept the last 3 errors
        expect(session?.metadata?.errorLog?.[0].message).toBe('Error 3')
        expect(session?.metadata?.errorLog?.[1].message).toBe('Error 4')
        expect(session?.metadata?.errorLog?.[2].message).toBe('Error 5')
      })

      it('should use default max size of 50 when not configured', async () => {
        const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
        ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

        await service.createSession({ workingDirectory: '/test/dir' })

        // Add 52 errors
        for (let i = 1; i <= 52; i++) {
          service.recordError(mockUuid, { message: `Error ${i}` })
        }

        const session = service.getSession(mockUuid)
        expect(session?.metadata?.errorLog).toHaveLength(50)
        expect(session?.metadata?.errorCount).toBe(52)
        // Should have kept errors 3-52
        expect(session?.metadata?.errorLog?.[0].message).toBe('Error 3')
        expect(session?.metadata?.errorLog?.[49].message).toBe('Error 52')
      })

      it('should return false for non-existent session', () => {
        const nonExistentId = '550e8400-e29b-41d4-a716-446655440099'
        const result = service.recordError(nonExistentId, {
          message: 'Test error',
        })

        expect(result).toBe(false)
      })

      it('should update session updatedAt timestamp', async () => {
        const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
        ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

        const session = await service.createSession({
          workingDirectory: '/test/dir',
        })
        const originalUpdatedAt = session.updatedAt

        await sleep(10)

        service.recordError(mockUuid, { message: 'Test error' })

        const updatedSession = service.getSession(mockUuid)
        expect(updatedSession?.updatedAt.getTime()).toBeGreaterThan(
          originalUpdatedAt.getTime(),
        )
      })
    })

    describe('recordActivity', () => {
      it('should update lastActivityAt timestamp', async () => {
        const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
        ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

        const session = await service.createSession({
          workingDirectory: '/test/dir',
        })
        const originalActivityAt = session.metadata?.lastActivityAt

        await sleep(10)

        const result = service.recordActivity(mockUuid)

        expect(result).toBe(true)

        const updatedSession = service.getSession(mockUuid)
        expect(updatedSession?.metadata?.lastActivityAt).toBeInstanceOf(Date)
        expect(
          updatedSession?.metadata?.lastActivityAt?.getTime(),
        ).toBeGreaterThan(originalActivityAt?.getTime() ?? 0)
      })

      it('should update session updatedAt timestamp', async () => {
        const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
        ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

        const session = await service.createSession({
          workingDirectory: '/test/dir',
        })
        const originalUpdatedAt = session.updatedAt

        await sleep(10)

        service.recordActivity(mockUuid)

        const updatedSession = service.getSession(mockUuid)
        expect(updatedSession?.updatedAt.getTime()).toBeGreaterThan(
          originalUpdatedAt.getTime(),
        )
      })

      it('should return false for non-existent session', () => {
        const nonExistentId = '550e8400-e29b-41d4-a716-446655440099'
        const result = service.recordActivity(nonExistentId)

        expect(result).toBe(false)
      })
    })

    describe('getSessionDuration', () => {
      it('should calculate session duration in milliseconds', async () => {
        const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
        ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

        await service.createSession({ workingDirectory: '/test/dir' })

        await sleep(50)

        const duration = service.getSessionDuration(mockUuid)

        expect(duration).not.toBeNull()
        expect(duration).toBeGreaterThanOrEqual(50)
        expect(duration).toBeLessThan(200) // Should be less than 200ms
      })

      it('should return null for non-existent session', () => {
        const nonExistentId = '550e8400-e29b-41d4-a716-446655440099'
        const duration = service.getSessionDuration(nonExistentId)

        expect(duration).toBeNull()
      })

      it('should increase over time', async () => {
        const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
        ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

        await service.createSession({ workingDirectory: '/test/dir' })

        const duration1 = service.getSessionDuration(mockUuid)
        await sleep(50)
        const duration2 = service.getSessionDuration(mockUuid)

        expect(duration1).not.toBeNull()
        expect(duration2).not.toBeNull()

        if (duration1 !== null && duration2 !== null) {
          expect(duration2).toBeGreaterThan(duration1)
        }
      })
    })

    describe('metadata initialization', () => {
      it('should initialize errorLog as empty array on creation', async () => {
        const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
        ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

        const session = await service.createSession({
          workingDirectory: '/test/dir',
        })

        expect(session.metadata?.errorLog).toEqual([])
        expect(Array.isArray(session.metadata?.errorLog)).toBe(true)
      })

      it('should initialize errorCount as 0 on creation', async () => {
        const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
        ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

        const session = await service.createSession({
          workingDirectory: '/test/dir',
        })

        expect(session.metadata?.errorCount).toBe(0)
      })

      it('should initialize lastActivityAt on creation', async () => {
        const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
        ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

        const beforeCreate = new Date()
        const session = await service.createSession({
          workingDirectory: '/test/dir',
        })
        const afterCreate = new Date()

        expect(session.metadata?.lastActivityAt).toBeInstanceOf(Date)
        expect(
          session.metadata?.lastActivityAt?.getTime(),
        ).toBeGreaterThanOrEqual(beforeCreate.getTime())
        expect(session.metadata?.lastActivityAt?.getTime()).toBeLessThanOrEqual(
          afterCreate.getTime(),
        )
      })

      it('should preserve provided metadata when initializing', async () => {
        const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
        ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

        const session = await service.createSession({
          workingDirectory: '/test/dir',
          metadata: {
            clientId: 'test-client',
            tags: ['test'],
            description: 'Test session',
          },
        })

        expect(session.metadata?.clientId).toBe('test-client')
        expect(session.metadata?.tags).toEqual(['test'])
        expect(session.metadata?.description).toBe('Test session')
        expect(session.metadata?.errorLog).toEqual([])
        expect(session.metadata?.errorCount).toBe(0)
        expect(session.metadata?.lastActivityAt).toBeInstanceOf(Date)
      })
    })

    describe('getSession duration calculation', () => {
      it('should include sessionDuration in returned session', async () => {
        const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
        ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

        await service.createSession({ workingDirectory: '/test/dir' })

        await sleep(50)

        const session = service.getSession(mockUuid)

        expect(session?.metadata?.sessionDuration).toBeDefined()
        expect(session?.metadata?.sessionDuration).toBeGreaterThanOrEqual(50)
      })
    })

    describe('activity tracking integration', () => {
      it('should track activity on status updates', async () => {
        const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
        ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

        const session = await service.createSession({
          workingDirectory: '/test/dir',
        })
        const initialActivityAt = session.metadata?.lastActivityAt

        await sleep(10)

        service.updateSessionStatus(mockUuid, SessionStatus.ACTIVE)

        const updatedSession = service.getSession(mockUuid)
        expect(
          updatedSession?.metadata?.lastActivityAt?.getTime(),
        ).toBeGreaterThan(initialActivityAt?.getTime() ?? 0)
      })
    })
  })

  describe('message storage', () => {
    describe('handleClaudeMessage', () => {
      it('should store messages in session history', async () => {
        const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
        ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

        await service.createSession({ workingDirectory: '/test/dir' })

        const testMessage = {
          type: 'assistant',
          content: 'Hello, world!',
        }

        service.handleClaudeMessage({
          sessionId: mockUuid,
          queryId: 'query-1',
          message: testMessage,
        })

        const session = service.getSession(mockUuid)
        expect(session?.messages).toHaveLength(1)
        expect(session?.messages?.[0]).toEqual(testMessage)
      })

      it('should store multiple messages in order', async () => {
        const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
        ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

        await service.createSession({ workingDirectory: '/test/dir' })

        const message1 = { type: 'user', content: 'First message' }
        const message2 = { type: 'assistant', content: 'Second message' }
        const message3 = { type: 'system', content: 'Third message' }

        service.handleClaudeMessage({
          sessionId: mockUuid,
          queryId: 'query-1',
          message: message1,
        })
        service.handleClaudeMessage({
          sessionId: mockUuid,
          queryId: 'query-1',
          message: message2,
        })
        service.handleClaudeMessage({
          sessionId: mockUuid,
          queryId: 'query-1',
          message: message3,
        })

        const session = service.getSession(mockUuid)
        expect(session?.messages).toHaveLength(3)
        expect(session?.messages?.[0]).toEqual(message1)
        expect(session?.messages?.[1]).toEqual(message2)
        expect(session?.messages?.[2]).toEqual(message3)
      })

      it('should prune old messages when exceeding maxMessageHistory', async () => {
        const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
        ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

        await service.createSession({
          workingDirectory: '/test/dir',
          metadata: {
            configuration: {
              maxMessageHistory: 3,
            },
          },
        })

        // Add 5 messages (should keep only last 3)
        for (let i = 1; i <= 5; i++) {
          service.handleClaudeMessage({
            sessionId: mockUuid,
            queryId: 'query-1',
            message: { type: 'assistant', content: `Message ${i}` },
          })
        }

        const session = service.getSession(mockUuid)
        expect(session?.messages).toHaveLength(3)
        // Should have kept the last 3 messages
        expect(session?.messages?.[0]).toEqual({
          type: 'assistant',
          content: 'Message 3',
        })
        expect(session?.messages?.[1]).toEqual({
          type: 'assistant',
          content: 'Message 4',
        })
        expect(session?.messages?.[2]).toEqual({
          type: 'assistant',
          content: 'Message 5',
        })
      })

      it('should use default maxMessageHistory of 1000 when not configured', async () => {
        const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
        ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

        await service.createSession({ workingDirectory: '/test/dir' })

        // Add 1002 messages
        for (let i = 1; i <= 1002; i++) {
          service.handleClaudeMessage({
            sessionId: mockUuid,
            queryId: 'query-1',
            message: { type: 'assistant', content: `Message ${i}` },
          })
        }

        const session = service.getSession(mockUuid)
        expect(session?.messages).toHaveLength(1000)
        // Should have kept messages 3-1002
        expect(session?.messages?.[0]).toEqual({
          type: 'assistant',
          content: 'Message 3',
        })
        expect(session?.messages?.[999]).toEqual({
          type: 'assistant',
          content: 'Message 1002',
        })
      })

      it('should not store messages for non-existent session', () => {
        const nonExistentId = '550e8400-e29b-41d4-a716-446655440099'

        service.handleClaudeMessage({
          sessionId: nonExistentId,
          queryId: 'query-1',
          message: { type: 'assistant', content: 'Test' },
        })

        const session = service.getSession(nonExistentId)
        expect(session).toBeNull()
      })

      it('should update session updatedAt timestamp', async () => {
        const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
        ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

        const session = await service.createSession({
          workingDirectory: '/test/dir',
        })
        const originalUpdatedAt = session.updatedAt

        await sleep(10)

        service.handleClaudeMessage({
          sessionId: mockUuid,
          queryId: 'query-1',
          message: { type: 'assistant', content: 'Test' },
        })

        const updatedSession = service.getSession(mockUuid)
        expect(updatedSession?.updatedAt.getTime()).toBeGreaterThan(
          originalUpdatedAt.getTime(),
        )
      })

      it('should initialize messages array if not present', async () => {
        const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
        ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

        // Create session and manually remove messages array
        await service.createSession({ workingDirectory: '/test/dir' })
        const session = service.getSession(mockUuid)
        if (session) {
          delete session.messages
        }

        service.handleClaudeMessage({
          sessionId: mockUuid,
          queryId: 'query-1',
          message: { type: 'assistant', content: 'Test' },
        })

        const updatedSession = service.getSession(mockUuid)
        expect(updatedSession?.messages).toHaveLength(1)
      })

      it('should persist messages across multiple queries', async () => {
        const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
        ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

        await service.createSession({ workingDirectory: '/test/dir' })

        // First query messages
        service.handleClaudeMessage({
          sessionId: mockUuid,
          queryId: 'query-1',
          message: { type: 'user', content: 'Query 1' },
        })
        service.handleClaudeMessage({
          sessionId: mockUuid,
          queryId: 'query-1',
          message: { type: 'assistant', content: 'Response 1' },
        })

        // Second query messages
        service.handleClaudeMessage({
          sessionId: mockUuid,
          queryId: 'query-2',
          message: { type: 'user', content: 'Query 2' },
        })
        service.handleClaudeMessage({
          sessionId: mockUuid,
          queryId: 'query-2',
          message: { type: 'assistant', content: 'Response 2' },
        })

        const session = service.getSession(mockUuid)
        expect(session?.messages).toHaveLength(4)
      })
    })

    describe('message initialization', () => {
      it('should initialize messages as empty array on creation', async () => {
        const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
        ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

        const session = await service.createSession({
          workingDirectory: '/test/dir',
        })

        expect(session.messages).toEqual([])
        expect(Array.isArray(session.messages)).toBe(true)
      })

      it('should include messages array in getSession response', async () => {
        const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
        ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

        await service.createSession({ workingDirectory: '/test/dir' })

        service.handleClaudeMessage({
          sessionId: mockUuid,
          queryId: 'query-1',
          message: { type: 'assistant', content: 'Test' },
        })

        const session = service.getSession(mockUuid)
        expect(session?.messages).toBeDefined()
        expect(Array.isArray(session?.messages)).toBe(true)
      })
    })

    describe('sendQuery user prompt storage', () => {
      it('should store user prompt message when sending query', async () => {
        const mockSessionUuid = '550e8400-e29b-41d4-a716-446655440000'
        const mockMessageUuid = '660e8400-e29b-41d4-a716-446655440001'
        ;(randomUUID as jest.Mock)
          .mockReturnValueOnce(mockSessionUuid)
          .mockReturnValueOnce(mockMessageUuid)

        await service.createSession({ workingDirectory: '/test/dir' })
        await service.startSession(mockSessionUuid)

        await service.sendQuery(mockSessionUuid, {
          prompt: 'Test user prompt',
        })

        const session = service.getSession(mockSessionUuid)
        expect(session?.messages).toHaveLength(1)
        expect(session?.messages?.[0]).toMatchObject({
          type: 'user_prompt',
          message: {
            role: 'user',
            content: 'Test user prompt',
          },
          session_id: mockSessionUuid,
          uuid: mockMessageUuid,
        })
        expect(session?.messages?.[0].timestamp).toBeDefined()
      })

      it('should store user prompts with proper ClaudeUserPromptMessage structure', async () => {
        const mockSessionUuid = '550e8400-e29b-41d4-a716-446655440000'
        ;(randomUUID as jest.Mock).mockReturnValue(mockSessionUuid)

        await service.createSession({ workingDirectory: '/test/dir' })
        await service.startSession(mockSessionUuid)

        await service.sendQuery(mockSessionUuid, {
          prompt: 'Hello, Claude!',
        })

        const session = service.getSession(mockSessionUuid)
        const userMessage = session?.messages?.[0] as {
          type: string
          message: { role: string; content: string }
          timestamp: string
          session_id?: string
          uuid?: string
        }

        expect(userMessage).toBeDefined()
        expect(userMessage?.type).toBe('user_prompt')
        expect(userMessage?.message?.role).toBe('user')
        expect(userMessage?.message?.content).toBe('Hello, Claude!')
        expect(userMessage?.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
        expect(userMessage?.session_id).toBe(mockSessionUuid)
        expect(userMessage?.uuid).toBeDefined()
      })

      it('should store multiple user prompts in order', async () => {
        const mockSessionUuid = '550e8400-e29b-41d4-a716-446655440000'
        ;(randomUUID as jest.Mock).mockReturnValue(mockSessionUuid)

        await service.createSession({ workingDirectory: '/test/dir' })
        await service.startSession(mockSessionUuid)

        await service.sendQuery(mockSessionUuid, { prompt: 'First query' })
        await service.sendQuery(mockSessionUuid, { prompt: 'Second query' })
        await service.sendQuery(mockSessionUuid, { prompt: 'Third query' })

        const session = service.getSession(mockSessionUuid)
        expect(session?.messages).toHaveLength(3)
        expect(
          (
            session?.messages?.[0] as {
              message: { content: string }
            }
          ).message?.content,
        ).toBe('First query')
        expect(
          (
            session?.messages?.[1] as {
              message: { content: string }
            }
          ).message?.content,
        ).toBe('Second query')
        expect(
          (
            session?.messages?.[2] as {
              message: { content: string }
            }
          ).message?.content,
        ).toBe('Third query')
      })

      it('should prune user prompts when exceeding maxMessageHistory', async () => {
        const mockSessionUuid = '550e8400-e29b-41d4-a716-446655440000'
        ;(randomUUID as jest.Mock).mockReturnValue(mockSessionUuid)

        await service.createSession({
          workingDirectory: '/test/dir',
          metadata: {
            configuration: {
              maxMessageHistory: 3,
            },
          },
        })
        await service.startSession(mockSessionUuid)

        // Send 5 queries (should keep only last 3)
        for (let i = 1; i <= 5; i++) {
          await service.sendQuery(mockSessionUuid, {
            prompt: `Query ${i}`,
          })
        }

        const session = service.getSession(mockSessionUuid)
        expect(session?.messages).toHaveLength(3)
        expect(
          (
            session?.messages?.[0] as {
              message: { content: string }
            }
          ).message?.content,
        ).toBe('Query 3')
        expect(
          (
            session?.messages?.[1] as {
              message: { content: string }
            }
          ).message?.content,
        ).toBe('Query 4')
        expect(
          (
            session?.messages?.[2] as {
              message: { content: string }
            }
          ).message?.content,
        ).toBe('Query 5')
      })

      it('should not emit event for user prompt (no WebSocket broadcast)', async () => {
        const mockSessionUuid = '550e8400-e29b-41d4-a716-446655440000'
        ;(randomUUID as jest.Mock).mockReturnValue(mockSessionUuid)

        await service.createSession({ workingDirectory: '/test/dir' })
        await service.startSession(mockSessionUuid)

        // Clear any previous emit calls from session creation/start
        mockEventEmitter.emit.mockClear()

        await service.sendQuery(mockSessionUuid, {
          prompt: 'Test prompt',
        })

        // Should not emit CLAUDE_MESSAGE event for user prompt
        // Only Claude's messages should be broadcast via WebSocket
        const claudeMessageEmits = mockEventEmitter.emit.mock.calls.filter(
          (call: unknown[]) => call[0] === INTERNAL_EVENTS.CLAUDE_MESSAGE,
        )
        expect(claudeMessageEmits).toHaveLength(0)
      })

      it('should update session timestamp when storing user prompt', async () => {
        const mockSessionUuid = '550e8400-e29b-41d4-a716-446655440000'
        ;(randomUUID as jest.Mock).mockReturnValue(mockSessionUuid)

        await service.createSession({ workingDirectory: '/test/dir' })
        await service.startSession(mockSessionUuid)

        const session = service.getSession(mockSessionUuid)
        const originalUpdatedAt = session?.updatedAt

        await sleep(10)

        await service.sendQuery(mockSessionUuid, {
          prompt: 'Test prompt',
        })

        const updatedSession = service.getSession(mockSessionUuid)
        expect(updatedSession?.updatedAt.getTime()).toBeGreaterThan(
          originalUpdatedAt?.getTime() ?? 0,
        )
      })

      it('should persist user prompts alongside Claude messages', async () => {
        const mockSessionUuid = '550e8400-e29b-41d4-a716-446655440000'
        ;(randomUUID as jest.Mock).mockReturnValue(mockSessionUuid)

        await service.createSession({ workingDirectory: '/test/dir' })
        await service.startSession(mockSessionUuid)

        // User sends query (user prompt stored)
        await service.sendQuery(mockSessionUuid, {
          prompt: 'User query 1',
        })

        // Claude responds (assistant message)
        service.handleClaudeMessage({
          sessionId: mockSessionUuid,
          queryId: 'query-1',
          message: { type: 'assistant', content: 'Assistant response 1' },
        })

        // User sends another query
        await service.sendQuery(mockSessionUuid, {
          prompt: 'User query 2',
        })

        // Claude responds again
        service.handleClaudeMessage({
          sessionId: mockSessionUuid,
          queryId: 'query-2',
          message: { type: 'assistant', content: 'Assistant response 2' },
        })

        const session = service.getSession(mockSessionUuid)
        expect(session?.messages).toHaveLength(4)
        expect(session?.messages?.[0].type).toBe('user_prompt')
        expect(session?.messages?.[1].type).toBe('assistant')
        expect(session?.messages?.[2].type).toBe('user_prompt')
        expect(session?.messages?.[3].type).toBe('assistant')
      })
    })
  })
})
