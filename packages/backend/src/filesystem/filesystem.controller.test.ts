import {
  type DirectoryBrowseResponse,
  type FileEntry,
  FileSystemNodeType,
  type PaginationMetadata,
  SortBy,
  SortDirection,
  type ValidatePathResponse,
} from '@claude-code-web/shared'
import { Test, TestingModule } from '@nestjs/testing'

import { FileSystemController } from './filesystem.controller'
import { FileSystemService } from './filesystem.service'

/**
 * Serialized file system entry with ISO string dates (as returned by REST API)
 */
interface SerializedFileEntry {
  name: string
  path: string
  type: FileSystemNodeType
  size: number
  modifiedAt: string
  metadata: {
    permissions?: string
    owner?: string
    isReadable: boolean
    isWritable: boolean
    isExecutable?: boolean
  }
  extension?: string
  mimeType?: string
}

/**
 * Serialized browse response with ISO string dates
 */
interface SerializedBrowseResponse {
  path: string
  entries: SerializedFileEntry[]
  pagination: PaginationMetadata
}

/**
 * Response types for controller endpoints
 */
type BrowseDirectoryResponse =
  | { status: 200; body: SerializedBrowseResponse }
  | { status: 400; body: { message: string; errors?: unknown[] } }
  | { status: 403; body: { message: string } }
  | { status: 404; body: { message: string } }
  | { status: 500; body: { message: string; error?: string } }

type ValidatePathApiResponse =
  | { status: 200; body: ValidatePathResponse }
  | { status: 400; body: { message: string; errors?: unknown[] } }
  | { status: 500; body: { message: string; error?: string } }

