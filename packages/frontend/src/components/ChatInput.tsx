import { Send } from 'lucide-react'
import { type KeyboardEvent, useState } from 'react'

import { Button } from 'src/components/Button'
import { cns } from 'src/utils/cns'

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
        className={cns(
          'flex-1 resize-none rounded-lg border border-gray-600',
          'bg-gray-900 text-gray-100 placeholder:text-gray-500 px-4 py-3',
          'focus:outline-none focus:ring-2 focus:ring-purple-500',
          'disabled:bg-gray-800 disabled:cursor-not-allowed',
        )}
        style={{
          minHeight: '52px',
          maxHeight: '200px',
        }}
      />
      <Button
        variant="primary"
        onClick={handleSubmit}
        disabled={isSubmitDisabled}
        loading={isLoading}
        icon={<Send className="w-5 h-5" />}
        className="px-6 py-3"
        style={{
          minHeight: '52px',
        }}
      />
    </div>
  )
}
