# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claude Code Web is a web-based interface for Claude Code sessions. It's a monorepo using **pnpm workspaces** with **Turbo** for build orchestration, consisting of three main packages: backend (NestJS), frontend (React + Vite), and shared (types/contracts).

**Current Phase**: Phase 2 - Session Lifecycle Enhancement (see [PLAN.md](PLAN.md) for detailed implementation plan)

## Architecture

### Monorepo Structure

```
packages/
├── backend/          # NestJS REST + WebSocket server
├── frontend/         # React + Vite SPA
├── shared/           # Shared types, contracts, utilities
└── eslint-config/    # Shared ESLint configuration
```

### Core Architectural Patterns

**IMPORTANT**: These patterns are already established and should be followed for all new features:

1. **ts-rest Contracts** (`shared/src/contracts/`):
   - Define type-safe REST API contracts using `@ts-rest/core`
   - Use Zod schemas for validation
   - Contracts are implemented by backend controllers and consumed by frontend hooks
   - Example: `sessionsContract` defines all session CRUD operations

2. **REST → WebSocket Bridge**:
   - REST endpoints handle CRUD operations (stateless)
   - EventEmitter2 bridges REST operations to WebSocket broadcasts
   - WebSocket handles real-time updates only (no CRUD)
   - Flow: Controller → Service → `EventEmitter2.emit()` → WebSocketGateway → Client

3. **Session Rooms** (`backend/src/websocket/`):
   - Each session has a dedicated Socket.io room (`session:${id}`)
   - Broadcasts are targeted to specific session rooms
   - Prevents cross-session message leakage

4. **React Query** (`frontend/src/hooks/`):
   - All REST API calls use TanStack Query hooks
   - Cache is automatically invalidated via WebSocket events
   - Use `@lukemorales/query-key-factory` for consistent cache keys

5. **Type Safety**:
   - All shared types defined in `shared/src/types/`
   - TypeScript strict mode enabled across all packages
   - Add types to shared package BEFORE implementing features

### Backend Architecture (NestJS)

```
backend/src/
├── app.module.ts              # Main app module
├── main.ts                    # Application entry point
├── config/
│   └── env.validation.ts      # Environment variable validation
├── common/                    # Shared utilities, decorators, etc.
├── filesystem/                # Filesystem operations
│   ├── filesystem.module.ts
│   ├── filesystem.service.ts
│   └── filesystem.controller.ts
├── session/                   # Session CRUD + state management
│   ├── session.module.ts
│   ├── session.service.ts      # Business logic + EventEmitter
│   ├── session.controller.ts   # ts-rest implementation
│   └── *.test.ts
└── websocket/                 # Real-time communication
    ├── websocket.module.ts
    ├── websocket.gateway.ts    # Socket.io handlers
    └── *.test.ts
```

**Key Services:**

- **SessionService**: In-memory session storage using Map, emits events for state changes
- **WebSocketGateway**: Listens to EventEmitter2 events and broadcasts to session rooms

### Frontend Architecture (React + Vite)

```
frontend/src/
├── main.tsx                   # Entry point
├── App.tsx                    # Root component
├── api/
│   ├── queryClient.ts         # TanStack Query client
│   ├── tsRestClient.ts        # ts-rest client setup
│   └── queryKeys.ts           # Query key factory
├── components/                # React components
├── context/
│   └── SocketContext.tsx      # Socket.io provider
├── hooks/                     # React Query + custom hooks
└── types/                     # Frontend-specific types
```

**Key Patterns:**

- TanStack Query for all REST API calls
- Socket.io context for WebSocket subscriptions
- Radix UI for accessible components
- Tailwind CSS 4 for styling

### Shared Package

```
shared/src/
├── index.ts                   # Barrel export
├── contracts/                 # ts-rest API contracts
├── types/                     # Shared TypeScript interfaces
├── constants/                 # Constants, event names
└── utils/                     # Validation schemas, error utils
```

### Claude Code Module

Located in `packages/backend/src/claude-code/`, this module integrates with the Claude Code CLI as a long-running subprocess per session (inspired by happy-cli architecture).

**Architecture:**

- **IClaudeCodeService**: Abstract interface for Claude Code operations
- **ClaudeCodeSubprocessService**: Main service implementing the interface
- **ClaudeSessionManager**: Manages all active session subprocesses
- **ClaudeSessionSubprocess**: Manages a single long-running subprocess per session

**Key Design Pattern: Long-Running Subprocess**

Each session has ONE subprocess that stays alive until the session is terminated:

```
Session created → Subprocess spawned → Query 1 → Query 2 → ... → Session terminated → Subprocess killed
```

This is more efficient than spawning a new process for each query:

- ~200ms saved per query (no spawn/kill overhead)
- True session continuity
- Better resource utilization

**Subprocess Configuration:**

The subprocess is spawned with these critical arguments:

- `--input-format stream-json` - **CRITICAL**: Keeps stdin open for multiple messages
- `--output-format stream-json` - JSON streaming output
- `--verbose` - Detailed logging
- `--permission-mode bypassPermissions` - Auto-approve all tools

