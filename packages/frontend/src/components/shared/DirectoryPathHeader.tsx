import { ChevronDown, Folder } from 'lucide-react'
import { useState } from 'react'

import { DirectoryPicker } from 'src/components/DirectoryPicker/DirectoryPicker'

interface DirectoryPathHeaderProps {
  /** Directory path to display */
  path: string
  /** Whether the directory can be changed */
  editable: boolean
  /** Callback when directory path is changed (only called when editable=true) */
  onPathChange?: (path: string) => void
}

export function DirectoryPathHeader({
  path,
  editable,
  onPathChange,
}: DirectoryPathHeaderProps) {
  const [popoverOpen, setPopoverOpen] = useState(false)

  // Extract directory name from path
  const directoryName = path.split('/').filter(Boolean).pop() || path

  const handleDirectorySelect = (newPath: string) => {
    onPathChange?.(newPath)
    setPopoverOpen(false)
  }

  const content = (
    <div
      className={`flex items-center gap-2 px-4 py-3 ${
        editable
          ? 'cursor-pointer hover:bg-gray-50 transition-colors'
          : 'cursor-default'
      }`}
    >
      <Folder className="w-5 h-5 text-gray-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <h2 className="text-lg font-semibold text-gray-900 truncate">
          {directoryName}
        </h2>
        <p className="text-sm text-gray-500 truncate">{path}</p>
      </div>
      {editable && (
        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
      )}
    </div>
  )

  if (!editable) {
    return <div className="flex-1 border-b border-gray-200">{content}</div>
  }

  return (
    <DirectoryPicker
      open={popoverOpen}
      onOpenChange={setPopoverOpen}
      onSelect={handleDirectorySelect}
      initialPath={path}
    >
      <div className="flex-1 border-b border-gray-200">{content}</div>
    </DirectoryPicker>
  )
}
