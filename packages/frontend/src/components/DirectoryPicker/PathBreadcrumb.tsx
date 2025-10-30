import { ChevronRight, Home } from 'lucide-react'
import { Fragment } from 'react'

import { Button } from 'src/components/Button'
import { cns } from 'src/utils/cns'
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
      <Button
        variant="ghost"
        onClick={() => onNavigate(baseDir)}
        icon={<Home className="w-4 h-4" />}
        className="p-1 flex-shrink-0"
        aria-label="Navigate to base directory"
        title="Base directory"
      />

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
            <Button
              variant="ghost"
              onClick={() => onNavigate(segmentPath)}
              className={cns(
                'px-2 py-1 truncate max-w-[120px]',
                isLast ? 'font-semibold text-gray-100' : 'text-gray-300',
              )}
              title={segment}
              aria-current={isLast ? 'location' : undefined}
            >
              {segment}
            </Button>
          </Fragment>
        )
      })}
    </nav>
  )
}