**Message Flow:**

1. **Session Start**: `SessionService.startSession()` → `ClaudeCodeService.initialize()` → `ClaudeSessionManager.createSession()` → Subprocess spawned
2. **User Query**: User sends prompt via WebSocket → `SessionService.sendQuery()` → `ClaudeCodeService.executeQuery()` → `ClaudeSessionManager.sendMessage()` → Message written to subprocess stdin
3. **Response Streaming**: CLI processes query → Streams JSON messages via stdout → Backend parses line-by-line → Emits `CLAUDE_MESSAGE` events → WebSocket Gateway broadcasts to session room
4. **Query Completion**: CLI sends `result` message → Backend emits `CLAUDE_READY` event → Frontend knows Claude is ready for next prompt
5. **Session End**: `SessionService.stopSession()` → `ClaudeCodeService.shutdown()` → `ClaudeSessionManager.destroySession()` → Subprocess gracefully terminated

**Message Queue Pattern:**

When multiple queries arrive concurrently for the same session:

1. Messages are queued in `ClaudeSessionSubprocess`
2. Messages are processed one at a time (sequential)
3. After receiving `result` message, next message is processed
4. This ensures clean conversation flow

**Message Types from CLI:**

Messages from the Claude CLI subprocess have a `type` field:

- `system`: System events (init with session_id, completion, etc.)
- `assistant`: Claude's responses and thoughts
- `user`: Tool results (from tool execution)
- `result`: Query completion with success/error status

Frontend can process messages based on `message.type` to build rich UI.

**Integration with SessionService:**

- `startSession()` calls `claudeCodeService.initialize()` to spawn long-running subprocess
- `sendQuery()` calls `claudeCodeService.executeQuery()` to send message to existing subprocess
- `stopSession()` calls `claudeCodeService.shutdown()` for cleanup and process termination
- Sessions automatically transition: `INITIALIZING` → `ACTIVE` → `TERMINATED`

**Authentication:**

Authentication is handled by the Claude CLI itself, NOT by this backend. Users must authenticate the CLI before running this application:

**Option 1** (Recommended): OAuth via Claude CLI

```bash
claude auth
```

**Option 2**: API Key environment variable

```bash
export CLAUDE_API_KEY=your_anthropic_api_key
```

The subprocess automatically inherits these credentials from the environment.

## Development Commands

### Root Level (affects all packages)

```bash
# Start all packages in development mode (concurrent)
pnpm dev

# Start with debug mode
pnpm dev:debug

# Build all packages
pnpm build

# Run all tests
pnpm test

# Run linter across all packages
pnpm lint

# Fix linting issues
pnpm lint:fix

# Check code formatting
pnpm format:check

# Format code
pnpm format

# Type check all packages
pnpm type-check

# Run lint + type-check + test
pnpm check

# Quick check (lint + type-check, skips tests)
pnpm check:quick

# Clean all build artifacts
pnpm clean
```

### Package-Specific Commands

```bash
# Run commands for specific package
pnpm --filter=@claude-code-web/backend <command>
pnpm --filter=@claude-code-web/frontend <command>
pnpm --filter=@claude-code-web/shared <command>

# Examples:
pnpm --filter=@claude-code-web/backend dev
pnpm --filter=@claude-code-web/frontend build
pnpm --filter=@claude-code-web/shared test
```

### Backend Commands

```bash
cd packages/backend

# Development with hot reload
pnpm dev

# Development with debugger
pnpm dev:debug

# Build for production
pnpm build

# Start production server (must build first)
pnpm start

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:cov

# Lint
pnpm lint

# Type check
pnpm type-check
```

### Frontend Commands

```bash
cd packages/frontend

# Development server (runs on port 8080)
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Lint
pnpm lint

# Type check
pnpm type-check
```

### Shared Package Commands

```bash
cd packages/shared

# Build in watch mode (auto-rebuilds on changes)
pnpm dev

# Build
pnpm build

# Lint
pnpm lint

# Type check
pnpm type-check
```

## Testing

### Backend Testing (Jest)

- Test files: `*.test.ts` or `*.spec.ts`
- Configuration: `packages/backend/jest.config.js`
- Module path aliases are configured to resolve `@claude-code-web/shared` and `src/` imports
- Run single test file: `pnpm test path/to/file.test.ts`
- Coverage reports generated in `coverage/` directory

### Frontend Testing

- Tests not yet configured (noted in package.json)
- Placeholder commands that exit successfully

## Linting & Formatting

- **ESLint**: Shared config in `@claude-code-web/eslint-config`
- **Prettier**: Configuration in `.prettierrc.yaml`
- **Pre-commit hooks**: Configured via Husky + lint-staged
  - Auto-formats and lints staged files on commit
  - Runs only on files that have changed
  - Skips `.config.js` and `.config.ts` files

### Running Linter for Modified Files Only

When making changes, run linter only on modified files:

