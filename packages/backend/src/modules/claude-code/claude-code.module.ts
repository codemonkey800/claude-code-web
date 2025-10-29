import { Module } from '@nestjs/common'

import { ClaudeCodeSubprocessService } from './claude-code-subprocess.service'

/**
 * Claude Code module providing Claude CLI subprocess integration
 *
 * Features:
 * - Spawns global `claude` CLI as subprocess
 * - Bidirectional JSON streaming via stdin/stdout
 * - Event-driven streaming architecture with EventEmitter2
 * - Auto-approval of tools (--permission-mode bypassPermissions)
 * - Authentication handled by Claude CLI itself
 */
@Module({
  providers: [ClaudeCodeSubprocessService],
  exports: [ClaudeCodeSubprocessService],
})
export class ClaudeCodeModule {}
