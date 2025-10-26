import { randomUUID } from 'node:crypto'

import { SessionStatus } from '@claude-code-web/shared'
import { Test, TestingModule } from '@nestjs/testing'

import { SessionService } from 'src/modules/session/session.service'

// Mock the crypto module
jest.mock('node:crypto', () => ({
  randomUUID: jest.fn(),
}))

describe('SessionService', () => {
  let service: SessionService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SessionService],
    }).compile()

    service = module.get<SessionService>(SessionService)
    jest.clearAllMocks()
  })

  describe('createSession', () => {
    it('should create a session with UUID', () => {
      const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
      ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

      const payload = { workingDirectory: '/test/dir' }
      const session = service.createSession(payload)

      expect(session.id).toBe(mockUuid)
      expect(randomUUID).toHaveBeenCalledTimes(1)
    })

    it('should set status to PENDING by default', () => {
      const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
      ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

      const payload = { workingDirectory: '/test/dir' }
      const session = service.createSession(payload)

      expect(session.status).toBe(SessionStatus.PENDING)
    })

    it('should use provided workingDirectory', () => {
      const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
      ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

      const testDir = '/custom/test/directory'
      const payload = { workingDirectory: testDir }
      const session = service.createSession(payload)

      expect(session.workingDirectory).toBe(testDir)
    })

    it('should default to process.cwd() when workingDirectory not provided', () => {
      const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
      ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

      const payload = {}
      const session = service.createSession(payload)

      expect(session.workingDirectory).toBe(process.cwd())
    })

    it('should set createdAt and updatedAt timestamps', () => {
      const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
      ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

      const beforeCreation = new Date()
      const payload = { workingDirectory: '/test/dir' }
      const session = service.createSession(payload)
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

    it('should store metadata if provided', () => {
      const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
      ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

      const metadata = {
        clientId: 'test-client',
        tags: ['frontend', 'typescript'],
        description: 'Test session',
      }
      const payload = { workingDirectory: '/test/dir', metadata }
      const session = service.createSession(payload)

      expect(session.metadata).toEqual(metadata)
    })

    it('should increment session count', () => {
      const mockUuid1 = '550e8400-e29b-41d4-a716-446655440000'
      const mockUuid2 = '550e8400-e29b-41d4-a716-446655440001'
      ;(randomUUID as jest.Mock)
        .mockReturnValueOnce(mockUuid1)
        .mockReturnValueOnce(mockUuid2)

      const initialCount = service.getSessionCount()

      service.createSession({ workingDirectory: '/test/dir1' })
      expect(service.getSessionCount()).toBe(initialCount + 1)

      service.createSession({ workingDirectory: '/test/dir2' })
      expect(service.getSessionCount()).toBe(initialCount + 2)
    })
  })

  describe('getSession', () => {
    it('should return existing session by ID', () => {
      const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
      ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

      const payload = { workingDirectory: '/test/dir' }
      const createdSession = service.createSession(payload)

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

    it('should return all sessions', () => {
      const mockUuid1 = '550e8400-e29b-41d4-a716-446655440000'
      const mockUuid2 = '550e8400-e29b-41d4-a716-446655440001'
      ;(randomUUID as jest.Mock)
        .mockReturnValueOnce(mockUuid1)
        .mockReturnValueOnce(mockUuid2)

      const session1 = service.createSession({
        workingDirectory: '/test/dir1',
      })
      const session2 = service.createSession({
        workingDirectory: '/test/dir2',
      })

      const allSessions = service.getAllSessions()

      expect(allSessions).toHaveLength(2)
      expect(allSessions).toContainEqual(session1)
      expect(allSessions).toContainEqual(session2)
    })

    it('should return independent array (not modify internal state)', () => {
      const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
      ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

      service.createSession({ workingDirectory: '/test/dir' })

      const sessions1 = service.getAllSessions()
      const sessions2 = service.getAllSessions()

      expect(sessions1).not.toBe(sessions2) // Different array instances
      expect(sessions1).toEqual(sessions2) // But same content
    })
  })

  describe('updateSessionStatus', () => {
    it('should update session status successfully', () => {
      const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
      ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

      service.createSession({ workingDirectory: '/test/dir' })

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

      const session = service.createSession({
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

    it('should handle all SessionStatus enum values', () => {
      const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
      ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

      service.createSession({ workingDirectory: '/test/dir' })

      const statuses = [
        SessionStatus.PENDING,
        SessionStatus.ACTIVE,
        SessionStatus.PAUSED,
        SessionStatus.COMPLETED,
        SessionStatus.FAILED,
        SessionStatus.CANCELLED,
      ]

      for (const status of statuses) {
        const updatedSession = service.updateSessionStatus(mockUuid, status)
        expect(updatedSession?.status).toBe(status)
      }
    })
  })

  describe('deleteSession', () => {
    it('should delete existing session and return true', () => {
      const mockUuid = '550e8400-e29b-41d4-a716-446655440000'
      ;(randomUUID as jest.Mock).mockReturnValue(mockUuid)

      service.createSession({ workingDirectory: '/test/dir' })

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

    it('should decrement session count', () => {
      const mockUuid1 = '550e8400-e29b-41d4-a716-446655440000'
      const mockUuid2 = '550e8400-e29b-41d4-a716-446655440001'
      ;(randomUUID as jest.Mock)
        .mockReturnValueOnce(mockUuid1)
        .mockReturnValueOnce(mockUuid2)

      service.createSession({ workingDirectory: '/test/dir1' })
      service.createSession({ workingDirectory: '/test/dir2' })

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

    it('should return correct count after operations', () => {
      const mockUuid1 = '550e8400-e29b-41d4-a716-446655440000'
      const mockUuid2 = '550e8400-e29b-41d4-a716-446655440001'
      const mockUuid3 = '550e8400-e29b-41d4-a716-446655440002'
      ;(randomUUID as jest.Mock)
        .mockReturnValueOnce(mockUuid1)
        .mockReturnValueOnce(mockUuid2)
        .mockReturnValueOnce(mockUuid3)

      expect(service.getSessionCount()).toBe(0)

      service.createSession({ workingDirectory: '/test/dir1' })
      expect(service.getSessionCount()).toBe(1)

      service.createSession({ workingDirectory: '/test/dir2' })
      expect(service.getSessionCount()).toBe(2)

      service.createSession({ workingDirectory: '/test/dir3' })
      expect(service.getSessionCount()).toBe(3)
    })

    it('should update after create/delete operations', () => {
      const mockUuid1 = '550e8400-e29b-41d4-a716-446655440000'
      const mockUuid2 = '550e8400-e29b-41d4-a716-446655440001'
      ;(randomUUID as jest.Mock)
        .mockReturnValueOnce(mockUuid1)
        .mockReturnValueOnce(mockUuid2)

      service.createSession({ workingDirectory: '/test/dir1' })
      service.createSession({ workingDirectory: '/test/dir2' })
      expect(service.getSessionCount()).toBe(2)

      service.deleteSession(mockUuid1)
      expect(service.getSessionCount()).toBe(1)

      service.deleteSession(mockUuid2)
      expect(service.getSessionCount()).toBe(0)
    })
  })
})
