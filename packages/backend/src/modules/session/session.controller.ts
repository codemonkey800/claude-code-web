import {
  getErrorMessage,
  type Session,
  sessionsContract,
} from '@claude-code-web/shared'
import { Controller, HttpStatus, Logger } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest'

import { SessionService } from './session.service'

/**
 * REST API controller for session management
 * Implements the sessions contract using ts-rest
 */
@Controller()
export class SessionController {
  private readonly logger = new Logger(SessionController.name)

  constructor(
    private readonly sessionService: SessionService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Serializes a session by converting Date objects to ISO strings
   * @param session - The session to serialize
   * @returns Serialized session with string dates
   */
  private serializeSession(session: Session) {
    return {
      ...session,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    }
  }

  /**
   * Handles errors by logging and returning a standardized error response
   * @param operation - Human-readable description of the failed operation
   * @param error - The error that occurred
   * @returns Standardized 500 error response
   */
  private handleError(operation: string, error: unknown) {
    this.logger.error(operation, getErrorMessage(error))
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        message: operation,
        ...(process.env.NODE_ENV === 'development' && {
          error: getErrorMessage(error),
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

          const session = await Promise.resolve(
            this.sessionService.createSession(body),
          )

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

          // Emit event for WebSocket broadcast
          this.eventEmitter.emit('session.updated', {
            sessionId: session.id,
            session,
          })

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

          const deleted = await Promise.resolve(
            this.sessionService.deleteSession(params.id),
          )

          if (!deleted) {
            return {
              status: HttpStatus.NOT_FOUND,
              body: {
                message: `Session not found: ${params.id}`,
              },
            }
          }

          // Emit event for WebSocket broadcast
          this.eventEmitter.emit('session.deleted', {
            sessionId: params.id,
            reason: 'Deleted via REST API',
          })

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
