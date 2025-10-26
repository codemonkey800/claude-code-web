# Phase 2: Session Lifecycle - Technical Implementation Plan (Refactored)

## 📋 AI Agent Instructions

### How to Use This Document

1. **ALWAYS** update checkboxes when completing a task by marking `[x]` with timestamp
2. **ALWAYS** add completion timestamp in format: `[x] Task name (YYYY-MM-DD HH:MM)`
3. **ALWAYS** update relevant documentation after completing each section
4. **ALWAYS** run validation tests before marking a task complete
5. **ALWAYS** commit changes after completing each major section
6. If blocked, add `[BLOCKED]` prefix and describe the issue
7. If a task needs revision, add `[NEEDS REVISION]` prefix with issue description
8. Create feature branches for each major section (e.g., `feature/file-system`)

### Current Architecture Context

The project already has:

- **REST API** using ts-rest contracts for CRUD operations
- **WebSocket** with Socket.io for real-time updates
- **EventEmitter2** bridging REST operations to WebSocket broadcasts
- **Session rooms** for targeted WebSocket messaging
- **React Query** with proper cache invalidation
- **In-memory session storage** with Map data structure

Build upon these existing patterns - don't reinvent them.

### Data Fetching Strategy (Already Implemented)

**REST API (ts-rest)** handles:

- Session CRUD operations
- Stateless queries
- File system browsing (to be added)

**WebSocket** handles:

- Real-time session status updates
- Session room subscriptions
- Live Claude Code output streaming (to be added)

### Best Practices to Follow

1. **Use Existing Patterns**: Follow the ts-rest contract pattern for new endpoints
2. **Event-Driven Updates**: Use EventEmitter2 for REST→WebSocket communication
3. **Type Safety**: Add new types to shared package before implementation
4. **Room-Based Broadcasting**: Use existing session room infrastructure
5. **Cache Invalidation**: Let React Query handle cache updates via existing patterns
6. **Error Handling**: Use established error codes and patterns
7. **Testing**: Test contracts, services, and WebSocket events separately

---

## 🎯 Phase 2 Goal

Enhance the existing session management system with:

1. **File system integration** for directory selection and browsing
2. **Extended session lifecycle** with more granular states
3. **Claude Code SDK preparation** (mocked implementation)
4. **Rich UI components** for session and file management
5. **Enhanced real-time features** for Claude Code output streaming

**Duration**: 5-7 days
**Priority**: File system → Session lifecycle enhancement → UI components → Claude Code preparation

---

## 📦 Section 1: File System Integration

### 1.1 File System Module Setup

- [ ] **Create FileSystemModule in backend**
  - Create `packages/backend/src/modules/filesystem/`
  - Create `filesystem.module.ts`
  - Create `filesystem.service.ts`
  - Create `filesystem.controller.ts`
  - Add module to AppModule imports

- [ ] **Add file system types to shared package**
  - Create `packages/shared/src/types/filesystem.ts`
  - Define DirectoryEntry and FileEntry interfaces
  - Add FileSystemNode discriminated union
  - Create FileMetadata interface
  - Add path validation types

- [ ] **Create ts-rest contract for file system**
  - Create `packages/shared/src/contracts/filesystem.contract.ts`
  - Define browse endpoint: `GET /filesystem/browse`
  - Define tree endpoint: `GET /filesystem/tree`
  - Define validate endpoint: `POST /filesystem/validate-path`
  - Add proper request/response types with zod schemas

### 1.2 File System Service Implementation

- [ ] **Implement FileSystemService**
  - Add path validation with security checks
  - Prevent directory traversal attacks (../ patterns)
  - Implement `browseDirectory(path, options)` method
  - Add `getDirectoryTree(path, depth)` method
  - Create `validatePath(path)` method
  - Add caching layer for frequently accessed paths

- [ ] **Add file system security**
  - Create whitelist of allowed base directories
  - Implement sandbox boundaries
  - Add file type filtering
  - Exclude system and hidden files by default
  - Add configurable security rules

- [ ] **Integrate with SessionService**
  - Validate working directory on session creation
  - Add method to change session working directory
  - Emit `session.directory.changed` event
  - Update session metadata with directory info

### 1.3 File System REST Endpoints

- [ ] **Implement FileSystemController**
  - Use ts-rest to implement contract
  - Add proper error handling for invalid paths
  - Include pagination for large directories
  - Add sorting options (name, size, date)
  - Implement caching headers

- [ ] **Add WebSocket events for file changes**
  - Listen for `session.directory.changed` events
  - Broadcast directory changes to session room
  - Add file watcher integration (optional)
  - Emit `filesystem:changed` to relevant clients

---

## 📦 Section 2: Enhanced Session Lifecycle

### 2.1 Extended Session States

- [ ] **Add new session states to shared types**
  - Add INITIALIZING state (preparing Claude Code)
  - Add RUNNING state (Claude Code executing)
  - Add STOPPING state (graceful shutdown)
  - Update SessionStatus enum in shared package
  - Add state transition validation rules

