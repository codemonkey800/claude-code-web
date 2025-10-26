/**
 * REST API contract for session management
 * Defines type-safe routes using ts-rest
 */

import { initContract } from '@ts-rest/core'
import { z } from 'zod'

import {
  createSessionPayloadSchema,
  sessionSchema,
  sessionStatusSchema,
} from 'src/utils/validation'

const c = initContract()

/**
 * Session response schema for REST API
 * Converts Date objects to ISO strings for JSON serialization
 */
export const sessionResponseSchema = sessionSchema.extend({
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

/**
 * Update session status request schema
 */
export const updateSessionStatusSchema = z
  .object({
    status: sessionStatusSchema,
  })
  .strict()

/**
 * Sessions API contract
 * Defines all REST endpoints for session CRUD operations
 */
export const sessionsContract = c.router({
  /**
   * Create a new session
   * POST /sessions
   */
  createSession: {
    method: 'POST',
    path: '/sessions',
    responses: {
      201: sessionResponseSchema,
      400: z.object({
        message: z.string(),
        errors: z.array(z.unknown()).optional(),
      }),
      500: z.object({
        message: z.string(),
      }),
    },
    body: createSessionPayloadSchema,
    summary: 'Create a new session',
  },

  /**
   * Get all sessions
   * GET /sessions
   */
  getAllSessions: {
    method: 'GET',
    path: '/sessions',
    responses: {
      200: z.array(sessionResponseSchema),
      500: z.object({
        message: z.string(),
      }),
    },
    summary: 'Get all sessions',
  },

  /**
   * Get a specific session by ID
   * GET /sessions/:id
   */
  getSession: {
    method: 'GET',
    path: '/sessions/:id',
    responses: {
      200: sessionResponseSchema,
      404: z.object({
        message: z.string(),
      }),
      500: z.object({
        message: z.string(),
      }),
    },
    pathParams: z.object({
      id: z.string().uuid(),
    }),
    summary: 'Get a session by ID',
  },

  /**
   * Update session status
   * PATCH /sessions/:id
   */
  updateSessionStatus: {
    method: 'PATCH',
    path: '/sessions/:id',
    responses: {
      200: sessionResponseSchema,
      404: z.object({
        message: z.string(),
      }),
      400: z.object({
        message: z.string(),
        errors: z.array(z.unknown()).optional(),
      }),
      500: z.object({
        message: z.string(),
      }),
    },
    body: updateSessionStatusSchema,
    pathParams: z.object({
      id: z.string().uuid(),
    }),
    summary: 'Update session status',
  },

  /**
   * Delete a session
   * DELETE /sessions/:id
   */
  deleteSession: {
    method: 'DELETE',
    path: '/sessions/:id',
    responses: {
      204: z.void(),
      404: z.object({
        message: z.string(),
      }),
      500: z.object({
        message: z.string(),
      }),
    },
    pathParams: z.object({
      id: z.string().uuid(),
    }),
    body: null,
    summary: 'Delete a session',
  },
})
