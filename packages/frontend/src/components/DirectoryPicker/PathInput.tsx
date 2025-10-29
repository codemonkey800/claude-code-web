import { CheckCircle, Loader2, XCircle } from 'lucide-react'
import type { KeyboardEvent } from 'react'
import { useEffect, useState } from 'react'

import { useValidatePath } from 'src/hooks/useFilesystem'

interface PathInputProps {
  value: string
  onChange: (path: string) => void
}

export function PathInput({ value, onChange }: PathInputProps) {
  const [localValue, setLocalValue] = useState(value)
  const { mutate: validate, isPending, isError, data } = useValidatePath()

  // Sync local value with external value changes
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  // Debounced validation
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only validate if value changed and is not empty
      if (localValue && localValue !== value) {
        validate({ path: localValue })
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(timer)
  }, [localValue, value, validate])

  const handleSubmit = () => {
    // Only apply change if validation succeeded
    if (data?.valid && data.resolvedPath) {
      onChange(data.resolvedPath)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Enter: Apply validated path
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }

    // Escape: Revert to original value
    if (e.key === 'Escape') {
      setLocalValue(value)
    }
  }

  return (
    <div className="space-y-1">
      <div className="relative">
        <input
          type="text"
          value={localValue}
          onChange={e => setLocalValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSubmit}
          placeholder="/path/to/directory"
          aria-label="Directory path input"
          aria-invalid={isError || data?.valid === false}
          aria-describedby={
            data?.error ? 'path-input-error' : 'path-input-hint'
          }
          className={`
            w-full px-3 py-2 pr-10 border rounded-md text-sm
            bg-gray-800 text-gray-100 placeholder:text-gray-500
            focus:outline-none focus:ring-2 focus:ring-blue-500
            transition-colors
            ${isError || data?.valid === false ? 'border-red-500 bg-red-950' : 'border-gray-600'}
            ${data?.valid ? 'border-green-500 bg-green-950' : ''}
          `}
        />

        {/* Status indicator */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          {isPending && (
            <Loader2
              className="w-4 h-4 animate-spin text-gray-400"
              aria-label="Validating path"
            />
          )}
          {!isPending && data?.valid && (
            <CheckCircle
              className="w-4 h-4 text-green-400"
              aria-label="Valid path"
            />
          )}
          {!isPending && (isError || data?.valid === false) && (
            <XCircle
              className="w-4 h-4 text-red-400"
              aria-label="Invalid path"
            />
          )}
        </div>
      </div>

      {/* Helper text or error message */}
      {data?.error && (
        <p id="path-input-error" className="text-xs text-red-400" role="alert">
          {data.error}
        </p>
      )}
      {!data?.error && (
        <p id="path-input-hint" className="text-xs text-gray-400">
          Press Enter to apply or Escape to cancel
        </p>
      )}
    </div>
  )
}
