import {
  getErrorMessage,
  type Session,
  sessionsContract,
} from '@claude-code-web/shared'
import { Controller, HttpStatus, Logger } from '@nestjs/common'
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest'

import { SessionService } from './session.service'

/**
 * REST API controller for session management
 * Implements the sessions contract using ts-rest
 */
@Controller()
export class SessionController {
  private readonly logger = new Logger(SessionController.name)

  constructor(private readonly sessionService: SessionService) {}

  /**
   * Serializes a session by converting Date objects to ISO strings
   * @param session - The session to serialize
   * @returns Serialized session with string dates
   */
  private serializeSession(session: Session): Omit<
    Session,
    'createdAt' | 'updatedAt'
  > & {
    createdAt: string
    updatedAt: string
  } {
    return {
      ...session,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    }
  }

  /**
   * Handles errors by logging and returning a standardized error response
   * Maps error messages to appropriate HTTP status codes using NestJS exceptions
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
      | HttpStatus.BAD_REQUEST
    body: {
      message: string
      error?: string
    }
  } {
    const errorMessage = getErrorMessage(error)
    this.logger.error(operation, errorMessage)

    // Determine appropriate status code based on error message patterns
    let status = HttpStatus.INTERNAL_SERVER_ERROR

    if (
      errorMessage.includes('not found') ||
      errorMessage.includes('does not exist')
    ) {
      status = HttpStatus.NOT_FOUND
    } else if (
      errorMessage.includes('Invalid') ||
      errorMessage.includes('must be') ||
      errorMessage.includes('required') ||
      errorMessage.includes('validation')
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

  @TsRestHandler(sessionsContract)
  handler(): ReturnType<typeof tsRestHandler<typeof sessionsContract>> {
    return tsRestHandler(sessionsContract, {
      /**
       * Create a new session
       * POST /sessions
       */
      createSession: async ({ body }) => {
        try {
          this.logger.log('Creating new session via REST API')

          const session = await this.sessionService.createSession(body)

          return {
            status: HttpStatus.CREATED,
            body: this.serializeSession(session),
          }
        } catch (error) {
          return this.handleError('Failed to create session', error)
        }
      },

      /**
       * Get all sessions
       * GET /sessions
       */
      getAllSessions: async () => {
        try {
          this.logger.debug('Fetching all sessions via REST API')

          const sessions = await Promise.resolve(
            this.sessionService.getAllSessions(),
          )

          return {
            status: HttpStatus.OK,
            body: sessions.map(s => this.serializeSession(s)),
          }
        } catch (error) {
          return this.handleError('Failed to fetch sessions', error)
        }
      },

      /**
       * Get a specific session by ID
       * GET /sessions/:id
       */
      getSession: async ({ params }) => {
        try {
          this.logger.debug(`Fetching session ${params.id} via REST API`)

          const session = await Promise.resolve(
            this.sessionService.getSession(params.id),
          )

          if (!session) {
            return {
              status: HttpStatus.NOT_FOUND,
              body: {
                message: `Session not found: ${params.id}`,
              },
            }
          }

          return {
            status: HttpStatus.OK,
            body: this.serializeSession(session),
          }
        } catch (error) {
          return this.handleError('Failed to fetch session', error)
        }
      },

      /**
       * Update session status
       * PATCH /sessions/:id
       */
      updateSessionStatus: async ({ params, body }) => {
        try {
          this.logger.log(
            `Updating session ${params.id} status to ${body.status} via REST API`,
          )

          const session = await Promise.resolve(
            this.sessionService.updateSessionStatus(params.id, body.status),
          )

          if (!session) {
            return {
              status: HttpStatus.NOT_FOUND,
              body: {
                message: `Session not found: ${params.id}`,
              },
            }
          }

          return {
            status: HttpStatus.OK,
            body: this.serializeSession(session),
          }
        } catch (error) {
          return this.handleError('Failed to update session', error)
        }
      },

      /**
       * Delete a session
       * DELETE /sessions/:id
       */
      deleteSession: async ({ params }) => {
        try {
          this.logger.log(`Deleting session ${params.id} via REST API`)

          // Service now handles stopping and event emission
          const deleted = await this.sessionService.deleteSession(params.id)

          if (!deleted) {
            return {
              status: HttpStatus.NOT_FOUND,
              body: {
                message: `Session not found: ${params.id}`,
              },
            }
          }

          return {
            status: HttpStatus.NO_CONTENT,
            body: undefined,
          }
        } catch (error) {
          return this.handleError('Failed to delete session', error)
        }
      },
    })
  }
}
