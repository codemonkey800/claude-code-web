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
  getHealth() {
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
  getRoot() {
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
