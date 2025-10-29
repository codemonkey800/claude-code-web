import { INTERNAL_EVENTS } from '@claude-code-web/shared'
import { ConfigService } from '@nestjs/config'
import { Test, TestingModule } from '@nestjs/testing'
import { EventEmitter2 } from '@nestjs/event-emitter'

import { ClaudeCodeSubprocessService } from './claude-code-subprocess.service'

// Mock node modules at the top level
jest.mock('node:child_process', () => ({
  execSync: jest.fn(),
  spawn: jest.fn(),
}))
jest.mock('node:readline', () => ({
  createInterface: jest.fn(),
}))
jest.mock('node:crypto', () => ({
  randomUUID: jest.fn(() => 'test-query-id'),
}))

describe('ClaudeCodeSubprocessService', () => {
  let service: ClaudeCodeSubprocessService
  let eventEmitter: jest.Mocked<EventEmitter2>
  let configService: jest.Mocked<ConfigService>

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks()

    // Mock execSync to simulate Claude CLI being available
    const { execSync } = jest.requireMock('node:child_process')
    execSync.mockReturnValue(Buffer.from('claude version 1.0.0'))

    const mockEventEmitter = {
      emit: jest.fn(),
      on: jest.fn(),
      once: jest.fn(),
      removeListener: jest.fn(),
      removeAllListeners: jest.fn(),
    }

    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'CLAUDE_SUBPROCESS_KILL_TIMEOUT') {
          return 5000
        }
        return undefined
      }),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClaudeCodeSubprocessService,
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile()

    service = module.get<ClaudeCodeSubprocessService>(
      ClaudeCodeSubprocessService,
    )
    eventEmitter = module.get(EventEmitter2)
    configService = module.get(ConfigService)
  })

  describe('onModuleInit', () => {
    it('should check for Claude CLI on module initialization', () => {
      const { execSync } = jest.requireMock('node:child_process')
      execSync.mockReturnValue(Buffer.from('claude version 1.0.0'))

      expect(() => service.onModuleInit()).not.toThrow()
      expect(execSync).toHaveBeenCalledWith('claude --version', {
        stdio: 'ignore',
      })
    })

    it('should throw error if Claude CLI not found', () => {
      const { execSync } = jest.requireMock('node:child_process')
      execSync.mockImplementation(() => {
        throw new Error('Command not found')
      })

      expect(() => service.onModuleInit()).toThrow(
        'Claude CLI not found. Please install: npm install -g @anthropic-ai/claude-code',
      )
    })
  })

  describe('initialize', () => {
    it('should initialize session successfully', async () => {
      const sessionId = 'session-123'
      const workingDirectory = '/test/dir'

      await expect(
        service.initialize(sessionId, workingDirectory),
      ).resolves.toBeUndefined()
    })

    it('should log initialization', async () => {
      const logSpy = jest.spyOn(service['logger'], 'log')
      const sessionId = 'session-123'
      const workingDirectory = '/test/dir'

      await service.initialize(sessionId, workingDirectory)

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          `Initialized Claude Code subprocess for session ${sessionId}`,
        ),
      )
    })
  })

  describe('shutdown', () => {
    it('should shutdown session successfully', async () => {
      await expect(service.shutdown('session-123')).resolves.toBeUndefined()
    })

    it('should handle shutdown for session with no queries', async () => {
      await expect(
        service.shutdown('non-existent-session'),
      ).resolves.toBeUndefined()
    })
  })

  describe('cancelQuery', () => {
    it('should handle cancelling non-existent query', async () => {
      await expect(service.cancelQuery('non-existent')).resolves.toBeUndefined()
    })
  })

  describe('getQueryState', () => {
    it('should return null for non-existent queries', () => {
      const state = service.getQueryState('non-existent')
      expect(state).toBeNull()
    })
  })

  describe('executeQuery - basic functionality', () => {
    it('should throw error if spawn throws', async () => {
      const { spawn } = jest.requireMock('node:child_process')
      spawn.mockImplementation(() => {
        throw new Error('spawn error')
      })

      await expect(
        service.executeQuery({
          sessionId: 'session-123',
          prompt: 'test',
          workingDirectory: '/test',
        }),
      ).rejects.toThrow('spawn error')
    })
  })

  describe('configuration', () => {
    it('should read kill timeout from config service', () => {
      // The service constructor calls configService.get for CLAUDE_SUBPROCESS_KILL_TIMEOUT
      // This is checked during service instantiation
      expect(configService.get).toHaveBeenCalled()
    })
  })
})