```bash
# From root (runs turbo lint which uses cache)
pnpm lint

# For specific files
pnpm eslint --fix path/to/file.ts

# From package directory
cd packages/backend && pnpm lint:fix
```

## Adding New Features

### 1. Define Types in Shared Package

```typescript
// packages/shared/src/types/your-feature.ts
export interface YourFeature {
  // ... types
}

// packages/shared/src/index.ts
export * from './types/your-feature'
```

### 2. Create ts-rest Contract (if adding REST endpoints)

```typescript
// packages/shared/src/contracts/your-feature.contract.ts
import { initContract } from '@ts-rest/core'
import { z } from 'zod'

const c = initContract()

export const yourFeatureContract = c.router({
  yourEndpoint: {
    method: 'GET',
    path: '/your-endpoint',
    responses: {
      200: z.object({
        /* ... */
      }),
    },
    summary: 'Description',
  },
})

// packages/shared/src/index.ts
export * from './contracts/your-feature.contract'
```

### 3. Implement Backend Service

```typescript
// packages/backend/src/your-feature/your-feature.service.ts
import { Injectable } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'

@Injectable()
export class YourFeatureService {
  constructor(private eventEmitter: EventEmitter2) {}

  async doSomething() {
    // Business logic
    // Emit event for WebSocket broadcast
    this.eventEmitter.emit('your-feature.updated', data)
  }
}
```

### 4. Implement Backend Controller

```typescript
// packages/backend/src/your-feature/your-feature.controller.ts
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest'
import { yourFeatureContract } from '@claude-code-web/shared'

@Controller()
export class YourFeatureController {
  @TsRestHandler(yourFeatureContract.yourEndpoint)
  async yourEndpoint() {
    return tsRestHandler(yourFeatureContract.yourEndpoint, async () => {
      // Implementation
      return { status: 200, body: data }
    })
  }
}
```

### 5. Add WebSocket Listener (if broadcasting updates)

```typescript
// packages/backend/src/websocket/websocket.gateway.ts
@OnEvent('your-feature.updated')
handleYourFeatureUpdate(data: YourFeatureData) {
  // Broadcast to appropriate room
  this.server.to(`room:${id}`).emit('your-feature:updated', data)
}
```

### 6. Create Frontend React Query Hook

```typescript
// packages/frontend/src/hooks/useYourFeature.ts
import { useQuery } from '@tanstack/react-query'
import { tsRestClient } from 'src/api/tsRestClient'

export function useYourFeature() {
  return useQuery({
    queryKey: ['your-feature'],
    queryFn: async () => {
      const { status, body } = await tsRestClient.yourEndpoint()
      if (status === 200) return body
      throw new Error('Failed to fetch')
    },
  })
}
```

### 7. Add WebSocket Subscription (if needed)

```typescript
// In your component
const socket = useSocket()

useEffect(() => {
  socket.on('your-feature:updated', data => {
    // Invalidate React Query cache
    queryClient.invalidateQueries({ queryKey: ['your-feature'] })
  })
  return () => socket.off('your-feature:updated')
}, [socket])
```

## Important Notes

- **Always run lint and type checks** on modified files before committing
- **Follow existing patterns**: Use ts-rest contracts for REST, EventEmitter2 for REST→WebSocket bridge
- **Type safety first**: Add types to shared package before implementing features
- **Test your changes**: Write tests for new services and controllers
- **Session rooms**: Use existing session room infrastructure for targeted broadcasts
- **Build order**: Turbo automatically handles package build dependencies (shared builds before backend/frontend)

## Environment Variables

Backend configuration is validated in `backend/src/config/env.validation.ts`:

- `PORT`: Server port (default: 8081)
- `NODE_ENV`: Environment (development/production)
- `MAX_EVENT_LISTENERS`: EventEmitter2 max listeners (default: 100)
- `FRONTEND_URL`: Frontend URL for CORS (default: http://localhost:8080)
- Additional variables can be added to the validation schema

**Claude CLI Authentication** (handled by CLI, not backend):

The backend spawns the global `claude` CLI as a subprocess, which handles its own authentication. Users must authenticate the Claude CLI before using this application:

**Option 1** (Recommended): OAuth via Claude CLI

```bash
claude auth
```

**Option 2**: API Key environment variable

```bash
export CLAUDE_API_KEY=your_anthropic_api_key
```

The subprocess automatically inherits these credentials from the environment. No backend configuration needed.

## Troubleshooting

### "Cannot find module '@claude-code-web/shared'"

The shared package needs to be built first:

```bash
pnpm --filter=@claude-code-web/shared build
# Or from root
pnpm build
```

### Type errors in backend with shared imports

Run the shared package in watch mode during development:

```bash
cd packages/shared && pnpm dev
```

### WebSocket connection issues

Check that:

1. Backend is running on the correct port (default: 3000)
2. Frontend Socket.io client is configured with the correct URL
3. CORS is properly configured in backend

### Tests failing with module resolution errors

Jest is configured with module mappers in `backend/jest.config.js` - ensure paths match your import structure.
