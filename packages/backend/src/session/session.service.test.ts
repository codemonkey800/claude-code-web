import { randomUUID } from 'node:crypto'

import { INTERNAL_EVENTS, SessionStatus } from '@claude-code-web/shared'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Test, TestingModule } from '@nestjs/testing'

import { FileSystemService } from 'src/filesystem/filesystem.service'

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

      expect(session.metadata).toEqual(metadata)
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

      expect(retrievedSession).toEqual(createdSession)
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
      await new Promise(resolve => setTimeout(resolve, 10))

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

  describe('deleteSession', () => {
    it('should delete existing session and return true', async () => {
      const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
      ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

      await service.createSession({ workingDirectory: '/test/dir' })

      const result = service.deleteSession(mockUuid)

      expect(result).toBe(true)

      // Verify session is actually deleted
      const session = service.getSession(mockUuid)
      expect(session).toBeNull()
    })

    it('should return false for non-existent session', () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440099'
      const result = service.deleteSession(nonExistentId)

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

      service.deleteSession(mockUuid1)

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

      service.deleteSession(mockUuid1)
      expect(service.getSessionCount()).toBe(1)

      service.deleteSession(mockUuid2)
      expect(service.getSessionCount()).toBe(0)
    })
  })
})