- [ ] **Update SessionService state machine**
  - Implement `canTransitionTo(from, to)` validation
  - Add `transitionState(id, newState)` method
  - Emit specific events for each transition
  - Add state history tracking
  - Include transition timestamps

- [ ] **Add session lifecycle methods**
  - Enhance `createSession()` to set INITIALIZING
  - Add `initializeSession(id)` for Claude Code setup
  - Add `startSession(id)` to transition to RUNNING
  - Add `stopSession(id)` for graceful shutdown
  - Update `deleteSession()` to handle active sessions

### 2.2 Session Metadata Enhancement

- [ ] **Extend session metadata structure**
  - Add `claudeCodeVersion` field (for future)
  - Add `resourceUsage` object (memory, CPU placeholders)
  - Add `commandHistory` array (last N commands)
  - Add `errorLog` array (recent errors)
  - Add `configuration` object (session settings)

- [ ] **Add metadata tracking**
  - Track last activity timestamp
  - Count total commands executed
  - Record session duration
  - Add peak resource usage
  - Include error statistics

### 2.3 Session Persistence Preparation

- [ ] **Create session snapshot interface**
  - Define what gets persisted
  - Add snapshot versioning
  - Create serialization methods
  - Add compression preparation
  - Plan for future database migration

- [ ] **Implement session recovery stubs**
  - Add `snapshotSession(id)` method
  - Create `recoverSession(snapshot)` stub
  - Add recovery event emissions
  - Prepare for crash recovery
  - Document future implementation needs

---

## 📦 Section 3: Claude Code Integration Preparation

### 3.1 Claude Code Service Setup

- [ ] **Create ClaudeCodeModule structure**
  - Create `packages/backend/src/modules/claude-code/`
  - Create `claude-code.module.ts`
  - Create `claude-code.service.ts`
  - Create `claude-code-mock.service.ts` for development
  - Add module to AppModule

- [ ] **Define Claude Code interfaces**
  - Create command execution interface
  - Add output streaming interface
  - Define tool usage types
  - Add planning step types
  - Create diff types for code changes

- [ ] **Implement mock Claude Code service**
  - Simulate command execution with delays
  - Generate mock output streams
  - Create sample planning steps
  - Generate mock code diffs
  - Add configurable response times

### 3.2 Output Streaming Infrastructure

- [ ] **Add streaming event types to shared**
  - Create `claudecode:output` event type
  - Add `claudecode:planning` event type
  - Create `claudecode:tool-use` event type
  - Add `claudecode:diff` event type
  - Define `claudecode:thought` event type

- [ ] **Implement streaming in WebSocket gateway**
  - Add handlers for Claude Code events
  - Implement buffering for output chunks
  - Add rate limiting for stream events
  - Create backpressure handling
  - Add stream completion events

- [ ] **Connect to session rooms**
  - Route streams to correct session room
  - Add stream subscription management
  - Implement stream filtering
  - Add stream replay capability
  - Create stream history buffer

---

## 📦 Section 4: Frontend Components

### 4.1 Directory Picker Component

- [ ] **Create DirectoryPicker component**
  - Create `packages/frontend/src/components/DirectoryPicker/`
  - Build with Radix UI Dialog as base
  - Add loading states during directory fetch
  - Include error handling UI
  - Add empty state design

- [ ] **Implement directory tree view**
  - Create TreeView component
  - Add expand/collapse with animation
  - Include folder/file icons (lucide-react)
  - Add keyboard navigation support
  - Implement virtual scrolling for large lists

- [ ] **Add directory navigation features**
  - Create breadcrumb component
  - Add path input with validation
  - Include recent directories section
  - Add favorites/bookmarks (localStorage)
  - Implement search within directory

- [ ] **Create React Query hooks for filesystem**
  - Create `useDirectoryBrowse()` hook
  - Add `useDirectoryTree()` hook
  - Create `useValidatePath()` mutation
  - Add proper cache keys with query-key-factory
  - Include prefetching for common paths

### 4.2 Session Management UI

- [ ] **Create SessionList component**
  - Create `packages/frontend/src/components/SessionList/`
  - Display sessions from `useSessions()` hook
  - Show real-time status via WebSocket updates
  - Add status badges with colors
  - Include action buttons per session

- [ ] **Build SessionCard component**
  - Show session ID, status, working directory
  - Display creation time and duration
  - Add action buttons (start, pause, stop, delete)
  - Include activity indicator
  - Show last command (when available)

- [ ] **Create SessionTabs component**
  - Implement tab-based session switching
  - Add active session context
  - Include new session tab
  - Support tab reordering (dnd-kit)
  - Add close confirmation dialog

- [ ] **Build SessionDetail panel**
  - Show comprehensive session information
  - Display command history (mock)
  - Include resource usage (mock)
  - Add session configuration display
  - Include error log viewer

### 4.3 Session Creation Flow