describe('FileSystemController', () => {
  let controller: FileSystemController
  let fileSystemService: jest.Mocked<FileSystemService>

  // Helper to create a mock file entry
  const createMockFileEntry = (overrides?: Partial<FileEntry>): FileEntry => ({
    name: 'test.txt',
    path: '/home/user/projects/test.txt',
    type: FileSystemNodeType.FILE,
    size: 1024,
    modifiedAt: new Date('2024-01-01T12:00:00.000Z'),
    metadata: {
      permissions: '644',
      isReadable: true,
      isWritable: true,
      isExecutable: false,
    },
    extension: 'txt',
    mimeType: 'text/plain',
    ...overrides,
  })

  // Helper to create a mock directory browse response
  const createMockBrowseResponse = (
    overrides?: Partial<DirectoryBrowseResponse>,
  ): DirectoryBrowseResponse => ({
    path: '/home/user/projects',
    entries: [createMockFileEntry()],
    pagination: {
      page: 1,
      pageSize: 100,
      totalItems: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
    ...overrides,
  })

  beforeEach(async () => {
    const mockFileSystemService = {
      browseDirectory: jest.fn(),
      validatePath: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FileSystemController],
      providers: [
        {
          provide: FileSystemService,
          useValue: mockFileSystemService,
        },
      ],
    }).compile()

    controller = module.get<FileSystemController>(FileSystemController)
    fileSystemService = module.get(FileSystemService)

    jest.clearAllMocks()
  })

  describe('browseDirectory endpoint', () => {
    const validPath = '/home/user/projects'

    it('should return 200 with directory contents', async () => {
      const mockResponse = createMockBrowseResponse()
      fileSystemService.browseDirectory.mockResolvedValue(mockResponse)

      const handlerInstance = controller.handler()
      const result = (await handlerInstance.browseDirectory({
        query: { path: validPath },
      })) as BrowseDirectoryResponse

      expect(result.status).toBe(200)
      if (result.status === 200) {
        expect(result.body.path).toBe(mockResponse.path)
        expect(result.body.entries).toHaveLength(1)
      }
    })

    it('should serialize Date objects to ISO strings', async () => {
      const mockResponse = createMockBrowseResponse()
      fileSystemService.browseDirectory.mockResolvedValue(mockResponse)

      const handlerInstance = controller.handler()
      const result = (await handlerInstance.browseDirectory({
        query: { path: validPath },
      })) as BrowseDirectoryResponse

      expect(result.status).toBe(200)
      if (result.status === 200) {
        expect(typeof result.body.entries[0].modifiedAt).toBe('string')
        expect(result.body.entries[0].modifiedAt).toBe(
          '2024-01-01T12:00:00.000Z',
        )
      }
    })

    it('should pass query parameters to service', async () => {
      const mockResponse = createMockBrowseResponse()
      fileSystemService.browseDirectory.mockResolvedValue(mockResponse)

      const handlerInstance = controller.handler()
      // ts-rest transforms query params: 'true' -> boolean, '50' -> number
      await handlerInstance.browseDirectory({
        query: {
          path: validPath,
          showHidden: true, // Transformed by ts-rest
          pageSize: 50, // Transformed by ts-rest
          page: 2, // Transformed by ts-rest
          sortBy: 'size',
          sortDirection: 'desc',
        },
      })

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(fileSystemService.browseDirectory).toHaveBeenCalledWith(
        validPath,
        expect.objectContaining({
          showHidden: true,
          pageSize: 50,
          page: 2,
          sortBy: SortBy.SIZE,
          sortDirection: SortDirection.DESC,
        }),
      )
    })

    it('should handle optional query parameters', async () => {
      const mockResponse = createMockBrowseResponse()
      fileSystemService.browseDirectory.mockResolvedValue(mockResponse)

      const handlerInstance = controller.handler()
      await handlerInstance.browseDirectory({
        query: { path: validPath },
      })

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(fileSystemService.browseDirectory).toHaveBeenCalledWith(
        validPath,
        {
          showHidden: undefined,
          pageSize: undefined,
          page: undefined,
          sortBy: undefined,
          sortDirection: undefined,
        },
      )
    })

    it('should return 404 for non-existent path', async () => {
      fileSystemService.browseDirectory.mockRejectedValue(
        new Error('Path does not exist or is not accessible: /nonexistent'),
      )

      const handlerInstance = controller.handler()
      const result = (await handlerInstance.browseDirectory({
        query: { path: '/nonexistent' },
      })) as BrowseDirectoryResponse

      expect(result.status).toBe(404)
      if (result.status === 404) {
        expect(result.body.message).toBe('Failed to browse directory')
      }
    })

    it('should return 403 for access denied', async () => {
      fileSystemService.browseDirectory.mockRejectedValue(
        new Error('Access denied: Path is outside allowed directory'),
      )

      const handlerInstance = controller.handler()
      const result = (await handlerInstance.browseDirectory({
        query: { path: '/etc/passwd' },
      })) as BrowseDirectoryResponse

      expect(result.status).toBe(403)
      if (result.status === 403) {
        expect(result.body.message).toBe('Failed to browse directory')
      }
    })

    it('should return 400 for invalid path (not a directory)', async () => {
      fileSystemService.browseDirectory.mockRejectedValue(
        new Error('Path is not a directory'),
      )

      const handlerInstance = controller.handler()
      const result = (await handlerInstance.browseDirectory({
        query: { path: '/home/user/file.txt' },
      })) as BrowseDirectoryResponse

      expect(result.status).toBe(400)
      if (result.status === 400) {
        expect(result.body.message).toBe('Failed to browse directory')
      }
    })

    it('should return 500 for unexpected errors', async () => {
      fileSystemService.browseDirectory.mockRejectedValue(
        new Error('Unexpected error'),
      )

      const handlerInstance = controller.handler()
      const result = (await handlerInstance.browseDirectory({
        query: { path: validPath },
      })) as BrowseDirectoryResponse

      expect(result.status).toBe(500)
      if (result.status === 500) {
        expect(result.body.message).toBe('Failed to browse directory')
      }
    })

    it('should include error details in development mode', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      fileSystemService.browseDirectory.mockRejectedValue(
        new Error('Detailed error'),
      )

      const handlerInstance = controller.handler()
      const result = (await handlerInstance.browseDirectory({
        query: { path: validPath },
      })) as BrowseDirectoryResponse

      expect(result.status).toBe(500)
      if (result.status === 500) {
        expect(result.body.error).toBe('Detailed error')
      }

      process.env.NODE_ENV = originalEnv
    })

    it('should not include error details in production mode', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      fileSystemService.browseDirectory.mockRejectedValue(
        new Error('Detailed error'),
      )

      const handlerInstance = controller.handler()
      const result = (await handlerInstance.browseDirectory({
        query: { path: validPath },
      })) as BrowseDirectoryResponse

      expect(result.status).toBe(500)
      if (result.status === 500) {
        expect(result.body.error).toBeUndefined()
      }

      process.env.NODE_ENV = originalEnv
    })

    it('should serialize multiple entries correctly', async () => {
      const mockResponse = createMockBrowseResponse({
        entries: [
          createMockFileEntry({ name: 'file1.txt' }),
          createMockFileEntry({ name: 'file2.txt' }),
          createMockFileEntry({
            name: 'folder',
            type: FileSystemNodeType.DIRECTORY,
          }),
        ],
      })
      fileSystemService.browseDirectory.mockResolvedValue(mockResponse)

      const handlerInstance = controller.handler()
      const result = (await handlerInstance.browseDirectory({
        query: { path: validPath },
      })) as BrowseDirectoryResponse

      expect(result.status).toBe(200)
      if (result.status === 200) {
        expect(result.body.entries).toHaveLength(3)
        result.body.entries.forEach(entry => {
          expect(typeof entry.modifiedAt).toBe('string')
        })
      }
    })

    it('should handle empty directory results', async () => {
      const mockResponse = createMockBrowseResponse({
        entries: [],
        pagination: {
          page: 1,
          pageSize: 100,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      })
      fileSystemService.browseDirectory.mockResolvedValue(mockResponse)

      const handlerInstance = controller.handler()
      const result = (await handlerInstance.browseDirectory({
        query: { path: validPath },
      })) as BrowseDirectoryResponse

      expect(result.status).toBe(200)
      if (result.status === 200) {
        expect(result.body.entries).toHaveLength(0)
        expect(result.body.pagination.totalItems).toBe(0)
      }
    })

    it('should preserve pagination metadata', async () => {
      const mockResponse = createMockBrowseResponse({
        pagination: {
          page: 2,
          pageSize: 50,
          totalItems: 150,
          totalPages: 3,
          hasNextPage: true,
          hasPreviousPage: true,
        },
      })
      fileSystemService.browseDirectory.mockResolvedValue(mockResponse)

      const handlerInstance = controller.handler()
      const result = (await handlerInstance.browseDirectory({
        query: { path: validPath },
      })) as BrowseDirectoryResponse

      expect(result.status).toBe(200)
      if (result.status === 200) {
        expect(result.body.pagination.page).toBe(2)
        expect(result.body.pagination.pageSize).toBe(50)
        expect(result.body.pagination.totalItems).toBe(150)
        expect(result.body.pagination.totalPages).toBe(3)
        expect(result.body.pagination.hasNextPage).toBe(true)
        expect(result.body.pagination.hasPreviousPage).toBe(true)
      }
    })
  })

  describe('validatePath endpoint', () => {
    const validPath = '/home/user/projects/file.txt'

    it('should return 200 for valid path', async () => {
      const mockResponse: ValidatePathResponse = {
        valid: true,
        resolvedPath: validPath,
        isDirectory: false,
        metadata: {
          permissions: '644',
          isReadable: true,
          isWritable: true,
          isExecutable: false,
        },
      }
      fileSystemService.validatePath.mockResolvedValue(mockResponse)

      const handlerInstance = controller.handler()
      const result = (await handlerInstance.validatePath({
        body: { path: validPath },
      })) as ValidatePathApiResponse

      expect(result.status).toBe(200)
      if (result.status === 200) {
        expect(result.body.valid).toBe(true)
        expect(result.body.resolvedPath).toBe(validPath)
        expect(result.body.isDirectory).toBe(false)
      }
    })

    it('should pass path to service', async () => {
      const mockResponse: ValidatePathResponse = {
        valid: true,
        resolvedPath: validPath,
        isDirectory: false,
      }
      fileSystemService.validatePath.mockResolvedValue(mockResponse)

      const handlerInstance = controller.handler()
      await handlerInstance.validatePath({
        body: { path: validPath },
      })

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(fileSystemService.validatePath).toHaveBeenCalledWith(validPath)
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(fileSystemService.validatePath).toHaveBeenCalledTimes(1)
    })

    it('should return 400 when validation fails', async () => {
      const mockResponse: ValidatePathResponse = {
        valid: false,
        error: 'Path does not exist',
      }
      fileSystemService.validatePath.mockResolvedValue(mockResponse)

      const handlerInstance = controller.handler()
      const result = (await handlerInstance.validatePath({
        body: { path: '/nonexistent' },
      })) as ValidatePathApiResponse

      expect(result.status).toBe(400)
      if (result.status === 400) {
        expect(result.body.message).toBe('Path does not exist')
      }
    })

    it('should return 400 with generic message if error is undefined', async () => {
      const mockResponse: ValidatePathResponse = {
        valid: false,
      }
      fileSystemService.validatePath.mockResolvedValue(mockResponse)

      const handlerInstance = controller.handler()
      const result = (await handlerInstance.validatePath({
        body: { path: '/invalid' },
      })) as ValidatePathApiResponse

      expect(result.status).toBe(400)
      if (result.status === 400) {
        expect(result.body.message).toBe('Path validation failed')
      }
    })

    it('should return 500 for unexpected errors', async () => {
      fileSystemService.validatePath.mockRejectedValue(
        new Error('Unexpected error'),
      )

      const handlerInstance = controller.handler()
      const result = (await handlerInstance.validatePath({
        body: { path: validPath },
      })) as ValidatePathApiResponse

      expect(result.status).toBe(500)
      if (result.status === 500) {
        expect(result.body.message).toBe('Failed to validate path')
      }
    })

    it('should include error details in development mode', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      fileSystemService.validatePath.mockRejectedValue(
        new Error('Detailed error'),
      )

      const handlerInstance = controller.handler()
      const result = (await handlerInstance.validatePath({
        body: { path: validPath },
      })) as ValidatePathApiResponse

      expect(result.status).toBe(500)
      if (result.status === 500) {
        expect(result.body.error).toBe('Detailed error')
      }

      process.env.NODE_ENV = originalEnv
    })

    it('should handle directory validation', async () => {
      const dirPath = '/home/user/projects'
      const mockResponse: ValidatePathResponse = {
        valid: true,
        resolvedPath: dirPath,
        isDirectory: true,
        metadata: {
          permissions: '755',
          isReadable: true,
          isWritable: true,
          isExecutable: true,
        },
      }
      fileSystemService.validatePath.mockResolvedValue(mockResponse)

      const handlerInstance = controller.handler()
      const result = (await handlerInstance.validatePath({
        body: { path: dirPath },
      })) as ValidatePathApiResponse

      expect(result.status).toBe(200)
      if (result.status === 200) {
        expect(result.body.valid).toBe(true)
        expect(result.body.isDirectory).toBe(true)
      }
    })

    it('should include metadata in response', async () => {
      const mockResponse: ValidatePathResponse = {
        valid: true,
        resolvedPath: validPath,
        isDirectory: false,
        metadata: {
          permissions: '644',
          owner: 'user',
          isReadable: true,
          isWritable: false,
          isExecutable: false,
        },
      }
      fileSystemService.validatePath.mockResolvedValue(mockResponse)

      const handlerInstance = controller.handler()
      const result = (await handlerInstance.validatePath({
        body: { path: validPath },
      })) as ValidatePathApiResponse

      expect(result.status).toBe(200)
      if (result.status === 200) {
        expect(result.body.metadata).toBeDefined()
        expect(result.body.metadata?.permissions).toBe('644')
        expect(result.body.metadata?.owner).toBe('user')
        expect(result.body.metadata?.isReadable).toBe(true)
        expect(result.body.metadata?.isWritable).toBe(false)
      }
    })
  })

  describe('Error handling', () => {
    it('should determine correct status code for not found errors', async () => {
      fileSystemService.browseDirectory.mockRejectedValue(
        new Error('Path not found'),
      )

      const handlerInstance = controller.handler()
      const result = (await handlerInstance.browseDirectory({
        query: { path: '/test' },
      })) as BrowseDirectoryResponse

      expect(result.status).toBe(404)
    })

    it('should determine correct status code for access denied errors', async () => {
      fileSystemService.browseDirectory.mockRejectedValue(
        new Error('Access denied: outside allowed directory'),
      )

      const handlerInstance = controller.handler()
      const result = (await handlerInstance.browseDirectory({
        query: { path: '/test' },
      })) as BrowseDirectoryResponse

      expect(result.status).toBe(403)
    })

    it('should determine correct status code for invalid path errors', async () => {
      fileSystemService.browseDirectory.mockRejectedValue(
        new Error('Path is not a directory'),
      )

      const handlerInstance = controller.handler()
      const result = (await handlerInstance.browseDirectory({
        query: { path: '/test' },
      })) as BrowseDirectoryResponse

      expect(result.status).toBe(400)
    })

    it('should handle string errors', async () => {
      fileSystemService.browseDirectory.mockRejectedValue('String error')

      const handlerInstance = controller.handler()
      const result = (await handlerInstance.browseDirectory({
        query: { path: '/test' },
      })) as BrowseDirectoryResponse

      expect(result.status).toBe(500)
      if (result.status === 500) {
        expect(result.body.message).toBe('Failed to browse directory')
      }
    })

    it('should handle null/undefined errors', async () => {
      fileSystemService.browseDirectory.mockRejectedValue(null)

      const handlerInstance = controller.handler()
      const result = (await handlerInstance.browseDirectory({
        query: { path: '/test' },
      })) as BrowseDirectoryResponse

      expect(result.status).toBe(500)
      if (result.status === 500) {
        expect(result.body.message).toBe('Failed to browse directory')
      }
    })

    it('should handle errors with Directory traversal pattern', async () => {
      fileSystemService.browseDirectory.mockRejectedValue(
        new Error('Directory traversal attempt detected'),
      )

      const handlerInstance = controller.handler()
      const result = (await handlerInstance.browseDirectory({
        query: { path: '/test' },
      })) as BrowseDirectoryResponse

      expect(result.status).toBe(403)
    })
  })
})
