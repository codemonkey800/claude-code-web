/**
 * Runtime validation schemas using Zod
 * Provides type-safe validation for all data structures
 */

import { z } from 'zod'

import { ERROR_CODES, WS_EVENTS } from 'src/constants/events'
import { SessionStatus } from 'src/types/session'

// ============================================================================
// Session Validation Schemas
// ============================================================================

/**
 * Validates SessionStatus enum values
 */
export const sessionStatusSchema = z.nativeEnum(SessionStatus)

/**
 * Validates SessionMetadata structure
 */
export const sessionMetadataSchema = z
  .object({
    clientId: z.string().optional(),
    tags: z.array(z.string()).optional(),
    description: z.string().optional(),
  })
  .strict()

/**
 * Validates complete Session objects
 * Accepts both Date objects and ISO strings for timestamps
 */
export const sessionSchema = z
  .object({
    id: z.string().uuid(),
    status: sessionStatusSchema,
    workingDirectory: z.string().min(1),
    createdAt: z.union([z.date(), z.string().datetime()]),
    updatedAt: z.union([z.date(), z.string().datetime()]),
    metadata: sessionMetadataSchema.optional(),
  })
  .strict()

/**
 * Validates CreateSessionPayload for session creation requests
 */
export const createSessionPayloadSchema = z
  .object({
    workingDirectory: z.string().optional(),
    metadata: sessionMetadataSchema.optional(),
  })
  .strict()

// ============================================================================
// WebSocket Event Validation Schemas - Client to Server
// ============================================================================

/**
 * Validates ping events
 */
export const pingEventSchema = z
  .object({
    type: z.literal(WS_EVENTS.PING),
    timestamp: z.string().datetime(),
    id: z.string().optional(),
  })
  .strict()

/**
 * Validates message events
 */
export const messageEventSchema = z
  .object({
    type: z.literal(WS_EVENTS.MESSAGE),
    timestamp: z.string().datetime(),
    id: z.string().optional(),
    payload: z
      .object({
        content: z.string().min(1),
      })
      .strict(),
  })
  .strict()

/**
 * Validates session creation events
 */
export const sessionCreateEventSchema = z
  .object({
    type: z.literal(WS_EVENTS.SESSION_CREATE),
    timestamp: z.string().datetime(),
    id: z.string().optional(),
    payload: createSessionPayloadSchema,
  })
  .strict()

/**
 * Union schema for all client-to-server events
 */
export const clientToServerEventSchema = z.discriminatedUnion('type', [
  pingEventSchema,
  messageEventSchema,
  sessionCreateEventSchema,
])

// ============================================================================
// WebSocket Event Validation Schemas - Server to Client
// ============================================================================

/**
 * Validates pong response events
 */
export const pongEventSchema = z
  .object({
    type: z.literal(WS_EVENTS.PONG),
    timestamp: z.string().datetime(),
    id: z.string().optional(),
  })
  .strict()

/**
 * Validates message response events
 */
export const messageResponseEventSchema = z
  .object({
    type: z.literal(WS_EVENTS.MESSAGE),
    timestamp: z.string().datetime(),
    id: z.string().optional(),
    payload: z
      .object({
        content: z.string(),
        echo: z.boolean(),
      })
      .strict(),
  })
  .strict()

/**
 * Validates session created events
 */
export const sessionCreatedEventSchema = z
  .object({
    type: z.literal(WS_EVENTS.SESSION_CREATED),
    timestamp: z.string().datetime(),
    id: z.string().optional(),
    payload: z
      .object({
        session: sessionSchema,
      })
      .strict(),
  })
  .strict()

/**
 * Validates error events
 */
export const errorEventSchema = z
  .object({
    type: z.literal(WS_EVENTS.ERROR),
    timestamp: z.string().datetime(),
    id: z.string().optional(),
    payload: z
      .object({
        code: z.enum([
          ERROR_CODES.INTERNAL_ERROR,
          ERROR_CODES.VALIDATION_ERROR,
          ERROR_CODES.SESSION_NOT_FOUND,
          ERROR_CODES.INVALID_REQUEST,
          ERROR_CODES.UNAUTHORIZED,
        ]),
        message: z.string(),
        details: z.unknown().optional(),
      })
      .strict(),
  })
  .strict()

/**
 * Union schema for all server-to-client events
 */
export const serverToClientEventSchema = z.discriminatedUnion('type', [
  pongEventSchema,
  messageResponseEventSchema,
  sessionCreatedEventSchema,
  errorEventSchema,
])

// ============================================================================
// Validation Helper Functions
// ============================================================================

/**
 * Validates and parses a Session object
 * @throws {ZodError} if validation fails
 */
export const validateSession = (data: unknown) => sessionSchema.parse(data)

/**
 * Validates and parses a CreateSessionPayload
 * @throws {ZodError} if validation fails
 */
export const validateCreateSessionPayload = (data: unknown) =>
  createSessionPayloadSchema.parse(data)

/**
 * Validates and parses a client-to-server event
 * @throws {ZodError} if validation fails
 */
export const validateClientEvent = (data: unknown) =>
  clientToServerEventSchema.parse(data)

/**
 * Validates and parses a server-to-client event
 * @throws {ZodError} if validation fails
 */
export const validateServerEvent = (data: unknown) =>
  serverToClientEventSchema.parse(data)

/**
 * Safely validates data without throwing
 * @returns {success: true, data: T} | {success: false, error: ZodError}
 */
export const safeValidateSession = (data: unknown) =>
  sessionSchema.safeParse(data)

/**
 * Safely validates client event without throwing
 * @returns {success: true, data: T} | {success: false, error: ZodError}
 */
export const safeValidateClientEvent = (data: unknown) =>
  clientToServerEventSchema.safeParse(data)

/**
 * Safely validates server event without throwing
 * @returns {success: true, data: T} | {success: false, error: ZodError}
 */
export const safeValidateServerEvent = (data: unknown) =>
  serverToClientEventSchema.safeParse(data)
