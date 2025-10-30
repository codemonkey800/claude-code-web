import type { DirectoryEntry } from '@claude-code-web/shared'
import { ChevronRight, Folder, Lock } from 'lucide-react'
import type { KeyboardEvent } from 'react'
import React from 'react'

import { usePrefetchDirectory } from 'src/hooks/useFilesystem'
import { cns } from 'src/utils/cns'

interface DirectoryItemProps {
  directory: DirectoryEntry
  level: number
  isExpanded: boolean
  isSelected: boolean
  showHidden: boolean
  expandedDirs: Set<string>
  selectedPath: string | null
  onToggleExpand: () => void
  onSelect: () => void
  onToggleExpandPath: (path: string) => void
  onSelectPath: (path: string) => void
  onConfirmPath: (path: string) => void
}

export function DirectoryItem({
  directory,
  level,
  isExpanded,
  isSelected,
  showHidden,
  expandedDirs,
  selectedPath,
  onToggleExpand,
  onSelect,
  onToggleExpandPath,
  onSelectPath,
  onConfirmPath,
}: DirectoryItemProps): React.JSX.Element {
  const prefetch = usePrefetchDirectory()

  // Determine if directory is expandable (has subdirectories)
  // subdirectoryCount === 0 means no subdirectories, hide chevron
  // subdirectoryCount > 0 means has subdirectories, show chevron
  // subdirectoryCount === undefined means unknown (loading/error), show chevron for backward compatibility
  const isExpandable =
    directory.subdirectoryCount === undefined || directory.subdirectoryCount > 0

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    // Enter or Space: Select directory
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect()
    }

    // Right Arrow: Expand if not expanded and expandable
    if (e.key === 'ArrowRight' && !isExpanded && isExpandable) {
      e.preventDefault()
      onToggleExpand()
    }

    // Left Arrow: Collapse if expanded
    if (e.key === 'ArrowLeft' && isExpanded) {
      e.preventDefault()
      onToggleExpand()
    }
  }

  const handleMouseEnter = (): void => {
    // Prefetch directory contents on hover for better UX
    if (isExpandable) {
      prefetch(directory.path, { showHidden })
    }
  }

  const handleClick = (): void => {
    // Select this directory (updates selectedPath state)
    onSelect()

    // Toggle expansion for expandable directories
    if (isExpandable) {
      onToggleExpand()
    }
  }

  return (
    <div>
      {/* Directory row */}
      <div
        role="treeitem"
        aria-expanded={isExpandable ? isExpanded : undefined}
        aria-selected={isSelected}
        aria-label={`${directory.name} directory`}
        tabIndex={0}
        onMouseEnter={handleMouseEnter}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        style={{ paddingLeft: `${level * 16}px` }}
        className={cns(
          'flex items-center gap-2 px-2 py-1.5 rounded',
          'transition-colors hover:bg-gray-800',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset',
          'select-none',
          isExpandable && 'cursor-pointer',
          isSelected && 'bg-blue-950 hover:bg-blue-900',
        )}
      >
        {/* Expand/collapse chevron (only show if directory is expandable) */}
        {isExpandable ? (
          <ChevronRight
            className={cns(
              'w-4 h-4 transition-transform flex-shrink-0 text-gray-400',
              isExpanded && 'rotate-90',
            )}
            aria-hidden="true"
          />
        ) : (
          <div className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
        )}

        {/* Folder icon */}
        <Folder className="w-4 h-4 text-blue-400 flex-shrink-0" />

        {/* Directory name */}
        <span className="flex-1 truncate text-sm text-gray-200">
          {directory.name}
        </span>

        {/* Indicators */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Not readable indicator */}
          {!directory.metadata.isReadable && (
            <Lock className="w-3 h-3 text-red-400" aria-label="Not readable" />
          )}

          {/* Item count (if available) */}
          {directory.itemCount !== undefined && (
            <span className="text-xs text-gray-400">
              ({directory.itemCount})
            </span>
          )}
        </div>
      </div>

      {/* Render children recursively if expanded */}
      {isExpanded && (
        <DirectoryTree
          path={directory.path}
          level={level + 1}
          showHidden={showHidden}
          expandedDirs={expandedDirs}
          selectedPath={selectedPath}
          onToggleExpand={onToggleExpandPath}
          onSelectPath={onSelectPath}
          onConfirmPath={onConfirmPath}
        />
      )}
    </div>
  )
}

// Import DirectoryTree here to avoid circular dependency issues
// This will be defined in DirectoryTree.tsx
import { DirectoryTree } from './DirectoryTree'
