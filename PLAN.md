# Phase 1: Foundation & Architecture Validation - Technical Implementation Plan

## 📋 Document Usage Instructions for AI Agent

### How to Use This Document

1. **ALWAYS** update checkboxes when completing a task by marking `[x]`
2. **ALWAYS** add completion timestamps in format: `[x] Task name (YYYY-MM-DD HH:MM)`
3. **ALWAYS** add notes if you encounter issues or deviate from the plan
4. **ALWAYS** run validation steps before marking a task complete
5. If blocked, add `[BLOCKED]` prefix and describe the issue
6. If a task needs revision, add `[NEEDS REVISION]` prefix

### Progress Tracking Format

- Incomplete tasks remain unchecked
- Completed tasks get checked with timestamp
- Blocked tasks get BLOCKED prefix with reason
- Tasks needing revision get NEEDS REVISION prefix with issue description

---

## 🎯 Phase 1 Goal

Establish a working monorepo with WebSocket communication between React frontend and NestJS backend, proving the architecture works end-to-end.

---

## 📁 Task Section 1: Monorepo Initialization

### 1.1 Project Setup

- [x] **Create root directory and initialize git repository**

  - Create claude-code-web directory
  - Initialize git
  - Set up initial commit

- [x] **Create comprehensive .gitignore file** (2025-10-23 16:46)

  - Include node_modules, dist folders, environment files
  - Add OS-specific files like .DS_Store
  - Include IDE configuration folders
  - Add log files and coverage reports

- [x] **Initialize pnpm package manager** (2025-10-23 16:54)

  - Install pnpm globally if not present
  - Initialize root package.json
  - Verify pnpm version is 8.0 or higher

- [x] **Configure pnpm workspace** (2025-10-23 16:54)
  - Create pnpm-workspace.yaml
  - Define packages directory structure
  - Set all packages to live under packages folder

### 1.2 Root Package Configuration

- [ ] **Set up root package.json with workspace scripts**

  - Define project name and mark as private
  - Set packageManager field for consistency
  - Define Node.js and pnpm engine requirements
  - Create scripts for running commands across workspaces
  - Include dev, build, test, lint, format, and clean commands

- [ ] **Install root-level development dependencies**
  - TypeScript for type checking
  - ESLint for code linting
  - Prettier for code formatting
  - Husky for git hooks
  - Lint-staged for pre-commit checks
  - Turbo for build orchestration

### 1.3 TypeScript Configuration

- [ ] **Create base TypeScript configuration**
  - Set up tsconfig.base.json at root
  - Configure strict type checking options
  - Enable all recommended strict flags
  - Set up module resolution for ESNext
  - Configure path mappings for shared package
  - Set appropriate compilation targets

### 1.4 ESLint Configuration

- [ ] **Set up root ESLint configuration**

  - Create .eslintrc.js file
  - Configure TypeScript parser
  - Add necessary plugins for TypeScript and imports
  - Extend recommended rulesets
  - Configure import ordering rules
  - Set up ignore patterns for build outputs

- [ ] **Install ESLint and related dependencies**
  - TypeScript ESLint parser and plugin
  - Import plugin for managing imports
  - Prettier plugin for formatting integration
  - Config packages for rule presets

### 1.5 Prettier Configuration

- [ ] **Create Prettier configuration**

  - Set up .prettierrc with formatting rules
  - Configure semicolons, quotes, and line width
  - Set trailing comma preferences
  - Configure bracket spacing and arrow parentheses

- [ ] **Create Prettier ignore file**
  - Exclude build outputs
  - Exclude lock files
  - Exclude coverage reports

### 1.6 Git Hooks Setup

- [ ] **Initialize Husky for git hooks**

  - Install and configure Husky
  - Create hooks directory

- [ ] **Set up pre-commit hook**

  - Configure to run lint-staged
  - Ensure code is linted and formatted before commit

- [ ] **Configure lint-staged**
  - Set up rules for TypeScript files
  - Configure formatting for JSON, Markdown, and YAML
  - Ensure fixes are applied automatically

### 1.7 Turbo Configuration

- [ ] **Create Turbo configuration for build orchestration**
  - Set up turbo.json
  - Define pipeline for build, dev, test tasks
  - Configure caching strategies
  - Set up dependency relationships
  - Define output folders for each task

---

## 📦 Task Section 2: Shared Package Setup

### 2.1 Package Initialization

- [ ] **Create shared package directory structure**

  - Create packages/shared folder
  - Set up src directory with subfolders for types, constants, utils
  - Organize code by domain concerns

- [ ] **Initialize shared package.json**

  - Set package name with workspace scope
  - Configure entry points for CommonJS and ESM
  - Define TypeScript types location
  - Set up build and development scripts
  - Configure exports for different module systems

- [ ] **Install shared package dependencies**
  - Add Zod for runtime validation
  - Install build tools (tsup)
  - Add TypeScript type definitions

### 2.2 TypeScript Configuration for Shared

- [ ] **Create TypeScript configuration for shared package**
  - Extend base configuration
  - Set source and output directories
  - Enable composite project for references
  - Configure include and exclude patterns

