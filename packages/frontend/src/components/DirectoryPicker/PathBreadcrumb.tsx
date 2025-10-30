import { ChevronRight, Home } from 'lucide-react'
import { Fragment } from 'react'

import { getRelativePath } from 'src/utils/path'

interface PathBreadcrumbProps {
  path: string
  baseDir: string
  onNavigate: (path: string) => void
}

export function PathBreadcrumb({
  path,
  baseDir,
  onNavigate,
}: PathBreadcrumbProps) {
  // Get path relative to base directory
  const relativePath = getRelativePath(path, baseDir)

  // Split relative path into segments, filtering out empty strings
  // If relativePath is empty (at base directory), segments will be empty array
  const segments = relativePath ? relativePath.split('/').filter(Boolean) : []

  return (
    <nav
      aria-label="Directory breadcrumb"
      className="flex items-center gap-1 text-sm overflow-x-auto"
    >
      {/* Home button (navigates to base directory) */}
      <button
        onClick={() => onNavigate(baseDir)}
        className="p-1 hover:bg-gray-700 rounded transition-colors flex-shrink-0 text-gray-300"
        aria-label="Navigate to base directory"
        title="Base directory"
      >
        <Home className="w-4 h-4" />
      </button>

      {/* Path segments */}
      {segments.map((segment, index) => {
        // Build the full path up to this segment relative to baseDir
        const segmentPath =
          baseDir + '/' + segments.slice(0, index + 1).join('/')
        const isLast = index === segments.length - 1

        return (
          <Fragment key={segmentPath}>
            {/* Separator chevron */}
            <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />

            {/* Segment button */}
            <button
              onClick={() => onNavigate(segmentPath)}
              className={`
                px-2 py-1 rounded hover:bg-gray-700 transition-colors
                truncate max-w-[120px]
                ${isLast ? 'font-semibold text-gray-100' : 'text-gray-300'}
              `}
              title={segment}
              aria-current={isLast ? 'location' : undefined}
            >
              {segment}
            </button>
          </Fragment>
        )
      })}
    </nav>
  )
}
