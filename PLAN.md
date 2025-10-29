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

- [x] **Create FileSystemModule in backend** (2025-10-26 Completed)
  - Create `packages/backend/src/modules/filesystem/`
  - Create `filesystem.module.ts`
  - Create `filesystem.service.ts`
  - Create `filesystem.controller.ts`
  - Add module to AppModule imports

- [x] **Add file system types to shared package** (2025-10-26 Completed)
  - Create `packages/shared/src/types/filesystem.ts`
  - Define DirectoryEntry and FileEntry interfaces
  - Add FileSystemNode discriminated union
  - Create FileMetadata interface
  - Add path validation types

- [x] **Create ts-rest contract for file system** (2025-10-26 Completed)
  - Create `packages/shared/src/contracts/filesystem.contract.ts`
  - Define browse endpoint: `GET /filesystem/browse`
  - Define tree endpoint: `GET /filesystem/tree`
  - Define validate endpoint: `POST /filesystem/validate-path`
  - Add proper request/response types with zod schemas

### 1.2 File System Service Implementation

- [x] **Implement FileSystemService** (2025-10-26 Completed)
  - Add path validation with security checks
  - Prevent directory traversal attacks (../ patterns)
  - Implement `browseDirectory(path, options)` method
  - Add `getDirectoryTree(path, depth)` method
  - Create `validatePath(path)` method
  - ~~Add caching layer for frequently accessed paths~~ (Deferred - not needed for Phase 2)

- [x] **Add file system security** (2025-10-26 Completed)
  - Create whitelist of allowed base directories (configurable via `FS_ALLOWED_BASE_DIR`)
  - Implement sandbox boundaries
  - Add file type filtering
  - Exclude system and hidden files by default (configurable via `FS_SHOW_HIDDEN_FILES`)
  - Add configurable security rules (all via environment variables)

- [x] **Integrate with SessionService** (2025-10-26 Completed - Core functionality)
  - Validate working directory on session creation ✓
  - ~~Add method to change session working directory~~ (Future enhancement)
  - ~~Emit `session.directory.changed` event~~ (Future enhancement)
  - ~~Update session metadata with directory info~~ (Future enhancement)

### 1.3 File System REST Endpoints

- [x] **Implement FileSystemController** (2025-10-26 Completed)
  - Use ts-rest to implement contract ✓
  - Add proper error handling for invalid paths ✓ (403, 404, 400, 500)
  - Include pagination for large directories ✓
  - Add sorting options (name, size, date, type) ✓
  - ~~Implement caching headers~~ (Future optimization)

- [x] **Add WebSocket events for file changes** (2025-10-26 Basic events added)
  - Emit `filesystem.browsed` and `filesystem.tree.loaded` events ✓
  - ~~Listen for `session.directory.changed` events~~ (Future enhancement)
  - ~~Broadcast directory changes to session room~~ (Future enhancement)
  - ~~Add file watcher integration (optional)~~ (Future enhancement)
  - ~~Emit `filesystem:changed` to relevant clients~~ (Future enhancement)

---

## 📦 Section 2: Enhanced Session Lifecycle

### 2.1 Extended Session States

- [x] **Add new session states to shared types** (2025-10-26 13:35)
  - Simplified to 3-state model: INITIALIZING, ACTIVE, TERMINATED ✓
  - Updated SessionStatus enum in shared package ✓
  - Removed PAUSED, COMPLETED, FAILED, CANCELLED states ✓
  - Updated backend SessionService to use INITIALIZING for new sessions ✓
  - Updated all test files to use new states ✓
  - Updated frontend SessionTester component status colors ✓
  - All tests passing, linting and type-checking passed ✓

- [x] **Update SessionService state machine** (2025-10-27 15:45)
  - Implement `canTransitionTo(from, to)` validation ✓
  - ~~Add `transitionState(id, newState)` method~~ (Used existing `updateSessionStatus` method)
  - Emit specific events for each transition ✓ (SESSION_STATUS_CHANGED)
  - ~~Add state history tracking~~ (Deferred - not needed for Phase 2)
  - Include transition timestamps ✓ (updatedAt field)
  - Added comprehensive state transition tests ✓
  - Validates all transitions before applying ✓

- [x] **Add session lifecycle methods** (2025-10-28 16:30)
  - Enhance `createSession()` to set INITIALIZING ✓
  - Add `startSession(id)` to transition INITIALIZING → ACTIVE ✓
  - Add `stopSession(id)` to gracefully transition to TERMINATED ✓
  - Update `deleteSession()` to async and auto-stop active sessions ✓
  - SESSION_DELETED event now emitted from service layer ✓
  - Added comprehensive tests for all lifecycle methods ✓
  - Added sleep() placeholders for async operations ✓

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