### 2.3 Build Configuration

- [ ] **Set up tsup build configuration**
  - Configure entry points
  - Set output formats for both CommonJS and ESM
  - Enable TypeScript declarations generation
  - Configure source maps
  - Set up clean builds

### 2.4 Initial Type Definitions

- [ ] **Create WebSocket event type definitions**

  - Define base event structure with timestamps
  - Create client to server event interfaces
  - Create server to client event interfaces
  - Define payload types for each event
  - Include error event types

- [ ] **Create session type definitions**

  - Define Session interface
  - Create SessionStatus enum
  - Add session lifecycle types
  - Include metadata types

- [ ] **Create constants file**

  - Define WebSocket event names
  - Create error codes
  - Set up configuration constants
  - Export type-safe event name mappings

- [ ] **Create validation schemas**

  - Build Zod schemas for message validation
  - Create session creation schemas
  - Add runtime type checking utilities
  - Export inferred TypeScript types

- [ ] **Create barrel exports**

  - Set up main index file
  - Export all types, constants, and utilities
  - Organize exports by domain

- [ ] **Build and verify shared package**
  - Run build command
  - Verify output files are generated
  - Check TypeScript declarations are created
  - Ensure both module formats are present

---

## 🔧 Task Section 3: Backend Setup (NestJS)

### 3.1 Backend Package Initialization

- [ ] **Create backend package structure**

  - Set up packages/backend directory
  - Create src folder with module organization
  - Set up folders for modules, common utilities, and config

- [ ] **Initialize backend package.json**

  - Set package name with workspace scope
  - Configure NestJS scripts
  - Add development and production start scripts
  - Include build, test, and lint commands

- [ ] **Install NestJS dependencies**

  - Core NestJS packages
  - Platform packages for Express
  - WebSocket and Socket.io platform packages
  - Reflection metadata for decorators
  - RxJS for reactive programming
  - Link to shared package using workspace protocol

- [ ] **Install backend development dependencies**
  - NestJS CLI and schematics
  - Testing packages
  - TypeScript type definitions
  - Jest for testing
  - Development server tools

### 3.2 NestJS Configuration

- [ ] **Create TypeScript configuration for backend**

  - Extend base configuration
  - Set up path aliases for imports
  - Configure decorator metadata
  - Enable experimental decorators

- [ ] **Create Nest CLI configuration**
  - Set up build options
  - Configure source root
  - Set TypeScript configuration path

### 3.3 Main Application Setup

- [ ] **Create main.ts entry point**

  - Set up NestJS application bootstrap
  - Configure CORS for frontend communication
  - Set port configuration
  - Add error handling
  - Include startup logging

- [ ] **Create root application module**
  - Set up AppModule
  - Import WebSocket module
  - Import Session module
  - Configure module dependencies

### 3.4 WebSocket Module Implementation

- [ ] **Create WebSocket module structure**

  - Set up module directory
  - Create gateway and module files

- [ ] **Implement WebSocket module**

  - Create module with providers
  - Export gateway for use in other modules

- [ ] **Implement WebSocket gateway**
  - Set up Socket.io gateway decorator
  - Implement connection lifecycle handlers
  - Add connection tracking
  - Create message handlers
  - Implement ping/pong for connection testing
  - Add session creation handler
  - Include error handling and logging

### 3.5 Session Module Setup

- [ ] **Create Session module structure**

  - Set up module directory
  - Create service and module files

- [ ] **Implement Session module**

  - Create module with providers
  - Export service for use in other modules

- [ ] **Implement Session service**
  - Create in-memory session storage
  - Implement session creation
  - Add session retrieval methods
  - Include session status updates
  - Add session deletion
  - Include proper logging

### 3.6 Backend Environment Configuration

- [ ] **Create development environment file**

  - Set Node environment
  - Configure port
  - Set logging level

- [ ] **Set up environment file management**
  - Add environment files to gitignore
  - Create example environment file
  - Document required environment variables

---

## ⚛️ Task Section 4: Frontend Setup (React + Vite)

### 4.1 Frontend Package Initialization

- [ ] **Create frontend package with Vite**

  - Use Vite to scaffold React TypeScript project
  - Set up packages/frontend directory

- [ ] **Update frontend package.json**

  - Set package name with workspace scope
  - Configure development server port
  - Add build and preview scripts
  - Include linting and formatting scripts
  - Add type checking script

- [ ] **Install frontend dependencies**
  - React and React DOM
  - Socket.io client for WebSocket
  - Link to shared package
  - Development dependencies for types
  - Vite and its React plugin
  - Tailwind CSS and PostCSS

### 4.2 Vite Configuration

- [ ] **Create Vite configuration file**
  - Configure React plugin
  - Set up path aliases
  - Configure development server
  - Set up proxy for WebSocket connections
  - Configure build options

### 4.3 TypeScript Configuration for Frontend

- [ ] **Create frontend TypeScript configuration**
  - Extend base configuration
  - Configure JSX for React
  - Set up DOM library types
  - Configure module resolution
  - Set up path mappings

