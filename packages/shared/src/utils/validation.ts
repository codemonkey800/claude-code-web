/**
 * Runtime validation schemas using Zod
 * Provides type-safe validation for all data structures
 */

import { z } from 'zod'

import { ERROR_CODES, WS_EVENTS } from 'src/constants/events'
import { FileSystemNodeType, SortBy, SortDirection } from 'src/types/filesystem'
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
// File System Validation Schemas
// ============================================================================

/**
 * Validates FileSystemNodeType enum values
 */
export const fileSystemNodeTypeSchema = z.nativeEnum(FileSystemNodeType)

/**
 * Validates SortBy enum values
 */
export const sortBySchema = z.nativeEnum(SortBy)

/**
 * Validates SortDirection enum values
 */
export const sortDirectionSchema = z.nativeEnum(SortDirection)

/**
 * Validates FileMetadata structure
 */
export const fileMetadataSchema = z
  .object({
    permissions: z.string().optional(),
    owner: z.string().optional(),
    isReadable: z.boolean(),
    isWritable: z.boolean(),
    isExecutable: z.boolean().optional(),
  })
  .strict()

/**
 * Validates FileSystemEntry base structure
 * Accepts both Date objects and ISO strings for timestamps
 */
export const fileSystemEntrySchema = z
  .object({
    name: z.string().min(1),
    path: z.string().min(1),
    type: fileSystemNodeTypeSchema,
    size: z.number().int().min(0),
    modifiedAt: z.union([z.date(), z.string().datetime()]),
    metadata: fileMetadataSchema,
  })
  .strict()

/**
 * Validates DirectoryEntry structure
 */
export const directoryEntrySchema = fileSystemEntrySchema
  .extend({
    type: z.literal(FileSystemNodeType.DIRECTORY),
    itemCount: z.number().int().min(0).optional(),
  })
  .strict()

/**
 * Validates FileEntry structure
 */
export const fileEntrySchema = fileSystemEntrySchema
  .extend({
    type: z.literal(FileSystemNodeType.FILE),
    extension: z.string().optional(),
    mimeType: z.string().optional(),
  })
  .strict()

/**
 * Validates FileSystemNode discriminated union
 */
export const fileSystemNodeSchema = z.discriminatedUnion('type', [
  directoryEntrySchema,
  fileEntrySchema,
])

/**
 * Validates DirectoryBrowseOptions
 */
export const directoryBrowseOptionsSchema = z
  .object({
    showHidden: z.boolean().optional(),
    pageSize: z.number().int().min(1).max(500).optional(),
    page: z.number().int().min(1).optional(),
    sortBy: sortBySchema.optional(),
    sortDirection: sortDirectionSchema.optional(),
  })
  .strict()

/**
 * Validates PaginationMetadata
 */
export const paginationMetadataSchema = z
  .object({
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    totalItems: z.number().int().min(0),
    totalPages: z.number().int().min(0),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
  })
  .strict()

/**
 * Validates DirectoryBrowseResponse
 */
export const directoryBrowseResponseSchema = z
  .object({
    path: z.string().min(1),
    entries: z.array(fileSystemNodeSchema),
    pagination: paginationMetadataSchema,
  })
  .strict()

/**
 * Validates ValidatePathPayload
 */
export const validatePathPayloadSchema = z
  .object({
    path: z.string().min(1),
  })
  .strict()

/**
 * Validates ValidatePathResponse
 */
