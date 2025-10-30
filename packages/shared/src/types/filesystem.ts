/**
 * File system type definitions for Claude Code Web
 * Defines structures for file system browsing and navigation
 */

/**
 * Type of file system node
 */
export enum FileSystemNodeType {
  FILE = 'file',
  DIRECTORY = 'directory',
}

/**
 * Sort options for directory browsing
 */
export enum SortBy {
  NAME = 'name',
  SIZE = 'size',
  MODIFIED_DATE = 'modifiedDate',
  TYPE = 'type',
}

/**
 * Sort direction
 */
export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * Metadata about a file or directory
 */
export interface FileMetadata {
  /** Unix file permissions (e.g., "755", "644") */
  permissions?: string
  /** Owner of the file */
  owner?: string
  /** Whether the file is readable by the current user */
  isReadable: boolean
  /** Whether the file is writable by the current user */
  isWritable: boolean
  /** Whether the file is executable by the current user */
  isExecutable?: boolean
}

/**
 * Base entry for a file system node
 */
export interface FileSystemEntry {
  /** Name of the file or directory */
  name: string
  /** Absolute path to the file or directory */
  path: string
  /** Type of the node */
  type: FileSystemNodeType
  /** Size in bytes (0 for directories) */
  size: number
  /** Last modified timestamp */
  modifiedAt: Date
  /** File metadata including permissions */
  metadata: FileMetadata
}

/**
 * Directory entry
 */
export interface DirectoryEntry extends FileSystemEntry {
  type: FileSystemNodeType.DIRECTORY
  /** Number of items in the directory (optional, for performance) */
  itemCount?: number
}

/**
 * File entry
 */
export interface FileEntry extends FileSystemEntry {
  type: FileSystemNodeType.FILE
  /** File extension (without the dot) */
  extension?: string
  /** MIME type (e.g., 'text/plain', 'image/png', 'application/json') */
  mimeType?: string
}

/**
 * Discriminated union for file system nodes
 */
export type FileSystemNode = DirectoryEntry | FileEntry

/**
 * Options for browsing a directory
 */
export interface DirectoryBrowseOptions {
  /** Whether to show hidden files (starting with .) */
  showHidden?: boolean
  /** Number of items per page */
  pageSize?: number
  /** Page number (1-based) */
  page?: number
  /** Sort field */
  sortBy?: SortBy
  /** Sort direction */
  sortDirection?: SortDirection
}

/**
 * Pagination metadata for directory browsing
 */
export interface PaginationMetadata {
  /** Current page number (1-based) */
  page: number
  /** Number of items per page */
  pageSize: number
  /** Total number of items across all pages */
  totalItems: number
  /** Total number of pages */
  totalPages: number
  /** Whether there is a next page */
  hasNextPage: boolean
  /** Whether there is a previous page */
  hasPreviousPage: boolean
}

/**
 * Response from browsing a directory
 */
export interface DirectoryBrowseResponse {
  /** The path that was browsed */
  path: string
  /** Array of file system entries */
  entries: FileSystemNode[]
  /** Pagination metadata */
  pagination: PaginationMetadata
}

/**
 * Payload for validating a path
 */
export interface ValidatePathPayload {
  /** Path to validate */
  path: string
}

/**
 * Response from validating a path
 */
export interface ValidatePathResponse {
  /** Whether the path is valid */
  valid: boolean
  /** Error message if path is invalid */
  error?: string
  /** Absolute resolved path if valid */
  resolvedPath?: string
  /** Whether the path is a directory */
  isDirectory?: boolean
  /** File metadata if valid */
  metadata?: FileMetadata
}

/**
 * File system configuration
 */
export interface FileSystemConfig {
  /** Allowed base directory for file system operations (resolved absolute path) */
  allowedBaseDir: string
}
