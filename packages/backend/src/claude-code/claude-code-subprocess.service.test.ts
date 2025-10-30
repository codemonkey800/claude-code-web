import { ConfigService } from '@nestjs/config'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Test, TestingModule } from '@nestjs/testing'

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
  let _eventEmitter: jest.Mocked<EventEmitter2>
  let configService: jest.Mocked<ConfigService>

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks()

    // Mock execSync to simulate Claude CLI being available
    const childProcess =
      jest.requireMock<typeof import('node:child_process')>(
        'node:child_process',
      )
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    childProcess.execSync.mockReturnValue(Buffer.from('claude version 1.0.0'))

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
        if (key === 'CLAUDE_QUERY_TIMEOUT') {
          return 300000
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
    _eventEmitter = module.get<jest.Mocked<EventEmitter2>>(EventEmitter2)
    configService = module.get<jest.Mocked<ConfigService>>(ConfigService)
  })

  describe('onModuleInit', () => {
    it('should check for Claude CLI on module initialization', () => {
      const childProcess =
        jest.requireMock<typeof import('node:child_process')>(
          'node:child_process',
        )
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      childProcess.execSync.mockReturnValue(Buffer.from('claude version 1.0.0'))

      expect(() => service.onModuleInit()).not.toThrow()
      expect(childProcess.execSync).toHaveBeenCalledWith('claude --version', {
        stdio: 'ignore',
      })
    })

    it('should throw error if Claude CLI not found', () => {
      const childProcess =
        jest.requireMock<typeof import('node:child_process')>(
          'node:child_process',
        )
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      childProcess.execSync.mockImplementation(() => {
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
    it('should throw error if session not found', async () => {
      // Test what happens when trying to execute a query without initializing the session first
      await expect(
        service.executeQuery({
          sessionId: 'non-existent-session',
          prompt: 'test',
          workingDirectory: '/test',
        }),
      ).rejects.toThrow(
        'Cannot send message: session non-existent-session not found',
      )
    })
  })

  describe('configuration', () => {
    it('should read kill timeout from config service', () => {
      // The service constructor calls configService.get for CLAUDE_SUBPROCESS_KILL_TIMEOUT
      // This is checked during service instantiation
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(configService.get).toHaveBeenCalled()
    })

    it('should read query timeout from config service', () => {
      // The service constructor calls configService.get for CLAUDE_QUERY_TIMEOUT
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(configService.get).toHaveBeenCalledWith('CLAUDE_QUERY_TIMEOUT')
    })
  })
})