export const validatePathResponseSchema = z
  .object({
    valid: z.boolean(),
    error: z.string().optional(),
    resolvedPath: z.string().optional(),
    isDirectory: z.boolean().optional(),
    metadata: fileMetadataSchema.optional(),
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
 * Validates session join events
 */
export const sessionJoinEventSchema = z
  .object({
    type: z.literal(WS_EVENTS.SESSION_JOIN),
    timestamp: z.string().datetime(),
    id: z.string().optional(),
    payload: z
      .object({
        sessionId: z.string().uuid(),
      })
      .strict(),
  })
  .strict()

/**
 * Validates session leave events
 */
export const sessionLeaveEventSchema = z
  .object({
    type: z.literal(WS_EVENTS.SESSION_LEAVE),
    timestamp: z.string().datetime(),
    id: z.string().optional(),
    payload: z
      .object({
        sessionId: z.string().uuid(),
      })
      .strict(),
  })
  .strict()

/**
 * Validates session message events
 */
export const sessionMessageEventSchema = z
  .object({
    type: z.literal(WS_EVENTS.SESSION_MESSAGE),
    timestamp: z.string().datetime(),
    id: z.string().optional(),
    payload: z
      .object({
        sessionId: z.string().uuid(),
        content: z.string().min(1),
      })
      .strict(),
  })
  .strict()

/**
 * Union schema for all client-to-server events
 */
export const clientToServerEventSchema = z.discriminatedUnion('type', [
  pingEventSchema,
  messageEventSchema,
  sessionJoinEventSchema,
  sessionLeaveEventSchema,
  sessionMessageEventSchema,
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
 * Validates session joined events
 */
export const sessionJoinedEventSchema = z
  .object({
    type: z.literal(WS_EVENTS.SESSION_JOINED),
    timestamp: z.string().datetime(),
    id: z.string().optional(),
    payload: z
      .object({
        sessionId: z.string().uuid(),
        session: sessionSchema,
      })
      .strict(),
  })
  .strict()

/**
 * Validates session left events
 */
export const sessionLeftEventSchema = z
  .object({
    type: z.literal(WS_EVENTS.SESSION_LEFT),
    timestamp: z.string().datetime(),
    id: z.string().optional(),
    payload: z
      .object({
        sessionId: z.string().uuid(),
      })
      .strict(),
  })
  .strict()

/**
 * Validates session message response events
 */
export const sessionMessageResponseEventSchema = z
  .object({
    type: z.literal(WS_EVENTS.SESSION_MESSAGE),
    timestamp: z.string().datetime(),
    id: z.string().optional(),
    payload: z
      .object({
        sessionId: z.string().uuid(),
        content: z.string(),
        senderId: z.string(),
      })
      .strict(),
  })
  .strict()

/**
 * Validates session deleted events
 */
export const sessionDeletedEventSchema = z
  .object({
    type: z.literal(WS_EVENTS.SESSION_DELETED),
    timestamp: z.string().datetime(),
    id: z.string().optional(),
    payload: z
      .object({
        sessionId: z.string().uuid(),
        reason: z.string().optional(),
      })
      .strict(),
  })
  .strict()

/**
 * Validates session status update events
 */
export const sessionStatusUpdateEventSchema = z
  .object({
    type: z.literal(WS_EVENTS.SESSION_STATUS),
    timestamp: z.string().datetime(),
    id: z.string().optional(),
    payload: z
      .object({
        sessionId: z.string().uuid(),
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
  sessionJoinedEventSchema,
  sessionLeftEventSchema,
  sessionMessageResponseEventSchema,
  sessionDeletedEventSchema,
  sessionStatusUpdateEventSchema,
  errorEventSchema,
])

// ============================================================================
// Validation Helper Functions
// ============================================================================

/**
 * Validates and parses a Session object
 * @throws {ZodError} if validation fails
 */
export const validateSession = (data: unknown): z.infer<typeof sessionSchema> =>
  sessionSchema.parse(data)

/**
 * Validates and parses a CreateSessionPayload
 * @throws {ZodError} if validation fails
 */
export const validateCreateSessionPayload = (
  data: unknown,
): z.infer<typeof createSessionPayloadSchema> =>
  createSessionPayloadSchema.parse(data)

/**
 * Validates and parses a client-to-server event
 * @throws {ZodError} if validation fails
 */
export const validateClientEvent = (
  data: unknown,
): z.infer<typeof clientToServerEventSchema> =>
  clientToServerEventSchema.parse(data)

/**
 * Validates and parses a server-to-client event
 * @throws {ZodError} if validation fails
 */
export const validateServerEvent = (
  data: unknown,
): z.infer<typeof serverToClientEventSchema> =>
  serverToClientEventSchema.parse(data)

/**
 * Safely validates data without throwing
 * @returns {success: true, data: T} | {success: false, error: ZodError}
 */
export const safeValidateSession = (
  data: unknown,
): z.SafeParseReturnType<unknown, z.infer<typeof sessionSchema>> =>
  sessionSchema.safeParse(data)

/**
 * Safely validates client event without throwing
 * @returns {success: true, data: T} | {success: false, error: ZodError}
 */
export const safeValidateClientEvent = (
  data: unknown,
): z.SafeParseReturnType<unknown, z.infer<typeof clientToServerEventSchema>> =>
  clientToServerEventSchema.safeParse(data)

/**
 * Safely validates server event without throwing
 * @returns {success: true, data: T} | {success: false, error: ZodError}
 */
export const safeValidateServerEvent = (
  data: unknown,
): z.SafeParseReturnType<unknown, z.infer<typeof serverToClientEventSchema>> =>
  serverToClientEventSchema.safeParse(data)

/**
 * Validates and parses a FileSystemNode object
 * @throws {ZodError} if validation fails
 */
export const validateFileSystemNode = (
  data: unknown,
): z.infer<typeof fileSystemNodeSchema> => fileSystemNodeSchema.parse(data)

/**
 * Validates and parses DirectoryBrowseOptions
 * @throws {ZodError} if validation fails
 */
export const validateDirectoryBrowseOptions = (
  data: unknown,
): z.infer<typeof directoryBrowseOptionsSchema> =>
  directoryBrowseOptionsSchema.parse(data)

/**
 * Validates and parses ValidatePathPayload
 * @throws {ZodError} if validation fails
 */
export const validatePathPayload = (
  data: unknown,
): z.infer<typeof validatePathPayloadSchema> =>
  validatePathPayloadSchema.parse(data)

/**
 * Validates and parses DirectoryBrowseResponse
 * @throws {ZodError} if validation fails
 */
export const validateDirectoryBrowseResponse = (
  data: unknown,
): z.infer<typeof directoryBrowseResponseSchema> =>
  directoryBrowseResponseSchema.parse(data)

/**
 * Validates and parses ValidatePathResponse
 * @throws {ZodError} if validation fails
 */
export const validatePathResponse = (
  data: unknown,
): z.infer<typeof validatePathResponseSchema> =>
  validatePathResponseSchema.parse(data)

/**
 * Safely validates FileSystemNode without throwing
 * @returns {success: true, data: T} | {success: false, error: ZodError}
 */
export const safeValidateFileSystemNode = (
  data: unknown,
): z.SafeParseReturnType<unknown, z.infer<typeof fileSystemNodeSchema>> =>
  fileSystemNodeSchema.safeParse(data)

/**
 * Safely validates DirectoryBrowseOptions without throwing
 * @returns {success: true, data: T} | {success: false, error: ZodError}
 */
export const safeValidateDirectoryBrowseOptions = (
  data: unknown,
): z.SafeParseReturnType<
  unknown,
  z.infer<typeof directoryBrowseOptionsSchema>
> => directoryBrowseOptionsSchema.safeParse(data)
