import React, { useState } from 'react'

import { Button } from 'src/components/Button'
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
}: DirectoryPathHeaderProps): React.JSX.Element {
  const [popoverOpen, setPopoverOpen] = useState(false)

  const handleDirectorySelect = (newPath: string): void => {
    onPathChange?.(newPath)
    setPopoverOpen(false)
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-lg text-gray-300 font-mono">{path}</span>

      {editable && (
        <DirectoryPicker
          open={popoverOpen}
          onOpenChange={setPopoverOpen}
          onSelect={handleDirectorySelect}
          initialPath={path}
        >
          <Button variant="secondary" className="text-sm px-3 py-1.5">
            Select Directory
          </Button>
        </DirectoryPicker>
      )}
    </div>
  )
}
