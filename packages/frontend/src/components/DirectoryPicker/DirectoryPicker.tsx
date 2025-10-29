import * as Popover from '@radix-ui/react-popover'
import * as ScrollArea from '@radix-ui/react-scroll-area'
import type React from 'react'
import { useEffect, useRef, useState } from 'react'

import { cns } from 'src/utils/cns'

import { DirectoryTree } from './DirectoryTree'
import { PathBreadcrumb } from './PathBreadcrumb'
import { PathInput } from './PathInput'

interface DirectoryPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (path: string) => void
  initialPath?: string
  children: React.ReactNode
}

export function DirectoryPicker({
  open,
  onOpenChange,
  onSelect,
  initialPath = '/',
  children,
}: DirectoryPickerProps) {
  const [currentPath, setCurrentPath] = useState(initialPath)
  const [selectedPath, setSelectedPath] = useState<string | null>(initialPath)
  const [showHidden, setShowHidden] = useState(false)
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(
    new Set([initialPath]),
  )

  const pathInputRef = useRef<HTMLDivElement>(null)

  // Reset state when popover opens
  useEffect(() => {
    if (open) {
      setCurrentPath(initialPath)
      setSelectedPath(initialPath)
      setExpandedDirs(new Set([initialPath]))
    }
  }, [open, initialPath])

  const handleToggleExpand = (path: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  const handleSelectPath = (path: string) => {
    setSelectedPath(path)
  }

  const handleNavigate = (path: string) => {
    setCurrentPath(path)
    setSelectedPath(path)
    // Ensure the navigated path is expanded
    setExpandedDirs(prev => new Set(prev).add(path))
  }

  const handleConfirmSelection = () => {
    if (selectedPath) {
      onSelect(selectedPath)
    }
  }

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>{children}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          side="bottom"
          sideOffset={4}
          className={cns(
            'w-[600px] max-h-[500px]',
            'bg-gray-900 rounded-lg shadow-xl border border-gray-700',
            'animate-in fade-in zoom-in-95',
            'flex flex-col',
            'z-50',
          )}
        >
          {/* Breadcrumb navigation */}
          <div className="px-4 py-3 bg-gray-800 border-b border-gray-700 rounded-t-lg">
            <PathBreadcrumb path={currentPath} onNavigate={handleNavigate} />
          </div>

          {/* Path input */}
          <div
            className="px-4 py-3 border-b border-gray-700"
            ref={pathInputRef}
          >
            <PathInput value={currentPath} onChange={handleNavigate} />
          </div>

          {/* Directory tree (scrollable) */}
          <ScrollArea.Root className="flex-1 overflow-hidden">
            <ScrollArea.Viewport className="h-full w-full">
              <div className="p-4 min-h-[200px]">
                <DirectoryTree
                  path={currentPath}
                  showHidden={showHidden}
                  expandedDirs={expandedDirs}
                  selectedPath={selectedPath}
                  onToggleExpand={handleToggleExpand}
                  onSelectPath={handleSelectPath}
                />
              </div>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar
              orientation="vertical"
              className="flex w-2.5 touch-none select-none bg-gray-800 p-0.5"
            >
              <ScrollArea.Thumb className="relative flex-1 rounded-full bg-gray-600" />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>

          {/* Actions footer */}
          <div className="flex items-center justify-between p-4 border-t border-gray-700 bg-gray-800 rounded-b-lg">
            {/* Show hidden files toggle */}
            <label className="flex items-center gap-2 text-sm cursor-pointer text-gray-200">
              <input
                type="checkbox"
                checked={showHidden}
                onChange={e => setShowHidden(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <span>Show hidden files</span>
            </label>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className={cns(
                  'px-4 py-2 text-sm font-medium text-gray-200',
                  'bg-gray-700 hover:bg-gray-600 border border-gray-600',
                  'rounded-md transition-colors',
                )}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSelection}
                disabled={!selectedPath}
                className={cns(
                  'px-4 py-2 text-sm font-medium text-white',
                  'bg-blue-600 hover:bg-blue-500',
                  'disabled:bg-gray-700 disabled:cursor-not-allowed',
                  'rounded-md transition-colors',
                )}
              >
                Select
              </button>
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
