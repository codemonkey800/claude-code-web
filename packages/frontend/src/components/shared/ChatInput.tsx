import { Loader2, Send } from 'lucide-react'
import { type KeyboardEvent, useState } from 'react'

interface ChatInputProps {
  onSubmit: (prompt: string) => void
  placeholder?: string
  disabled?: boolean
  isLoading?: boolean
}

export function ChatInput({
  onSubmit,
  placeholder = 'Send a message...',
  disabled = false,
  isLoading = false,
}: ChatInputProps) {
  const [value, setValue] = useState('')

  const handleSubmit = () => {
    if (!value.trim() || disabled || isLoading) return

    onSubmit(value.trim())
    setValue('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const isSubmitDisabled = !value.trim() || disabled || isLoading

  return (
    <div className="flex gap-3 items-end">
      <textarea
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || isLoading}
        rows={1}
        className="flex-1 resize-none rounded-lg border border-gray-600 bg-gray-900 text-gray-100 placeholder:text-gray-500 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-800 disabled:cursor-not-allowed"
        style={{
          minHeight: '52px',
          maxHeight: '200px',
        }}
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitDisabled}
        className="px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
        style={{
          minHeight: '52px',
        }}
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Send className="w-5 h-5" />
        )}
      </button>
    </div>
  )
}
