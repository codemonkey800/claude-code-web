import { Controller, Get } from '@nestjs/common'

/**
 * App Controller
 * Provides basic health check and info endpoints
 */
@Controller()
export class AppController {
  /**
   * Health check endpoint
   * GET /health
   */
  @Get('health')
  getHealth(): {
    status: string
    timestamp: string
    uptime: number
    service: string
  } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: 'claude-code-web-backend',
    }
  }

  /**
   * Root endpoint
   * GET /
   */
  @Get()
  getRoot(): {
    name: string
    version: string
    status: string
    endpoints: {
      health: string
      sessions: string
      filesystem: string
      websocket: string
    }
  } {
    return {
      name: 'Claude Code Web API',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        health: '/health',
        sessions: '/sessions',
        filesystem: '/filesystem',
        websocket: '/socket.io',
      },
    }
  }
}
