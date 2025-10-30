import {
  FileSystemNodeType,
  SortBy,
  SortDirection,
} from '@claude-code-web/shared'
import { AlertCircle, Loader2 } from 'lucide-react'

import { Button } from 'src/components/Button'
import { useDirectoryBrowse } from 'src/hooks/useFilesystem'
import { cns } from 'src/utils/cns'

import { DirectoryItem } from './DirectoryItem'

interface DirectoryTreeProps {
  path: string
  level?: number
  showHidden: boolean
  expandedDirs: Set<string>
  selectedPath: string | null
  onToggleExpand: (path: string) => void
  onSelectPath: (path: string) => void
  onConfirmPath: (path: string) => void
}

export function DirectoryTree({
  path,
  level = 0,
  showHidden,
  expandedDirs,
  selectedPath,
  onToggleExpand,
  onSelectPath,
  onConfirmPath,
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
        className={cns('flex items-center gap-2 px-2 py-2 text-red-400')}
      >
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span className="text-sm flex-1">Failed to load directory</span>
        <Button
          variant="link"
          onClick={() => void refetch()}
          className="text-xs"
        >
          Retry
        </Button>
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div
        style={{ paddingLeft: `${level * 16}px` }}
        className={cns('flex items-center gap-2 px-2 py-2 text-gray-400')}
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
        className={cns('px-2 py-2 text-sm text-gray-400 italic')}
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
          onConfirmPath={onConfirmPath}
        />
      ))}
    </div>
  )
}
