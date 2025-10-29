import {
  FileSystemNodeType,
  SortBy,
  SortDirection,
} from '@claude-code-web/shared'
import { AlertCircle, Loader2 } from 'lucide-react'

import { useDirectoryBrowse } from 'src/hooks/useFilesystem'

import { DirectoryItem } from './DirectoryItem'

interface DirectoryTreeProps {
  path: string
  level?: number
  showHidden: boolean
  expandedDirs: Set<string>
  selectedPath: string | null
  onToggleExpand: (path: string) => void
  onSelectPath: (path: string) => void
}

export function DirectoryTree({
  path,
  level = 0,
  showHidden,
  expandedDirs,
  selectedPath,
  onToggleExpand,
  onSelectPath,
}: DirectoryTreeProps) {
  const { data, isLoading, error, refetch } = useDirectoryBrowse(path, {
    showHidden,
    sortBy: SortBy.NAME,
    sortDirection: SortDirection.ASC,
  })

  // Error state
  if (error) {
    return (
      <div
        style={{ paddingLeft: `${level * 16}px` }}
        className="flex items-center gap-2 px-2 py-2 text-red-600"
      >
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span className="text-sm flex-1">Failed to load directory</span>
        <button
          onClick={() => void refetch()}
          className="text-xs underline hover:no-underline"
        >
          Retry
        </button>
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div
        style={{ paddingLeft: `${level * 16}px` }}
        className="flex items-center gap-2 px-2 py-2 text-gray-500"
      >
        <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
        <span className="text-sm">Loading...</span>
      </div>
    )
  }

  // Filter to only show directories (not files)
  const directories =
    data?.entries.filter(
      entry => entry.type === FileSystemNodeType.DIRECTORY,
    ) || []

  // Empty state
  if (directories.length === 0) {
    return (
      <div
        style={{ paddingLeft: `${level * 16}px` }}
        className="px-2 py-2 text-sm text-gray-500 italic"
      >
        No directories found
      </div>
    )
  }

  return (
    <div role={level === 0 ? 'tree' : 'group'} aria-label="Directory tree">
      {directories.map(directory => (
        <DirectoryItem
          key={directory.path}
          directory={directory}
          level={level}
          isExpanded={expandedDirs.has(directory.path)}
          isSelected={selectedPath === directory.path}
          showHidden={showHidden}
          expandedDirs={expandedDirs}
          selectedPath={selectedPath}
          onToggleExpand={() => onToggleExpand(directory.path)}
          onSelect={() => onSelectPath(directory.path)}
          onToggleExpandPath={onToggleExpand}
          onSelectPath={onSelectPath}
        />
      ))}
    </div>
  )
}
