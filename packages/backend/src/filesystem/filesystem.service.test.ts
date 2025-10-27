import type { Dirent, Stats } from 'node:fs'
import { access, readdir, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

import {
  FileSystemNodeType,
  SortBy,
  SortDirection,
} from '@claude-code-web/shared'
import { Test, TestingModule } from '@nestjs/testing'

import { FileSystemService } from './filesystem.service'

// Mock node modules
jest.mock('node:fs/promises', () => ({
  access: jest.fn(),
  readdir: jest.fn(),
  stat: jest.fn(),
}))

jest.mock('node:os', () => ({
  homedir: jest.fn(),
}))

// Create a mock for GitignoreManager
const createMockGitignoreManager = (): {
  loadGitignores: jest.Mock<Promise<void>, [string]>
  isIgnored: jest.Mock<boolean, [string]>
  clearCache: jest.Mock<void, []>
  getCacheSize: jest.Mock<number, []>
} => ({
  loadGitignores: jest
    .fn<Promise<void>, [string]>()
    .mockResolvedValue(undefined),
  isIgnored: jest.fn<boolean, [string]>().mockReturnValue(false),
  clearCache: jest.fn<void, []>(),
  getCacheSize: jest.fn<number, []>().mockReturnValue(0),
})

describe('FileSystemService', () => {
  let service: FileSystemService
  let mockGitignoreManager: ReturnType<typeof createMockGitignoreManager>
  const mockAccess = access as jest.MockedFunction<typeof access>
  const mockReaddir = readdir as jest.MockedFunction<typeof readdir>
  const mockStat = stat as jest.MockedFunction<typeof stat>
  const mockHomedir = homedir as jest.MockedFunction<typeof homedir>

  // Test constants
  const testBaseDir = '/home/user/projects'
  const testHomeDir = '/home/user'

  // Helper to create mock stats object
  const createMockStats = (
    isDirectory = false,
    size = 0,
    mtime = new Date('2024-01-01'),
    mode = 0o755,
  ): Partial<Stats> => ({
    isDirectory: (): boolean => isDirectory,
    isFile: (): boolean => !isDirectory,
    size,
    mtime,
    mode,
  })

  // Helper to create mock dirent
  const createMockDirent = (
    name: string,
    isDirectory = false,
  ): Partial<Dirent> => ({
    name,
    isDirectory: (): boolean => isDirectory,
    isFile: (): boolean => !isDirectory,
    isBlockDevice: (): boolean => false,
    isCharacterDevice: (): boolean => false,
    isSymbolicLink: (): boolean => false,
    isFIFO: (): boolean => false,
    isSocket: (): boolean => false,
    path: '',
    parentPath: '',
  })

  beforeEach(async () => {
    // Set environment variables for testing
    process.env.FS_ALLOWED_BASE_DIR = testBaseDir
    process.env.FS_DEFAULT_PAGE_SIZE = '100'
    process.env.FS_MAX_PAGE_SIZE = '500'
    process.env.FS_SHOW_HIDDEN_FILES = 'false'

    mockHomedir.mockReturnValue(testHomeDir)

    // Create mock gitignore manager
    mockGitignoreManager = createMockGitignoreManager()

    const module: TestingModule = await Test.createTestingModule({
      providers: [FileSystemService],
    }).compile()

    service = module.get<FileSystemService>(FileSystemService)

    // Replace the gitignore manager with our mock
    Object.defineProperty(service, 'gitignoreManager', {
      value: mockGitignoreManager,
      writable: true,
    })

    jest.clearAllMocks()
  })

  describe('browseDirectory', () => {
    const validPath = join(testBaseDir, 'project')

    beforeEach(() => {
      // Setup common mocks for successful directory browsing
      mockAccess.mockResolvedValue(undefined)
      // Reset mockStat - tests will set it up as needed
      mockStat.mockReset()
    })

    it('should successfully browse a valid directory', async () => {
      const mockDirents = [
        createMockDirent('file1.txt', false),
        createMockDirent('folder1', true),
      ]

      mockReaddir.mockResolvedValue(mockDirents as Dirent[])
      mockStat
        .mockResolvedValueOnce(createMockStats(true) as Stats) // For path validation
        .mockResolvedValueOnce(createMockStats(false, 1024) as Stats) // file1.txt
        .mockResolvedValueOnce(createMockStats(true) as Stats) // folder1

      const result = await service.browseDirectory(validPath)

      expect(result.path).toBe(validPath)
      expect(result.entries).toHaveLength(2)
      expect(result.entries[0].type).toBe(FileSystemNodeType.FILE)
      expect(result.entries[1].type).toBe(FileSystemNodeType.DIRECTORY)
    })

    it('should include file metadata in results', async () => {
      const mockDirents = [createMockDirent('test.txt', false)]

      mockReaddir.mockResolvedValue(mockDirents as Dirent[])
      mockStat
        .mockResolvedValueOnce(createMockStats(true) as Stats)
        .mockResolvedValueOnce(createMockStats(false, 1024) as Stats)

      // Mock access checks for permissions
      mockAccess
        .mockResolvedValueOnce(undefined) // Path validation
        .mockResolvedValueOnce(undefined) // R_OK
        .mockResolvedValueOnce(undefined) // W_OK
        .mockResolvedValueOnce(undefined) // X_OK

      const result = await service.browseDirectory(validPath)

      expect(result.entries[0].metadata).toBeDefined()
      expect(result.entries[0].metadata.isReadable).toBe(true)
      expect(result.entries[0].metadata.isWritable).toBe(true)
      expect(result.entries[0].metadata.permissions).toBeDefined()
    })

    it('should paginate results correctly', async () => {
      const mockDirents = Array.from({ length: 10 }, (_, i) =>
        createMockDirent(`file${i}.txt`, false),
      )

      mockReaddir.mockResolvedValue(mockDirents as Dirent[])
      // First call: directory check (true), then 10 calls for files (false)
      mockStat
        .mockResolvedValueOnce(createMockStats(true) as Stats)
        .mockResolvedValue(createMockStats(false, 1024) as Stats)

      const result = await service.browseDirectory(validPath, {
        pageSize: 5,
        page: 1,
      })

      expect(result.entries).toHaveLength(5)
      expect(result.pagination.page).toBe(1)
      expect(result.pagination.pageSize).toBe(5)
      expect(result.pagination.totalItems).toBe(10)
      expect(result.pagination.totalPages).toBe(2)
      expect(result.pagination.hasNextPage).toBe(true)
      expect(result.pagination.hasPreviousPage).toBe(false)
    })

    it('should handle second page of results', async () => {
      const mockDirents = Array.from({ length: 10 }, (_, i) =>
        createMockDirent(`file${i}.txt`, false),
      )

      mockReaddir.mockResolvedValue(mockDirents as Dirent[])
      mockStat
        .mockResolvedValueOnce(createMockStats(true) as Stats)
        .mockResolvedValue(createMockStats(false, 1024) as Stats)

      const result = await service.browseDirectory(validPath, {
        pageSize: 5,
        page: 2,
      })

      expect(result.entries).toHaveLength(5)
      expect(result.pagination.page).toBe(2)
      expect(result.pagination.hasNextPage).toBe(false)
      expect(result.pagination.hasPreviousPage).toBe(true)
    })

    it('should sort by name ascending by default', async () => {
      const mockDirents = [
        createMockDirent('zebra.txt', false),
        createMockDirent('alpha.txt', false),
        createMockDirent('beta.txt', false),
      ]

      mockReaddir.mockResolvedValue(mockDirents as Dirent[])
      mockStat
        .mockResolvedValueOnce(createMockStats(true) as Stats)
        .mockResolvedValue(createMockStats(false, 1024) as Stats)

      const result = await service.browseDirectory(validPath)

      expect(result.entries[0].name).toBe('alpha.txt')
      expect(result.entries[1].name).toBe('beta.txt')
      expect(result.entries[2].name).toBe('zebra.txt')
    })

    it('should sort by name descending', async () => {
      const mockDirents = [
        createMockDirent('alpha.txt', false),
        createMockDirent('zebra.txt', false),
        createMockDirent('beta.txt', false),
      ]

      mockReaddir.mockResolvedValue(mockDirents as Dirent[])
      mockStat
        .mockResolvedValueOnce(createMockStats(true) as Stats)
        .mockResolvedValue(createMockStats(false, 1024) as Stats)

      const result = await service.browseDirectory(validPath, {
        sortBy: SortBy.NAME,
        sortDirection: SortDirection.DESC,
      })

      expect(result.entries[0].name).toBe('zebra.txt')
      expect(result.entries[1].name).toBe('beta.txt')
      expect(result.entries[2].name).toBe('alpha.txt')
    })

    it('should sort by size', async () => {
      const mockDirents = [
        createMockDirent('large.txt', false),
        createMockDirent('small.txt', false),
        createMockDirent('medium.txt', false),
      ]

      mockReaddir.mockResolvedValue(mockDirents as Dirent[])
      mockStat
        .mockResolvedValueOnce(createMockStats(true) as Stats) // Path validation
        .mockResolvedValueOnce(createMockStats(false, 10000) as Stats) // large
        .mockResolvedValueOnce(createMockStats(false, 100) as Stats) // small
        .mockResolvedValueOnce(createMockStats(false, 1000) as Stats) // medium

      const result = await service.browseDirectory(validPath, {
        sortBy: SortBy.SIZE,
        sortDirection: SortDirection.ASC,
      })

      expect(result.entries[0].name).toBe('small.txt')
      expect(result.entries[1].name).toBe('medium.txt')
      expect(result.entries[2].name).toBe('large.txt')
    })

    it('should sort by modified date', async () => {
      const mockDirents = [
        createMockDirent('old.txt', false),
        createMockDirent('new.txt', false),
        createMockDirent('middle.txt', false),
      ]

      mockReaddir.mockResolvedValue(mockDirents as Dirent[])
      mockStat
        .mockResolvedValueOnce(createMockStats(true) as Stats)
        .mockResolvedValueOnce(
          createMockStats(false, 100, new Date('2020-01-01')) as Stats,
        )
        .mockResolvedValueOnce(
          createMockStats(false, 100, new Date('2024-01-01')) as Stats,
        )
        .mockResolvedValueOnce(
          createMockStats(false, 100, new Date('2022-01-01')) as Stats,
        )

      const result = await service.browseDirectory(validPath, {
        sortBy: SortBy.MODIFIED_DATE,
        sortDirection: SortDirection.ASC,
      })

      expect(result.entries[0].name).toBe('old.txt')
      expect(result.entries[1].name).toBe('middle.txt')
      expect(result.entries[2].name).toBe('new.txt')
    })

    it('should sort by type (directories first)', async () => {
      const mockDirents = [
        createMockDirent('file1.txt', false),
        createMockDirent('folder1', true),
        createMockDirent('file2.txt', false),
        createMockDirent('folder2', true),
      ]

      mockReaddir.mockResolvedValue(mockDirents as Dirent[])
      mockStat
        .mockResolvedValueOnce(createMockStats(true) as Stats)
        .mockResolvedValueOnce(createMockStats(false, 100) as Stats)
        .mockResolvedValueOnce(createMockStats(true) as Stats)
        .mockResolvedValueOnce(createMockStats(false, 100) as Stats)
        .mockResolvedValueOnce(createMockStats(true) as Stats)

      const result = await service.browseDirectory(validPath, {
        sortBy: SortBy.TYPE,
      })

      expect(result.entries[0].type).toBe(FileSystemNodeType.DIRECTORY)
      expect(result.entries[1].type).toBe(FileSystemNodeType.DIRECTORY)
      expect(result.entries[2].type).toBe(FileSystemNodeType.FILE)
      expect(result.entries[3].type).toBe(FileSystemNodeType.FILE)
    })

    it('should filter hidden files by default', async () => {
      const mockDirents = [
        createMockDirent('.hidden', false),
        createMockDirent('visible.txt', false),
      ]

      mockReaddir.mockResolvedValue(mockDirents as Dirent[])
      mockStat
        .mockResolvedValueOnce(createMockStats(true) as Stats)
        .mockResolvedValue(createMockStats(false, 100) as Stats)

      const result = await service.browseDirectory(validPath)

      expect(result.entries).toHaveLength(1)
      expect(result.entries[0].name).toBe('visible.txt')
    })

    it('should show hidden files when showHidden is true', async () => {
      const mockDirents = [
        createMockDirent('.hidden', false),
        createMockDirent('visible.txt', false),
      ]

      mockReaddir.mockResolvedValue(mockDirents as Dirent[])
      mockStat
        .mockResolvedValueOnce(createMockStats(true) as Stats)
        .mockResolvedValue(createMockStats(false, 100) as Stats)

      const result = await service.browseDirectory(validPath, {
        showHidden: true,
      })

      expect(result.entries).toHaveLength(2)
      expect(result.entries.some(e => e.name === '.hidden')).toBe(true)
    })

    it('should filter files based on gitignore rules', async () => {
      const mockDirents = [
        createMockDirent('included.txt', false),
        createMockDirent('ignored.log', false),
      ]

      mockReaddir.mockResolvedValue(mockDirents as Dirent[])
      mockStat
        .mockResolvedValueOnce(createMockStats(true) as Stats)
        .mockResolvedValue(createMockStats(false, 100) as Stats)

      // Mock gitignore to ignore .log files
      mockGitignoreManager.isIgnored.mockImplementation((path: string) =>
        path.endsWith('.log'),
      )

      const result = await service.browseDirectory(validPath)

      expect(result.entries).toHaveLength(1)
      expect(result.entries[0].name).toBe('included.txt')
      expect(mockGitignoreManager.loadGitignores).toHaveBeenCalledWith(
        validPath,
      )
    })

    it('should continue browsing even if gitignore loading fails', async () => {
      const mockDirents = [createMockDirent('file.txt', false)]

      mockReaddir.mockResolvedValue(mockDirents as Dirent[])
      mockStat
        .mockResolvedValueOnce(createMockStats(true) as Stats)
        .mockResolvedValue(createMockStats(false, 100) as Stats)

      mockGitignoreManager.loadGitignores.mockRejectedValue(
        new Error('Gitignore error'),
      )

      const result = await service.browseDirectory(validPath)

      expect(result.entries).toHaveLength(1)
    })

    it('should skip files that cannot be accessed', async () => {
      const mockDirents = [
        createMockDirent('accessible.txt', false),
        createMockDirent('inaccessible.txt', false),
      ]

      mockReaddir.mockResolvedValue(mockDirents as Dirent[])
      mockStat
        .mockResolvedValueOnce(createMockStats(true) as Stats) // Path validation
        .mockResolvedValueOnce(createMockStats(false, 100) as Stats) // accessible
        .mockRejectedValueOnce(new Error('Permission denied')) // inaccessible

      const result = await service.browseDirectory(validPath)

      expect(result.entries).toHaveLength(1)
      expect(result.entries[0].name).toBe('accessible.txt')
    })

    it('should include file extension for files', async () => {
      const mockDirents = [
        createMockDirent('document.pdf', false),
        createMockDirent('script.js', false),
        createMockDirent('noextension', false),
      ]

      mockReaddir.mockResolvedValue(mockDirents as Dirent[])
      mockStat
        .mockResolvedValueOnce(createMockStats(true) as Stats)
        .mockResolvedValue(createMockStats(false, 100) as Stats)

      const result = await service.browseDirectory(validPath)

      // Results are sorted by name, so check by finding entries
      const pdfFile = result.entries.find(e => e.name === 'document.pdf')
      const jsFile = result.entries.find(e => e.name === 'script.js')
      const noExtFile = result.entries.find(e => e.name === 'noextension')

      expect(pdfFile?.extension).toBe('pdf')
      expect(jsFile?.extension).toBe('js')
      expect(noExtFile?.extension).toBeUndefined()
    })

    it('should include MIME type for files', async () => {
      const mockDirents = [createMockDirent('image.png', false)]

      mockReaddir.mockResolvedValue(mockDirents as Dirent[])
      mockStat
        .mockResolvedValueOnce(createMockStats(true) as Stats)
        .mockResolvedValue(createMockStats(false, 100) as Stats)

      const result = await service.browseDirectory(validPath)

      expect(result.entries[0].mimeType).toBeDefined()
    })

    it('should respect max page size limit', async () => {
      const mockDirents = Array.from({ length: 600 }, (_, i) =>
        createMockDirent(`file${i}.txt`, false),
      )

      mockReaddir.mockResolvedValue(mockDirents as Dirent[])
      mockStat
        .mockResolvedValueOnce(createMockStats(true) as Stats)
        .mockResolvedValue(createMockStats(false, 100) as Stats)

      // Try to request 1000 items, should be capped at max (500)
      const result = await service.browseDirectory(validPath, {
        pageSize: 1000,
      })

      expect(result.pagination.pageSize).toBe(500)
    })

    // Security tests
    it('should reject path traversal attempts with ../', async () => {
      const maliciousPath = join(testBaseDir, '../../../etc/passwd')

      await expect(service.browseDirectory(maliciousPath)).rejects.toThrow(
        'Access denied',
      )
    })

    it('should reject absolute paths outside allowed directory', async () => {
      const outsidePath = '/etc/passwd'

      mockAccess.mockResolvedValue(undefined)

      await expect(service.browseDirectory(outsidePath)).rejects.toThrow(
        'Access denied',
      )
    })

    it('should reject paths that resolve outside boundary', async () => {
      const trickPath = join(testBaseDir, 'project', '..', '..', '..')

      mockAccess.mockResolvedValue(undefined)

      await expect(service.browseDirectory(trickPath)).rejects.toThrow(
        'Access denied',
      )
    })

    it('should handle home directory expansion correctly', async () => {
      const mockDirents = [createMockDirent('file.txt', false)]
      const homeProjectPath = join(testHomeDir, 'projects')

      mockReaddir.mockResolvedValue(mockDirents as Dirent[])
      mockStat
        .mockResolvedValueOnce(createMockStats(true) as Stats)
        .mockResolvedValue(createMockStats(false, 100) as Stats)

      // Set allowed base to home
      process.env.FS_ALLOWED_BASE_DIR = testHomeDir

      // Recreate service with new env
      const newService = new FileSystemService()
      Object.defineProperty(newService, 'gitignoreManager', {
        value: mockGitignoreManager,
        writable: true,
      })

      const result = await newService.browseDirectory('~/projects')

      expect(result.path).toBe(homeProjectPath)
    })

    it('should reject non-existent paths', async () => {
      const nonExistentPath = join(testBaseDir, 'does-not-exist')

      mockAccess.mockRejectedValue(new Error('ENOENT'))

      await expect(service.browseDirectory(nonExistentPath)).rejects.toThrow(
        'does not exist',
      )
    })

    it('should reject paths that are files, not directories', async () => {
      const filePath = join(testBaseDir, 'file.txt')

      // First call should return false for isDirectory (it's a file)
      mockStat.mockResolvedValue(createMockStats(false) as Stats)

      await expect(service.browseDirectory(filePath)).rejects.toThrow(
        'not a directory',
      )
    })

    it('should handle empty directories', async () => {
      mockReaddir.mockResolvedValue([])
      mockStat.mockResolvedValue(createMockStats(true) as Stats)

      const result = await service.browseDirectory(validPath)

      expect(result.entries).toHaveLength(0)
      expect(result.pagination.totalItems).toBe(0)
    })
  })

  describe('validatePath', () => {
    const validFilePath = join(testBaseDir, 'project', 'file.txt')
    const validDirPath = join(testBaseDir, 'project')

    beforeEach(() => {
      mockAccess.mockResolvedValue(undefined)
    })

    it('should validate existing file path', async () => {
      // validatePath calls stat once - should return file stats
      mockStat.mockResolvedValue(createMockStats(false, 1024) as Stats)

      const result = await service.validatePath(validFilePath)

      expect(result.valid).toBe(true)
      expect(result.resolvedPath).toBe(validFilePath)
      expect(result.isDirectory).toBe(false)
      expect(result.metadata).toBeDefined()
    })

    it('should validate existing directory path', async () => {
      mockStat.mockResolvedValue(createMockStats(true) as Stats)

      const result = await service.validatePath(validDirPath)

      expect(result.valid).toBe(true)
      expect(result.resolvedPath).toBe(validDirPath)
      expect(result.isDirectory).toBe(true)
    })

    it('should include metadata in validation response', async () => {
      mockStat.mockResolvedValue(createMockStats(false, 1024) as Stats)
      mockAccess.mockResolvedValue(undefined)

      const result = await service.validatePath(validFilePath)

      expect(result.metadata).toBeDefined()
      expect(result.metadata?.isReadable).toBe(true)
      expect(result.metadata?.isWritable).toBe(true)
      expect(result.metadata?.permissions).toBeDefined()
    })

    it('should return invalid for non-existent paths', async () => {
      mockAccess.mockRejectedValue(new Error('ENOENT: no such file'))

      const result = await service.validatePath(
        join(testBaseDir, 'nonexistent'),
      )

      expect(result.valid).toBe(false)
      expect(result.error).toContain('does not exist')
    })

    it('should return invalid for paths outside boundary', async () => {
      const result = await service.validatePath('/etc/passwd')

      expect(result.valid).toBe(false)
      expect(result.error).toContain('Access denied')
    })

    it('should handle path traversal attempts', async () => {
      const maliciousPath = join(testBaseDir, '../../../etc/passwd')

      const result = await service.validatePath(maliciousPath)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('Access denied')
    })

    it('should resolve home directory in path', async () => {
      process.env.FS_ALLOWED_BASE_DIR = testHomeDir
      const newService = new FileSystemService()
      Object.defineProperty(newService, 'gitignoreManager', {
        value: mockGitignoreManager,
        writable: true,
      })

      mockStat.mockResolvedValue(createMockStats(true) as Stats)

      const result = await newService.validatePath('~/projects')

      expect(result.valid).toBe(true)
      expect(result.resolvedPath).toBe(join(testHomeDir, 'projects'))
    })

    it('should handle permission errors gracefully', async () => {
      mockAccess.mockRejectedValue(new Error('EACCES: permission denied'))

      const result = await service.validatePath(validFilePath)

      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle stat errors gracefully', async () => {
      mockStat.mockRejectedValue(new Error('Stat failed'))

      const result = await service.validatePath(validFilePath)

      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should validate paths at the boundary', async () => {
      mockStat.mockResolvedValue(createMockStats(true) as Stats)

      // Path exactly at the allowed base directory
      const result = await service.validatePath(testBaseDir)

      expect(result.valid).toBe(true)
      expect(result.resolvedPath).toBe(testBaseDir)
    })

    it('should reject paths just outside the boundary', async () => {
      // Path that would be parent of base directory
      const result = await service.validatePath(join(testBaseDir, '..'))

      expect(result.valid).toBe(false)
      expect(result.error).toContain('Access denied')
    })
  })
})
