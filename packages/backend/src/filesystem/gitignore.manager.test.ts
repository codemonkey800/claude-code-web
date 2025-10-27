import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { Logger } from '@nestjs/common'

import { GitignoreManager } from './gitignore.manager'

// Mock the fs/promises module
jest.mock('node:fs/promises', () => ({
  readFile: jest.fn(),
}))

// Mock Logger to suppress log output during tests
jest.mock('@nestjs/common', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    log: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}))

describe('GitignoreManager', () => {
  let manager: GitignoreManager
  const allowedBaseDir = '/home/user/projects'
  const mockReadFile = readFile as jest.MockedFunction<typeof readFile>

  beforeEach(() => {
    manager = new GitignoreManager(allowedBaseDir)
    jest.clearAllMocks()
  })

  describe('constructor', () => {
    it('should initialize with allowed base directory', () => {
      const testManager = new GitignoreManager('/test/dir')
      expect(testManager).toBeInstanceOf(GitignoreManager)
      expect(Logger).toHaveBeenCalled()
    })

    it('should start with empty cache', () => {
      expect(manager.getCacheSize()).toBe(0)
    })
  })

  describe('loadGitignores', () => {
    it('should load single .gitignore file', async () => {
      const dirPath = join(allowedBaseDir, 'project')
      const gitignoreContent = 'node_modules/\n*.log\n'

      mockReadFile.mockResolvedValueOnce(gitignoreContent)

      await manager.loadGitignores(dirPath)

      expect(mockReadFile).toHaveBeenCalledWith(
        join(dirPath, '.gitignore'),
        'utf-8',
      )
      expect(manager.getCacheSize()).toBe(1)
    })

    it('should cache loaded gitignore rules', async () => {
      const dirPath = join(allowedBaseDir, 'project')
      const gitignoreContent = 'node_modules/\n'

      // Mock all potential readFile calls in the hierarchy
      mockReadFile.mockRejectedValue(new Error('ENOENT'))
      mockReadFile.mockResolvedValueOnce(gitignoreContent) // project/.gitignore

      // First load
      await manager.loadGitignores(dirPath)
      const firstCallCount = mockReadFile.mock.calls.length

      // Second load - should use cache (no additional calls)
      await manager.loadGitignores(dirPath)
      expect(mockReadFile.mock.calls.length).toBe(firstCallCount)
    })

    it('should load multiple .gitignore files from directory hierarchy', async () => {
      const dirPath = join(allowedBaseDir, 'project', 'src')

      // Mock three .gitignore files in the hierarchy
      mockReadFile
        .mockRejectedValueOnce(new Error('ENOENT: no such file')) // src/.gitignore
        .mockResolvedValueOnce('*.log\n') // project/.gitignore
        .mockResolvedValueOnce('node_modules/\n.git/\n') // base/.gitignore

      await manager.loadGitignores(dirPath)

      expect(mockReadFile).toHaveBeenCalledWith(
        join(dirPath, '.gitignore'),
        'utf-8',
      )
      expect(mockReadFile).toHaveBeenCalledWith(
        join(allowedBaseDir, 'project', '.gitignore'),
        'utf-8',
      )
      expect(mockReadFile).toHaveBeenCalledWith(
        join(allowedBaseDir, '.gitignore'),
        'utf-8',
      )
    })

    it('should handle missing .gitignore files gracefully', async () => {
      const dirPath = join(allowedBaseDir, 'project')

      // Mock ENOENT error (file not found)
      const enoentError = new Error('ENOENT: no such file')
      mockReadFile.mockRejectedValue(enoentError)

      await expect(manager.loadGitignores(dirPath)).resolves.not.toThrow()
      expect(manager.getCacheSize()).toBe(1) // Still caches empty result
    })

    it('should warn about non-ENOENT errors but continue', async () => {
      const dirPath = join(allowedBaseDir, 'project')

      // Mock permission error
      const permError = new Error('EACCES: permission denied')
      mockReadFile.mockRejectedValue(permError)

      await expect(manager.loadGitignores(dirPath)).resolves.not.toThrow()
    })

    it('should stop at allowed base directory', async () => {
      const dirPath = allowedBaseDir

      mockReadFile.mockResolvedValueOnce('*.log\n')

      await manager.loadGitignores(dirPath)

      // Should only check the base directory, not parent
      expect(mockReadFile).toHaveBeenCalledTimes(1)
      expect(mockReadFile).toHaveBeenCalledWith(
        join(allowedBaseDir, '.gitignore'),
        'utf-8',
      )
    })

    it('should handle invalid gitignore syntax gracefully', async () => {
      const dirPath = join(allowedBaseDir, 'project')
      // Invalid content that might cause parsing issues
      const invalidContent = '\x00\x01\x02'

      mockReadFile.mockResolvedValueOnce(invalidContent)

      await expect(manager.loadGitignores(dirPath)).resolves.not.toThrow()
    })
  })

  describe('isIgnored', () => {
    it('should return false when no gitignore rules loaded', () => {
      const filePath = join(allowedBaseDir, 'project', 'test.txt')
      const baseDir = join(allowedBaseDir, 'project')

      const result = manager.isIgnored(filePath, baseDir)

      expect(result).toBe(false)
    })

    it('should ignore files matching gitignore patterns', async () => {
      const baseDir = join(allowedBaseDir, 'project')
      const gitignoreContent = 'node_modules\n*.log\n'

      mockReadFile.mockRejectedValue(new Error('ENOENT'))
      mockReadFile.mockResolvedValueOnce(gitignoreContent)
      await manager.loadGitignores(baseDir)

      // Test node_modules directory
      const nodeModulesPath = join(baseDir, 'node_modules')
      expect(manager.isIgnored(nodeModulesPath, baseDir)).toBe(true)

      // Test .log file
      const logPath = join(baseDir, 'test.log')
      expect(manager.isIgnored(logPath, baseDir)).toBe(true)

      // Test file that should not be ignored
      const jsPath = join(baseDir, 'test.js')
      expect(manager.isIgnored(jsPath, baseDir)).toBe(false)
    })

    it('should handle nested directory patterns', async () => {
      const baseDir = join(allowedBaseDir, 'project')
      const gitignoreContent = 'build/\ndist/\n'

      mockReadFile.mockResolvedValueOnce(gitignoreContent)
      await manager.loadGitignores(baseDir)

      const buildPath = join(baseDir, 'build', 'output.js')
      expect(manager.isIgnored(buildPath, baseDir)).toBe(true)

      const distPath = join(baseDir, 'dist', 'bundle.js')
      expect(manager.isIgnored(distPath, baseDir)).toBe(true)
    })

    it('should handle negation patterns', async () => {
      const baseDir = join(allowedBaseDir, 'project')
      const gitignoreContent = '*.log\n!important.log\n'

      mockReadFile.mockResolvedValueOnce(gitignoreContent)
      await manager.loadGitignores(baseDir)

      // Regular .log file should be ignored
      const regularLog = join(baseDir, 'test.log')
      expect(manager.isIgnored(regularLog, baseDir)).toBe(true)

      // important.log should NOT be ignored (negation pattern)
      const importantLog = join(baseDir, 'important.log')
      expect(manager.isIgnored(importantLog, baseDir)).toBe(false)
    })

    it('should handle wildcard patterns', async () => {
      const baseDir = join(allowedBaseDir, 'project')
      const gitignoreContent = '*.tmp\ntemp-*\n'

      mockReadFile.mockResolvedValueOnce(gitignoreContent)
      await manager.loadGitignores(baseDir)

      expect(manager.isIgnored(join(baseDir, 'file.tmp'), baseDir)).toBe(true)
      expect(manager.isIgnored(join(baseDir, 'temp-file'), baseDir)).toBe(true)
      expect(manager.isIgnored(join(baseDir, 'file.txt'), baseDir)).toBe(false)
    })

    it('should handle directory-only patterns', async () => {
      const baseDir = join(allowedBaseDir, 'project')
      const gitignoreContent = 'cache\n'

      mockReadFile.mockRejectedValue(new Error('ENOENT'))
      mockReadFile.mockResolvedValueOnce(gitignoreContent)
      await manager.loadGitignores(baseDir)

      // Directory should be ignored
      const cacheDir = join(baseDir, 'cache')
      expect(manager.isIgnored(cacheDir, baseDir)).toBe(true)

      // Files inside directory should also be ignored
      const cacheFile = join(baseDir, 'cache', 'data.json')
      expect(manager.isIgnored(cacheFile, baseDir)).toBe(true)
    })

    it('should not ignore the base directory itself', async () => {
      const baseDir = join(allowedBaseDir, 'project')
      const gitignoreContent = '*.log\n'

      mockReadFile.mockResolvedValueOnce(gitignoreContent)
      await manager.loadGitignores(baseDir)

      // Base directory itself should not be ignored
      expect(manager.isIgnored(baseDir, baseDir)).toBe(false)
    })

    it('should handle paths with Unix-style separators', async () => {
      const baseDir = join(allowedBaseDir, 'project')
      const gitignoreContent = 'node_modules/\n'

      mockReadFile.mockResolvedValueOnce(gitignoreContent)
      await manager.loadGitignores(baseDir)

      const filePath = join(baseDir, 'node_modules', 'package', 'index.js')
      expect(manager.isIgnored(filePath, baseDir)).toBe(true)
    })

    it('should handle common patterns (.git, .DS_Store)', async () => {
      const baseDir = join(allowedBaseDir, 'project')
      const gitignoreContent = '.git\n.DS_Store\n'

      mockReadFile.mockRejectedValue(new Error('ENOENT'))
      mockReadFile.mockResolvedValueOnce(gitignoreContent)
      await manager.loadGitignores(baseDir)

      expect(manager.isIgnored(join(baseDir, '.git'), baseDir)).toBe(true)
      expect(manager.isIgnored(join(baseDir, '.DS_Store'), baseDir)).toBe(true)
      expect(
        manager.isIgnored(join(baseDir, 'src', '.DS_Store'), baseDir),
      ).toBe(true)
    })

    it('should return false for current directory path', async () => {
      const baseDir = join(allowedBaseDir, 'project')
      const gitignoreContent = '*.log\n'

      mockReadFile.mockResolvedValueOnce(gitignoreContent)
      await manager.loadGitignores(baseDir)

      // Current directory marker should not be ignored
      expect(manager.isIgnored(baseDir, baseDir)).toBe(false)
    })
  })

  describe('clearCache', () => {
    it('should clear all cached gitignore rules', async () => {
      const dirPath = join(allowedBaseDir, 'project')
      const gitignoreContent = 'node_modules/\n'

      mockReadFile.mockResolvedValueOnce(gitignoreContent)

      await manager.loadGitignores(dirPath)
      expect(manager.getCacheSize()).toBe(1)

      manager.clearCache()

      expect(manager.getCacheSize()).toBe(0)
    })

    it('should allow reloading after cache clear', async () => {
      const dirPath = join(allowedBaseDir, 'project')
      const gitignoreContent = 'node_modules/\n'

      mockReadFile.mockRejectedValue(new Error('ENOENT'))
      mockReadFile.mockResolvedValueOnce(gitignoreContent)
      await manager.loadGitignores(dirPath)

      const firstCallCount = mockReadFile.mock.calls.length

      manager.clearCache()

      // Should reload after clear
      mockReadFile.mockResolvedValueOnce(gitignoreContent)
      await manager.loadGitignores(dirPath)

      // Should have made additional calls after cache clear
      expect(mockReadFile.mock.calls.length).toBeGreaterThan(firstCallCount)
      expect(manager.getCacheSize()).toBe(1)
    })

    it('should handle clearing empty cache', () => {
      expect(manager.getCacheSize()).toBe(0)
      expect(() => manager.clearCache()).not.toThrow()
      expect(manager.getCacheSize()).toBe(0)
    })
  })

  describe('getCacheSize', () => {
    it('should return 0 for new manager', () => {
      expect(manager.getCacheSize()).toBe(0)
    })

    it('should return correct count after loading gitignores', async () => {
      const dirPath1 = join(allowedBaseDir, 'project1')
      const dirPath2 = join(allowedBaseDir, 'project2')

      mockReadFile.mockResolvedValue('*.log\n')

      await manager.loadGitignores(dirPath1)
      expect(manager.getCacheSize()).toBe(1)

      await manager.loadGitignores(dirPath2)
      expect(manager.getCacheSize()).toBe(2)
    })

    it('should not increment for cached directories', async () => {
      const dirPath = join(allowedBaseDir, 'project')

      mockReadFile.mockResolvedValue('*.log\n')

      await manager.loadGitignores(dirPath)
      await manager.loadGitignores(dirPath) // Load again
      await manager.loadGitignores(dirPath) // And again

      expect(manager.getCacheSize()).toBe(1)
    })

    it('should return 0 after clearing cache', async () => {
      const dirPath = join(allowedBaseDir, 'project')

      mockReadFile.mockResolvedValue('*.log\n')
      await manager.loadGitignores(dirPath)

      expect(manager.getCacheSize()).toBeGreaterThan(0)

      manager.clearCache()
      expect(manager.getCacheSize()).toBe(0)
    })
  })

  describe('Edge cases and error handling', () => {
    it('should handle empty gitignore file', async () => {
      const dirPath = join(allowedBaseDir, 'project')
      mockReadFile.mockResolvedValueOnce('')

      await manager.loadGitignores(dirPath)

      const filePath = join(dirPath, 'test.txt')
      expect(manager.isIgnored(filePath, dirPath)).toBe(false)
    })

    it('should handle gitignore with only comments', async () => {
      const dirPath = join(allowedBaseDir, 'project')
      const gitignoreContent = '# This is a comment\n# Another comment\n'

      mockReadFile.mockResolvedValueOnce(gitignoreContent)
      await manager.loadGitignores(dirPath)

      const filePath = join(dirPath, 'test.txt')
      expect(manager.isIgnored(filePath, dirPath)).toBe(false)
    })

    it('should handle gitignore with blank lines', async () => {
      const dirPath = join(allowedBaseDir, 'project')
      const gitignoreContent = '\n\n*.log\n\n\n*.tmp\n\n'

      mockReadFile.mockResolvedValueOnce(gitignoreContent)
      await manager.loadGitignores(dirPath)

      expect(manager.isIgnored(join(dirPath, 'test.log'), dirPath)).toBe(true)
      expect(manager.isIgnored(join(dirPath, 'test.tmp'), dirPath)).toBe(true)
    })

    it('should handle very long gitignore files', async () => {
      const dirPath = join(allowedBaseDir, 'project')
      const patterns = Array.from({ length: 1000 }, (_, i) => `pattern${i}.tmp`)
      const gitignoreContent = patterns.join('\n')

      mockReadFile.mockResolvedValueOnce(gitignoreContent)
      await manager.loadGitignores(dirPath)

      expect(manager.isIgnored(join(dirPath, 'pattern500.tmp'), dirPath)).toBe(
        true,
      )
      expect(manager.isIgnored(join(dirPath, 'other.txt'), dirPath)).toBe(false)
    })

    it('should handle concurrent loadGitignores calls', async () => {
      const dirPath = join(allowedBaseDir, 'project')
      mockReadFile.mockResolvedValue('*.log\n')

      // Load same directory concurrently
      const promises = [
        manager.loadGitignores(dirPath),
        manager.loadGitignores(dirPath),
        manager.loadGitignores(dirPath),
      ]

      await Promise.all(promises)

      // Cache should prevent multiple loads - should be exactly 1 entry cached
      expect(manager.getCacheSize()).toBe(1)
    })
  })
})
