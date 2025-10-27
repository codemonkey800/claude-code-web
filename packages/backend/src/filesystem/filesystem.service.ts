import { access, readdir, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { extname, join, normalize, resolve } from 'node:path'

import {
  type DirectoryBrowseOptions,
  type DirectoryBrowseResponse,
  type DirectoryEntry,
  type FileEntry,
  type FileMetadata,
  type FileSystemNode,
  FileSystemNodeType,
  getErrorMessage,
  type PaginationMetadata,
  SortBy,
  SortDirection,
  type ValidatePathResponse,
} from '@claude-code-web/shared'
import { Injectable, Logger } from '@nestjs/common'
import mime from 'mime-types'

import {
  DEFAULT_FS_ALLOWED_BASE_DIR,
  DEFAULT_FS_DEFAULT_PAGE_SIZE,
  DEFAULT_FS_MAX_PAGE_SIZE,
} from 'src/config/env.validation'

import { GitignoreManager } from './gitignore.manager'

/**
 * Service for secure file system operations
 * Handles directory browsing, tree generation, and path validation
 * with security boundaries and permission checks
 */
@Injectable()
export class FileSystemService {
  private readonly logger = new Logger(FileSystemService.name)
  private readonly gitignoreManager: GitignoreManager

  // Configuration from environment variables (validated via env.validation.ts)
  // Note: Type conversions are handled by class-transformer in env.validation.ts
  private readonly config = {
    allowedBaseDir: this.resolveHomeDirectory(
      process.env.FS_ALLOWED_BASE_DIR || DEFAULT_FS_ALLOWED_BASE_DIR,
    ),
    defaultPageSize: process.env.FS_DEFAULT_PAGE_SIZE
      ? Number.parseInt(process.env.FS_DEFAULT_PAGE_SIZE, 10)
      : DEFAULT_FS_DEFAULT_PAGE_SIZE,
    maxPageSize: process.env.FS_MAX_PAGE_SIZE
      ? Number.parseInt(process.env.FS_MAX_PAGE_SIZE, 10)
      : DEFAULT_FS_MAX_PAGE_SIZE,
    showHiddenFiles: process.env.FS_SHOW_HIDDEN_FILES === 'true',
  }

  constructor() {
    this.gitignoreManager = new GitignoreManager(this.config.allowedBaseDir)
    this.logger.log(
      `FileSystemService initialized with base directory: ${this.config.allowedBaseDir}`,
    )
  }

  /**
   * Browse a directory and return paginated contents
   * @param path - Directory path to browse
   * @param options - Browse options (pagination, sorting, filters)
   * @returns Directory contents with pagination metadata
   * @throws {Error} if path is invalid or access is denied
   */
  async browseDirectory(
    path: string,
    options: DirectoryBrowseOptions = {},
  ): Promise<DirectoryBrowseResponse> {
    const resolvedPath = await this.resolveAndValidatePath(path)

    this.logger.debug(`Browsing directory: ${resolvedPath}`)

    // Check if path is a directory
    const stats = await stat(resolvedPath)
    if (!stats.isDirectory()) {
      throw new Error(`Path is not a directory: ${resolvedPath}`)
    }

    // Load gitignore rules for this directory
    try {
      await this.gitignoreManager.loadGitignores(resolvedPath)
    } catch (error) {
      // Log warning but continue - don't fail the entire request if gitignore parsing fails
      this.logger.warn(
        `Failed to load gitignores for ${resolvedPath}: ${getErrorMessage(error)}`,
      )
    }

    // Read directory contents
    const dirents = await readdir(resolvedPath, { withFileTypes: true })

    // Filter and convert to FileSystemNode
    const showHidden =
      options.showHidden !== undefined
        ? options.showHidden
        : this.config.showHiddenFiles

    // Process all entries in parallel for better performance
    const entryPromises = dirents.map(async dirent => {
      const fullPath = join(resolvedPath, dirent.name)

      // Check if file should be included (hidden files, exclude list, gitignore)
      if (
        !this.shouldIncludeFile(dirent.name, fullPath, resolvedPath, showHidden)
      ) {
        return null
      }

      try {
        const entryStats = await stat(fullPath)
        const metadata = await this.getFileMetadata(fullPath, entryStats)

        if (dirent.isDirectory()) {
          const dirEntry: DirectoryEntry = {
            name: dirent.name,
            path: fullPath,
            type: FileSystemNodeType.DIRECTORY,
            size: 0,
            modifiedAt: entryStats.mtime,
            metadata,
          }
          return dirEntry
        } else if (dirent.isFile()) {
          const ext = extname(dirent.name)
          // Detect MIME type (returns false if detection fails, which we convert to undefined)
          const mimeType = mime.lookup(dirent.name) || undefined
          const fileEntry: FileEntry = {
            name: dirent.name,
            path: fullPath,
            type: FileSystemNodeType.FILE,
            size: entryStats.size,
            modifiedAt: entryStats.mtime,
            metadata,
            extension: ext ? ext.slice(1) : undefined,
            mimeType,
          }
          return fileEntry
        }
      } catch (error) {
        // Skip files we can't access
        this.logger.warn(`Cannot access ${fullPath}: ${getErrorMessage(error)}`)
        return null
      }

      return null
    })

    // Wait for all entries to be processed and filter out null values
    const allEntries = (await Promise.all(entryPromises)).filter(
      (entry): entry is FileSystemNode => entry !== null,
    )

    // Sort entries
    const sortedEntries = this.sortEntries(
      allEntries,
      options.sortBy || SortBy.NAME,
      options.sortDirection || SortDirection.ASC,
    )

    // Paginate results
    const pageSize =
      options.pageSize !== undefined
        ? Math.min(options.pageSize, this.config.maxPageSize)
        : this.config.defaultPageSize
    const page = options.page || 1
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    const paginatedEntries = sortedEntries.slice(startIndex, endIndex)

    const pagination: PaginationMetadata = {
      page,
      pageSize,
      totalItems: sortedEntries.length,
      totalPages: Math.ceil(sortedEntries.length / pageSize),
      hasNextPage: endIndex < sortedEntries.length,
      hasPreviousPage: page > 1,
    }

    this.logger.debug(
      `Found ${sortedEntries.length} entries in ${resolvedPath}, returning page ${page}`,
    )

    return {
      path: resolvedPath,
      entries: paginatedEntries,
      pagination,
    }
  }

  /**
   * Validate a path and return metadata
   * @param path - Path to validate
   * @returns Validation result with metadata
   */
  async validatePath(path: string): Promise<ValidatePathResponse> {
    try {
      const resolvedPath = await this.resolveAndValidatePath(path)
      const stats = await stat(resolvedPath)
      const metadata = await this.getFileMetadata(resolvedPath, stats)

      this.logger.debug(`Path validated successfully: ${resolvedPath}`)

      return {
        valid: true,
        resolvedPath,
        isDirectory: stats.isDirectory(),
        metadata,
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      this.logger.warn(`Path validation failed: ${errorMessage}`)

      return {
        valid: false,
        error: errorMessage,
      }
    }
  }

  /**
   * Resolve and validate a path with security checks
   *
   * Security approach:
   * 1. Home directory expansion (~)
   * 2. Path normalization and resolution to absolute path
   * 3. Boundary checking (must be within allowed base directory)
   * 4. Access verification (path must exist and be accessible)
   *
   * The resolve(normalize()) approach handles all directory traversal patterns correctly,
   * including encoded, Windows-style, and other variations.
   *
   * @param path - Path to resolve and validate
   * @returns Resolved absolute path
   * @throws {Error} if path is invalid or outside allowed boundaries
   * @private
   */
  private async resolveAndValidatePath(path: string): Promise<string> {
    // Resolve ~ to home directory
    let resolvedPath = this.resolveHomeDirectory(path)

    // Normalize and resolve to absolute path
    // This handles all directory traversal patterns (../, ..\, encoded, etc.)
    resolvedPath = resolve(normalize(resolvedPath))

    // Check if path is within allowed boundaries
    if (!this.isPathAllowed(resolvedPath)) {
      throw new Error(
        `Access denied: Path is outside allowed directory: ${resolvedPath}`,
      )
    }

    // Verify path exists and is accessible
    try {
      await access(resolvedPath)
    } catch {
      throw new Error(
        `Path does not exist or is not accessible: ${resolvedPath}`,
      )
    }

    return resolvedPath
  }

  /**
   * Check if path is within allowed base directory
   * @param resolvedPath - Absolute path to check
   * @returns True if path is allowed, false otherwise
   * @private
   */
  private isPathAllowed(resolvedPath: string): boolean {
    return resolvedPath.startsWith(this.config.allowedBaseDir)
  }

  /**
   * Resolve home directory (~) in path
   * @param path - Path that may contain ~
   * @returns Path with ~ resolved
   * @private
   */
  private resolveHomeDirectory(path: string): string {
    if (path === '~' || path.startsWith('~/')) {
      return path.replace(/^~/, homedir())
    }
    return path
  }

  /**
   * Get file metadata including permissions
   * @param path - File path
   * @param stats - File stats (optional, will be fetched if not provided)
   * @returns File metadata
   * @private
   */
  private async getFileMetadata(
    path: string,
    stats?: Awaited<ReturnType<typeof stat>>,
  ): Promise<FileMetadata> {
    if (!stats) {
      stats = await stat(path)
    }

    // Get permissions
    const mode = stats.mode
    const permissions = mode.toString(8).slice(-3)

    // Check access permissions
    let isReadable = false
    let isWritable = false
    let isExecutable = false

    try {
      await access(path, 4) // R_OK
      isReadable = true
    } catch {
      // Not readable
    }

    try {
      await access(path, 2) // W_OK
      isWritable = true
    } catch {
      // Not writable
    }

    try {
      await access(path, 1) // X_OK
      isExecutable = true
    } catch {
      // Not executable
    }

    return {
      permissions,
      isReadable,
      isWritable,
      isExecutable,
    }
  }

  /**
   * Determine if a file should be included based on filters
   * @param name - File name
   * @param fullPath - Full absolute path to the file
   * @param baseDir - The directory being browsed
   * @param showHidden - Whether to show hidden files
   * @returns True if file should be included
   * @private
   */
  private shouldIncludeFile(
    name: string,
    fullPath: string,
    baseDir: string,
    showHidden: boolean,
  ): boolean {
    // Hidden files start with .
    if (name.startsWith('.') && !showHidden) {
      return false
    }

    // Check against gitignore rules
    if (this.gitignoreManager.isIgnored(fullPath, baseDir)) {
      return false
    }

    return true
  }

  /**
   * Sort file system entries
   * @param entries - Entries to sort
   * @param sortBy - Field to sort by
   * @param direction - Sort direction
   * @returns Sorted entries
   * @private
   */
  private sortEntries(
    entries: FileSystemNode[],
    sortBy: SortBy,
    direction: SortDirection,
  ): FileSystemNode[] {
    const sorted = [...entries].sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case SortBy.NAME:
          comparison = a.name.localeCompare(b.name)
          break
        case SortBy.SIZE:
          comparison = a.size - b.size
          break
        case SortBy.MODIFIED_DATE:
          comparison = a.modifiedAt.getTime() - b.modifiedAt.getTime()
          break
        case SortBy.TYPE:
          // Directories first, then files
          if (a.type === b.type) {
            comparison = a.name.localeCompare(b.name)
          } else {
            comparison = a.type === FileSystemNodeType.DIRECTORY ? -1 : 1
          }
          break
      }

      return direction === SortDirection.ASC ? comparison : -comparison
    })

    return sorted
  }
}
