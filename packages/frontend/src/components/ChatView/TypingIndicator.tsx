import React from 'react'

export function TypingIndicator(): React.JSX.Element {
  return (
    <div className="p-4 rounded-lg border bg-purple-950 border-purple-800 w-fit">
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold px-2 py-1 rounded bg-purple-500 text-purple-100">
          Assistant
        </span>
        <div className="flex items-center gap-1">
          <span className="animate-pulse-dot text-purple-400 text-lg leading-none animation-delay-0">
            ●
          </span>
          <span className="animate-pulse-dot text-purple-400 text-lg leading-none animation-delay-150">
            ●
          </span>
          <span className="animate-pulse-dot text-purple-400 text-lg leading-none animation-delay-300">
            ●
          </span>
        </div>
      </div>
    </div>
  )
}
