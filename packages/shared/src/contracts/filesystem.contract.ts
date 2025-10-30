/**
 * REST API contract for file system operations
 * Defines type-safe routes using ts-rest for directory browsing and path validation
 */

import { initContract } from '@ts-rest/core'
import { z } from 'zod'

import {
  validatePathPayloadSchema,
  validatePathResponseSchema,
} from 'src/utils/validation'

const c = initContract()

/**
 * Directory browse response schema for REST API
 * Converts Date objects to ISO strings for JSON serialization
 */
export const directoryBrowseResponseApiSchema = z.object({
  path: z.string().min(1),
  entries: z.array(
    z.object({
      name: z.string().min(1),
      path: z.string().min(1),
      type: z.enum(['file', 'directory']),
      size: z.number().int().min(0),
      modifiedAt: z.string().datetime(),
      metadata: z.object({
        permissions: z.string().optional(),
        owner: z.string().optional(),
        isReadable: z.boolean(),
        isWritable: z.boolean(),
        isExecutable: z.boolean().optional(),
      }),
      itemCount: z.number().int().min(0).optional(),
      extension: z.string().optional(),
      mimeType: z.string().optional(),
    }),
  ),
  pagination: z.object({
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    totalItems: z.number().int().min(0),
    totalPages: z.number().int().min(0),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
  }),
})

/**
 * File System API contract
 * Defines all REST endpoints for file system operations
 */
export const fileSystemContract = c.router({
  /**
   * Get file system configuration
   * GET /filesystem/config
   */
  getConfig: {
    method: 'GET',
    path: '/filesystem/config',
    responses: {
      200: z.object({
        allowedBaseDir: z.string().min(1),
      }),
      500: z.object({
        message: z.string(),
      }),
    },
    summary: 'Get file system configuration including allowed base directory',
  },

  /**
   * Browse a directory and list its contents
   * GET /filesystem/browse
   */
  browseDirectory: {
    method: 'GET',
    path: '/filesystem/browse',
    responses: {
      200: directoryBrowseResponseApiSchema,
      400: z.object({
        message: z.string(),
        errors: z.array(z.unknown()).optional(),
      }),
      403: z.object({
        message: z.string(),
      }),
      404: z.object({
        message: z.string(),
      }),
      500: z.object({
        message: z.string(),
      }),
    },
    query: z.object({
      path: z.string().min(1),
      showHidden: z
        .string()
        .transform(val => val === 'true')
        .optional(),
      pageSize: z
        .string()
        .transform(val => parseInt(val, 10))
        .optional(),
      page: z
        .string()
        .transform(val => parseInt(val, 10))
        .optional(),
      sortBy: z.enum(['name', 'size', 'modifiedDate', 'type']).optional(),
      sortDirection: z.enum(['asc', 'desc']).optional(),
    }),
    summary: 'Browse a directory and list its contents',
  },

  /**
   * Validate a file system path
   * POST /filesystem/validate-path
   */
  validatePath: {
    method: 'POST',
    path: '/filesystem/validate-path',
    responses: {
      200: validatePathResponseSchema,
      400: z.object({
        message: z.string(),
        errors: z.array(z.unknown()).optional(),
      }),
      500: z.object({
        message: z.string(),
      }),
    },
    body: validatePathPayloadSchema,
    summary: 'Validate a file system path and check permissions',
  },
})
