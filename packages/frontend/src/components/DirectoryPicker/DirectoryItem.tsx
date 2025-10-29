import type { DirectoryEntry } from '@claude-code-web/shared'
import { ChevronRight, Folder, Lock } from 'lucide-react'
import type { KeyboardEvent } from 'react'

import { usePrefetchDirectory } from 'src/hooks/useFilesystem'

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
}: DirectoryItemProps) {
  const prefetch = usePrefetchDirectory()

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // Enter or Space: Select directory
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect()
    }

    // Right Arrow: Expand if not expanded
    if (e.key === 'ArrowRight' && !isExpanded) {
      e.preventDefault()
      onToggleExpand()
    }

    // Left Arrow: Collapse if expanded
    if (e.key === 'ArrowLeft' && isExpanded) {
      e.preventDefault()
      onToggleExpand()
    }
  }

  const handleMouseEnter = () => {
    // Prefetch directory contents on hover for better UX
    prefetch(directory.path, { showHidden })
  }

  return (
    <div>
      {/* Directory row */}
      <div
        role="treeitem"
        aria-expanded={isExpanded}
        aria-selected={isSelected}
        aria-label={`${directory.name} directory`}
        tabIndex={0}
        onMouseEnter={handleMouseEnter}
        onClick={onSelect}
        onKeyDown={handleKeyDown}
        style={{ paddingLeft: `${level * 16}px` }}
        className={`
          flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer
          transition-colors hover:bg-gray-800
          ${isSelected ? 'bg-blue-950 hover:bg-blue-900' : ''}
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset
        `}
      >
        {/* Expand/collapse chevron */}
        <button
          onClick={e => {
            e.stopPropagation()
            onToggleExpand()
          }}
          className="p-0.5 hover:bg-gray-700 rounded transition-colors flex-shrink-0 text-gray-400"
          aria-label={isExpanded ? 'Collapse directory' : 'Expand directory'}
          tabIndex={-1}
        >
          <ChevronRight
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          />
        </button>

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
        />
      )}
    </div>
  )
}

// Import DirectoryTree here to avoid circular dependency issues
// This will be defined in DirectoryTree.tsx
import { DirectoryTree } from './DirectoryTree'
