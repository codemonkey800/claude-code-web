import {
  type DirectoryBrowseResponse,
  fileSystemContract,
  type FileSystemNode,
  getErrorMessage,
  SortBy,
  SortDirection,
} from '@claude-code-web/shared'
import { Controller, HttpStatus, Logger } from '@nestjs/common'
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest'

import { FileSystemService } from './filesystem.service'

/**
 * REST API controller for file system operations
 * Implements the fileSystem contract using ts-rest
 */
@Controller()
export class FileSystemController {
  private readonly logger = new Logger(FileSystemController.name)

  constructor(private readonly fileSystemService: FileSystemService) {}

  /**
   * Serializes file system entries by converting Date objects to ISO strings
   * @param entry - The file system entry to serialize
   * @returns Serialized entry with string dates
   */
  private serializeEntry(
    entry: FileSystemNode,
  ): Omit<FileSystemNode, 'modifiedAt'> & { modifiedAt: string } {
    return {
      ...entry,
      modifiedAt: entry.modifiedAt.toISOString(),
    }
  }

  /**
   * Serializes directory browse response by converting Date objects to ISO strings
   * @param response - The browse response to serialize
   * @returns Serialized response with string dates
   */
  private serializeBrowseResponse(response: DirectoryBrowseResponse): Omit<
    DirectoryBrowseResponse,
    'entries'
  > & {
    entries: Array<Omit<FileSystemNode, 'modifiedAt'> & { modifiedAt: string }>
  } {
    return {
      ...response,
      entries: response.entries.map(entry => this.serializeEntry(entry)),
    }
  }

  /**
   * Handles errors by logging and returning a standardized error response
   * @param operation - Human-readable description of the failed operation
   * @param error - The error that occurred
   * @returns Standardized error response with appropriate status code
   */
  private handleError(
    operation: string,
    error: unknown,
  ): {
    status:
      | HttpStatus.INTERNAL_SERVER_ERROR
      | HttpStatus.NOT_FOUND
      | HttpStatus.FORBIDDEN
      | HttpStatus.BAD_REQUEST
    body: {
      message: string
      error?: string
    }
  } {
    const errorMessage = getErrorMessage(error)
    this.logger.error(operation, errorMessage)

    // Determine appropriate status code based on error message
    let status = HttpStatus.INTERNAL_SERVER_ERROR

    if (
      errorMessage.includes('not found') ||
      errorMessage.includes('does not exist')
    ) {
      status = HttpStatus.NOT_FOUND
    } else if (
      errorMessage.includes('Access denied') ||
      errorMessage.includes('outside allowed') ||
      errorMessage.includes('Directory traversal')
    ) {
      status = HttpStatus.FORBIDDEN
    } else if (
      errorMessage.includes('not a directory') ||
      errorMessage.includes('invalid')
    ) {
      status = HttpStatus.BAD_REQUEST
    }

    return {
      status,
      body: {
        message: operation,
        ...(process.env.NODE_ENV === 'development' && {
          error: errorMessage,
        }),
      },
    } as const
  }

  @TsRestHandler(fileSystemContract)
  handler(): ReturnType<typeof tsRestHandler<typeof fileSystemContract>> {
    return tsRestHandler(fileSystemContract, {
      /**
       * Get file system configuration
       * GET /filesystem/config
       */
      getConfig: () => {
        try {
          this.logger.debug('Getting file system configuration')

          const config = this.fileSystemService.getConfig()

          return {
            status: HttpStatus.OK,
            body: config,
          }
        } catch (error) {
          return this.handleError(
            'Failed to get file system configuration',
            error,
          )
        }
      },

      /**
       * Browse a directory and list its contents
       * GET /filesystem/browse
       */
      browseDirectory: async ({ query }) => {
        try {
          this.logger.debug(`Browsing directory: ${query.path}`)

          const response = await this.fileSystemService.browseDirectory(
            query.path,
            {
              showHidden: query.showHidden,
              pageSize: query.pageSize,
              page: query.page,
              sortBy: query.sortBy as SortBy | undefined,
              sortDirection: query.sortDirection as SortDirection | undefined,
            },
          )

          return {
            status: HttpStatus.OK,
            body: this.serializeBrowseResponse(response),
          }
        } catch (error) {
          return this.handleError('Failed to browse directory', error)
        }
      },

      /**
       * Validate a file system path
       * POST /filesystem/validate-path
       */
      validatePath: async ({ body }) => {
        try {
          this.logger.debug(`Validating path: ${body.path}`)

          const response = await this.fileSystemService.validatePath(body.path)

          if (!response.valid) {
            return {
              status: HttpStatus.BAD_REQUEST,
              body: {
                message: response.error || 'Path validation failed',
              },
            }
          }

          return {
            status: HttpStatus.OK,
            body: response,
          }
        } catch (error) {
          return this.handleError('Failed to validate path', error)
        }
      },
    })
  }
}