- [ ] **Create NewSessionWizard component**
  - Step 1: Select working directory (DirectoryPicker)
  - Step 2: Configure session (name, settings)
  - Step 3: Review and create
  - Add validation at each step
  - Include loading state during creation

- [ ] **Implement session creation integration**
  - Use `useCreateSession()` mutation
  - Handle success with redirect
  - Show error messages clearly
  - Add retry capability
  - Include progress indication

- [ ] **Add WebSocket subscription on creation**
  - Auto-join session room after creation
  - Listen for initialization events
  - Update UI with real-time status
  - Handle initialization failures
  - Show success notification

### 4.4 Status and Notifications

- [ ] **Create SessionStatusBar component**
  - Show active session count
  - Display current session info
  - Include connection status
  - Add resource usage indicators (mock)
  - Include quick actions dropdown

- [ ] **Build NotificationCenter component**
  - Create toast notifications for session events
  - Add sound notifications (optional)
  - Include notification history
  - Add notification preferences
  - Implement do-not-disturb mode

---

## 🧪 Section 5: Testing

### 5.1 Backend Testing

- [ ] **Test FileSystemService**
  - Unit test path validation
  - Test directory traversal prevention
  - Test browse functionality
  - Mock file system operations
  - Test error scenarios

- [ ] **Test enhanced SessionService**
  - Test state transitions
  - Test invalid transition attempts
  - Test metadata updates
  - Test event emissions
  - Test concurrent modifications

- [ ] **Test WebSocket enhancements**
  - Test new event handlers
  - Test room broadcasting
  - Test event ordering
  - Test error handling
  - Test subscription cleanup

### 5.2 Frontend Testing

- [ ] **Test DirectoryPicker component**
  - Test tree navigation
  - Test path validation
  - Test error states
  - Test keyboard navigation
  - Test selection handling

- [ ] **Test session components**
  - Test SessionList rendering
  - Test real-time updates
  - Test action handlers
  - Test error boundaries
  - Test loading states

- [ ] **Test integration flows**
  - Test session creation flow
  - Test directory selection
  - Test WebSocket subscriptions
  - Test cache updates
  - Test error recovery

### 5.3 E2E Testing

- [ ] **Test complete workflows**
  - Create session with directory selection
  - Verify real-time status updates
  - Test multiple session management
  - Verify cleanup on deletion
  - Test error handling

- [ ] **Test performance scenarios**
  - Large directory listings
  - Many concurrent sessions
  - Rapid status updates
  - WebSocket reconnection
  - Cache effectiveness

---

## 📊 Section 6: Documentation

### 6.1 API Documentation

- [ ] **Document new contracts**
  - Add filesystem contract documentation
  - Update session contract docs
  - Include request/response examples
  - Document error responses
  - Add rate limit information

- [ ] **Update WebSocket documentation**
  - Document new event types
  - Add sequence diagrams
  - Include subscription patterns
  - Document room behavior
  - Add troubleshooting guide

### 6.2 Component Documentation

- [ ] **Document new components**
  - Add Storybook stories (optional)
  - Include usage examples
  - Document props and types
  - Add accessibility notes
  - Include keyboard shortcuts

- [ ] **Update architecture docs**
  - Add file system module
  - Document Claude Code preparation
  - Update data flow diagrams
  - Include new components
  - Document state management

---

## ✅ Phase 2 Completion Checklist

### Core Functionality

- [ ] File system browsing works securely
- [ ] Sessions have extended lifecycle states
- [ ] Directory picker allows path selection
- [ ] Session management UI is functional
- [ ] Real-time updates work via WebSocket

### Integration

- [ ] REST and WebSocket work together seamlessly
- [ ] EventEmitter2 properly bridges updates
- [ ] React Query cache stays synchronized
- [ ] Session rooms isolate broadcasts
- [ ] Type safety maintained throughout

### Quality

- [ ] Tests cover new functionality
- [ ] Documentation is updated
- [ ] Security measures implemented
- [ ] Performance targets met
- [ ] Code follows existing patterns

### Prepared for Phase 3

- [ ] Claude Code interfaces defined
- [ ] Streaming infrastructure ready
- [ ] Mock service provides realistic simulation
- [ ] UI can handle streaming data
- [ ] Architecture supports real integration

---

## 📝 Notes Section

**For AI Agent: Add observations, issues, and deviations here as you work**

### Implementation Notes:

<!-- Add notes about implementation decisions, challenges, and solutions -->

### Deviations from Plan:

<!-- Document any changes from the original plan and reasoning -->

### Key Decisions:

<!-- Document important architectural or implementation decisions -->

### Performance Observations:

<!-- Note any performance characteristics observed -->

### Suggestions for Phase 3:

<!-- Add recommendations for Claude Code integration -->

---

**REMEMBER**: Build upon the existing architecture. Use ts-rest contracts for new REST endpoints, EventEmitter2 for REST→WebSocket communication, and session rooms for targeted broadcasting. The foundation is solid - enhance it, don't rebuild it.
