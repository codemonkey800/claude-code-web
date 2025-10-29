# Claude Code Web

A web-based interface for Claude Code sessions. Built with NestJS, React, and WebSockets for real-time collaboration.

## Prerequisites

1. **Node.js** >= 22.21.0
2. **pnpm** >= 8.0.0 (required by this monorepo)
3. **Claude Code CLI** installed globally:

   ```bash
   npm install -g @anthropic-ai/claude-code
   ```

4. **Authenticate Claude CLI** (choose one method):

   **Option A** (Recommended): OAuth authentication

   ```bash
   claude auth
   ```

   **Option B**: API Key environment variable

   ```bash
   export CLAUDE_API_KEY=your_anthropic_api_key
   ```

## Installation

1. **Clone the repository**

2. **Install dependencies:**

   ```bash
   pnpm install
   ```

3. **Configure environment:**

   ```bash
   cp packages/backend/.env.example packages/backend/.env
   # Edit .env as needed (most defaults work fine)
   ```

4. **Build shared package:**
   ```bash
   pnpm --filter=@claude-code-web/shared build
   ```

## Running the Application

### Development Mode

Start all packages in development mode:

```bash
pnpm dev
```

This starts:

- Backend (NestJS) on http://localhost:8081
- Frontend (React + Vite) on http://localhost:8080

### Production Build

```bash
pnpm build
pnpm start
```

## Architecture

This is a **pnpm workspace monorepo** with three main packages:

- **packages/backend** - NestJS REST + WebSocket server
- **packages/frontend** - React + Vite SPA
- **packages/shared** - Shared types, contracts, utilities

### Key Technologies

- **Backend**: NestJS, Socket.io, ts-rest, EventEmitter2
- **Frontend**: React, TanStack Query, Radix UI, Tailwind CSS 4
- **Shared**: Zod schemas, TypeScript types
- **Claude Integration**: Subprocess spawning of global `claude` CLI

## Development Commands

See [CLAUDE.md](CLAUDE.md) for detailed development commands and architecture documentation.

### Quick Commands

```bash
# Development
pnpm dev                 # Start all packages
pnpm dev:debug          # Start with debugger

# Building
pnpm build              # Build all packages

# Testing
pnpm test               # Run all tests
pnpm check              # Run lint + type-check + test
pnpm check:quick        # Run lint + type-check (skip tests)

# Code Quality
pnpm lint               # Lint all packages
pnpm lint:fix           # Fix linting issues
pnpm format             # Format code
pnpm type-check         # Type check all packages
```

## How It Works

1. **User Authentication**: Frontend connects to backend via WebSocket
2. **Session Creation**: Backend creates a session and spawns `claude` CLI subprocess
3. **Message Flow**:
   - User sends message via WebSocket
   - Backend writes JSON to subprocess stdin
   - CLI streams responses back via stdout
   - Backend parses and broadcasts to WebSocket clients
4. **Real-time Updates**: All clients in a session receive live updates

## Troubleshooting

### "Claude CLI not found"

Make sure Claude CLI is installed globally:

```bash
npm install -g @anthropic-ai/claude-code
claude --version
```

### "Claude CLI not authenticated"

Authenticate the CLI:

```bash
claude auth
# OR
export CLAUDE_API_KEY=your_key
```

### "Cannot find module '@claude-code-web/shared'"

Build the shared package first:

```bash
pnpm --filter=@claude-code-web/shared build
```

## Contributing

1. Follow the existing code style (see [CLAUDE.md](CLAUDE.md))
2. Run linter and type checks before committing
3. Write tests for new features
4. Update documentation as needed

## License

MIT
