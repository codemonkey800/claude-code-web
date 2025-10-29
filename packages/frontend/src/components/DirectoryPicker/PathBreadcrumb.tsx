import { ChevronRight, Home } from 'lucide-react'
import { Fragment } from 'react'

interface PathBreadcrumbProps {
  path: string
  onNavigate: (path: string) => void
}

export function PathBreadcrumb({ path, onNavigate }: PathBreadcrumbProps) {
  // Split path into segments, filtering out empty strings
  const segments = path.split('/').filter(Boolean)

  return (
    <nav
      aria-label="Directory breadcrumb"
      className="flex items-center gap-1 text-sm overflow-x-auto"
    >
      {/* Root/Home button */}
      <button
        onClick={() => onNavigate('/')}
        className="p-1 hover:bg-gray-700 rounded transition-colors flex-shrink-0 text-gray-300"
        aria-label="Navigate to root directory"
        title="Root directory"
      >
        <Home className="w-4 h-4" />
      </button>

      {/* Path segments */}
      {segments.map((segment, index) => {
        // Build the full path up to this segment
        const segmentPath = '/' + segments.slice(0, index + 1).join('/')
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