### 4.4 Tailwind CSS Setup

- [ ] **Initialize Tailwind CSS**

  - Run Tailwind init command
  - Create PostCSS configuration

- [ ] **Configure Tailwind**

  - Set content paths for purging
  - Configure theme extensions
  - Add custom color palette
  - Set up responsive breakpoints

- [ ] **Create global CSS with Tailwind directives**
  - Import Tailwind layers
  - Set up base styles
  - Create component classes
  - Add utility classes

### 4.5 Socket.io Client Setup

- [ ] **Create Socket context for React**
  - Build context provider component
  - Implement connection management
  - Add reconnection logic
  - Track connection status
  - Provide hooks for using socket

### 4.6 Core UI Components

- [ ] **Create ConnectionStatus component**

  - Display current connection state
  - Show visual indicator
  - Update in real-time

- [ ] **Create MessageTester component**

  - Build message input interface
  - Implement send functionality
  - Display received messages
  - Add ping/pong test button
  - Show loading states

- [ ] **Create SessionTester component**
  - Add create session button
  - Display created sessions
  - Show session IDs and status
  - Handle loading states

### 4.7 Main App Component

- [ ] **Update App.tsx root component**

  - Set up Socket provider
  - Create application layout
  - Add header with connection status
  - Include test components
  - Add architecture validation checklist

- [ ] **Update main.tsx entry point**
  - Set up React root
  - Import global styles
  - Render App component
  - Enable strict mode

---

## 🧪 Task Section 5: Testing & Validation

### 5.1 Development Scripts Setup

- [ ] **Add concurrent development scripts**
  - Set up parallel execution with Turbo
  - Create individual package dev scripts
  - Configure watch modes

### 5.2 Build Verification

- [ ] **Build shared package**

  - Execute build command
  - Verify distribution files are created
  - Check all module formats are generated

- [ ] **Build backend package**

  - Execute build command
  - Verify NestJS compilation
  - Check output directory structure

- [ ] **Build frontend package**
  - Execute build command
  - Verify Vite bundling
  - Check production assets are generated

### 5.3 End-to-End Testing

- [ ] **Start all development servers**

  - Run concurrent dev command
  - Verify all services start without errors
  - Check for port conflicts

- [ ] **Test WebSocket connection**

  - Open frontend in browser
  - Verify connection status shows connected
  - Check browser console for connection logs

- [ ] **Test Ping/Pong functionality**

  - Click ping test button
  - Verify pong response is received
  - Check console logs on both sides

- [ ] **Test Message Echo**

  - Send test message from frontend
  - Verify echo response is received
  - Check backend logs for processing

- [ ] **Test Session Creation**
  - Create new session from frontend
  - Verify session ID is returned
  - Check session appears in UI

### 5.4 Validation Checklist

- [ ] **Verify monorepo structure**

  - All packages properly organized
  - Workspace dependencies resolve correctly
  - Scripts run from root and packages

- [ ] **Verify TypeScript integration**

  - No type errors in any package
  - Shared types import correctly
  - Path aliases work properly

- [ ] **Verify WebSocket communication**

  - Connection establishes on startup
  - Reconnection works after disconnect
  - All event types function correctly

- [ ] **Verify development experience**

  - Hot reload works in frontend
  - Backend restarts on changes
  - Shared package changes propagate

- [ ] **Verify code quality**
  - ESLint passes without errors
  - Prettier formatting is consistent
  - No console errors in browser
  - No unhandled errors in backend

---

## 📊 Success Metrics

### Phase 1 is complete when:

1. ✅ **Architecture Proven**

   - Monorepo structure functioning with all packages
   - Shared types successfully used by both frontend and backend
   - Build process works for all packages independently and together

2. ✅ **WebSocket Working**

   - Bidirectional communication successfully established
   - Multiple event types handled correctly
   - Connection management with reconnection implemented

3. ✅ **Developer Experience**

   - Hot reload and auto-restart functioning
   - TypeScript providing full type safety across packages
   - Linting and formatting properly configured

4. ✅ **Foundation Ready**
   - Messages successfully sent between frontend and backend
   - Session concept implemented even if mocked
   - Basic error handling in place

---

## 🚀 Next Steps After Phase 1

Once all checkboxes are marked:

1. **Commit the working foundation**

   - Stage all changes
   - Create descriptive commit message
   - Push to repository

2. **Tag the milestone**

   - Create annotated git tag
   - Mark as phase1-complete
   - Document completion date

3. **Document any deviations**

   - Note changes from original plan
   - Document issues encountered
   - Update dependency versions if needed

4. **Proceed to Phase 2**
   - Begin Session Lifecycle implementation
   - Add real file system integration
   - Implement persistent session management

---

## 📝 Notes Section

**For AI Agent: Add any important observations, issues, or deviations here**

### Issues Encountered:

-

### Deviations from Plan:

-

### Performance Observations:

-

### Suggestions for Phase 2:

- ***

  **REMEMBER**: Update each checkbox with completion timestamp when done. This document is the single source of truth for Phase 1 progress. Each task should be completed in order unless dependencies allow parallel work.