> **⏭️ DEFERRED TO FUTURE PHASE**
>
> Session persistence is being deferred to a later phase (likely Phase 3 or Phase 4) to focus on core real-time functionality first. The current in-memory session storage is sufficient for Phase 2 goals.
>
> **Rationale:**
>
> - Phase 2 focuses on real-time session management and Claude Code integration preparation
> - In-memory storage meets current requirements for active session management
> - Persistence adds complexity that can be better addressed after core features are stable
> - Allows us to better understand persistence requirements through actual usage patterns
>
> **Future Considerations:**
>
> - Database selection (SQLite, PostgreSQL, etc.)
> - Session snapshot format and versioning
> - Recovery mechanisms for crash scenarios
> - Migration strategy from in-memory to persistent storage

- [ ] **[DEFERRED] Create session snapshot interface**
  - Define what gets persisted
  - Add snapshot versioning
  - Create serialization methods
  - Add compression preparation
  - Plan for future database migration

- [ ] **[DEFERRED] Implement session recovery stubs**
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

**2025-10-27 15:45 - Session State Machine Implementation**

- Implemented complete state machine validation in `SessionService.updateSessionStatus()`
- Added private `canTransitionTo()` method enforcing these rules:
  - `INITIALIZING` → `ACTIVE` or `TERMINATED` ✅
  - `ACTIVE` → `TERMINATED` ✅
  - `TERMINATED` → (no transitions - terminal state) ❌
  - `ACTIVE` → `INITIALIZING` ❌
- EventEmitter2 integration: Emits `SESSION_STATUS_CHANGED` event with:
  - `sessionId`, `oldStatus`, `newStatus`, `session` (full object)
- WebSocket Gateway: Added `handleSessionStatusChanged()` listener
  - Broadcasts status transitions to session room clients
  - Event type: `WS_EVENTS.SESSION_STATUS`
- Added `INTERNAL_EVENTS` constants in shared package for type-safe event names
- Refactored event emission from controller to service layer (separation of concerns)
- Comprehensive test coverage: 6 state transition tests + event emission tests
- Tests verify invalid transitions return `null` and don't emit events

### Deviations from Plan:

#### Section 2.3 - Session Persistence (2025-10-28)

- **Deferred to Future Phase**: Session persistence preparation
  - Reason: Premature optimization - focus on core real-time functionality first
  - In-memory storage is sufficient for Phase 2 development and testing
  - Persistence requirements will be better understood after core features are stable
  - Will be addressed in Phase 3 or Phase 4 with proper database selection and migration strategy

#### Section 2.1 - Session State Machine (2025-10-27)

- **Deferred**: State history tracking
  - Reason: Not needed for Phase 2 core functionality
  - Can be added later if session audit trail is needed

- **Changed**: No separate `transitionState()` method
  - Reason: Existing `updateSessionStatus()` method handles this well
  - State validation integrated into existing method
  - Simpler API surface

- **Enhanced**: Added comprehensive test coverage beyond plan
  - 6 specific state transition tests
  - Event emission verification
  - Invalid transition rejection tests

### Key Decisions:

#### State Machine Architecture (2025-10-27)

1. **Service Layer Event Emission**: Moved event emission from controller to service
   - Rationale: Service layer has full context of state transitions
   - Benefit: Single source of truth for all status changes (REST + future internal transitions)
   - Controller no longer emits `session.updated` - service handles all events

2. **Type-Safe Event Constants**: Created `INTERNAL_EVENTS` object in shared package
   - Prevents typos in event names
   - Enables refactoring with TypeScript support
   - Clear separation between internal backend events and WebSocket client events

3. **Simplified State Machine**: Using existing `updateSessionStatus()` method
   - No need for separate `transitionState()` method
   - Validation integrated into existing API
   - Backwards compatible with current controller implementation

4. **Terminal State Pattern**: `TERMINATED` is truly terminal
   - Once terminated, no transitions allowed
   - Prevents resurrection of dead sessions
   - Clean lifecycle management

### Performance Observations:

<!-- Note any performance characteristics observed -->

### Suggestions for Phase 3:

<!-- Add recommendations for Claude Code integration -->

---

**REMEMBER**: Build upon the existing architecture. Use ts-rest contracts for new REST endpoints, EventEmitter2 for REST→WebSocket communication, and session rooms for targeted broadcasting. The foundation is solid - enhance it, don't rebuild it.
