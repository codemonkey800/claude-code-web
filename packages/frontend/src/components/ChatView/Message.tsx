import {
  type ClaudeAssistantMessage,
  type ClaudeMessage,
  type ClaudeResultMessage,
  type ClaudeSystemMessage,
  type ClaudeToolResult,
  type ClaudeToolUse,
  type ClaudeUserMessage,
} from '@claude-code-web/shared'
import { ChevronDown, ChevronRight } from 'lucide-react'
import React, { useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

import { cns } from 'src/utils/cns'

import { Markdown } from './Markdown'

interface MessageProps {
  message: ClaudeMessage
}

export function Message({ message }: MessageProps): React.JSX.Element {
  if (message.type === 'assistant') {
    return <AssistantMessageView message={message} />
  }

  if (message.type === 'user') {
    return <UserMessageView message={message} />
  }

  if (message.type === 'system') {
    return <SystemMessageView message={message} />
  }

  if (message.type === 'result') {
    return <ResultMessageView message={message} />
  }

  // Fallback for unknown message types
  return (
    <div className="p-4 rounded-lg border bg-gray-900 border-gray-700">
      <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap break-words">
        {JSON.stringify(message, null, 2)}
      </pre>
    </div>
  )
}

function AssistantMessageView({
  message,
}: {
  message: ClaudeAssistantMessage
}): React.JSX.Element {
  return (
    <div className="p-4 rounded-lg border bg-purple-950 border-purple-800">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold px-2 py-1 rounded bg-purple-500 text-purple-100">
          Assistant
        </span>
        <span className="text-xs text-gray-500">{message.message.model}</span>
      </div>

      <div className="space-y-4">
        {message.message.content.map((content, index) => {
          if (content.type === 'text') {
            return (
              <div key={index} className="text-gray-200 prose prose-invert">
                <Markdown content={content.text} />
              </div>
            )
          }

          if (content.type === 'tool_use') {
            return <ToolUseView key={index} toolUse={content} />
          }

          return null
        })}
      </div>

      {/* Usage metrics */}
      {message.message.usage && (
        <div className="mt-3 pt-3 border-t border-purple-800 text-xs text-gray-500">
          Tokens: {message.message.usage.input_tokens} in /{' '}
          {message.message.usage.output_tokens} out
          {message.message.usage.cache_read_input_tokens !== undefined &&
            message.message.usage.cache_read_input_tokens > 0 && (
              <span className="ml-2">
                (cached: {message.message.usage.cache_read_input_tokens})
              </span>
            )}
        </div>
      )}
    </div>
  )
}

function ToolUseView({
  toolUse,
}: {
  toolUse: ClaudeToolUse
}): React.JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="border border-purple-700 rounded bg-purple-900/30 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-purple-900/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          <span className="text-sm font-semibold text-purple-300">
            Tool: {toolUse.name}
          </span>
        </div>
        <span className="text-xs text-gray-500">{toolUse.id}</span>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3">
          <div className="text-xs text-gray-400 mb-2">Input:</div>
          <SyntaxHighlighter
            language="json"
            style={vscDarkPlus}
            customStyle={{
              margin: 0,
              borderRadius: '0.375rem',
              fontSize: '0.75rem',
              maxHeight: '300px',
            }}
          >
            {JSON.stringify(toolUse.input, null, 2)}
          </SyntaxHighlighter>
        </div>
      )}
    </div>
  )
}

function UserMessageView({
  message,
}: {
  message: ClaudeUserMessage
}): React.JSX.Element {
  return (
    <div className="p-4 rounded-lg border bg-blue-950 border-blue-800">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold px-2 py-1 rounded bg-blue-500 text-blue-100">
          Tool Results
        </span>
      </div>

      <div className="space-y-3">
        {message.message.content.map((content, index) => (
          <ToolResultView key={index} toolResult={content} />
        ))}
      </div>
    </div>
  )
}

function ToolResultView({
  toolResult,
}: {
  toolResult: ClaudeToolResult
}): React.JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false)
  const contentStr = String(toolResult.content)
  const isTruncated = contentStr.length > 500
  const displayContent = isExpanded ? contentStr : contentStr.slice(0, 500)

  // Try to detect if content is JSON
  const isJSON = (() => {
    try {
      JSON.parse(contentStr)
      return true
    } catch {
      return false
    }
  })()

  return (
    <div className="border border-blue-700 rounded bg-blue-900/30 overflow-hidden">
      <div className="px-3 py-2 bg-blue-900/50">
        <div className="flex items-center justify-between">
          <span className="text-xs text-blue-300">
            Result for: {toolResult.tool_use_id}
          </span>
          {toolResult.is_error && (
            <span className="text-xs px-2 py-0.5 rounded bg-red-500 text-white">
              Error
            </span>
          )}
        </div>
      </div>

      <div className="p-3">
        {isJSON ? (
          <SyntaxHighlighter
            language="json"
            style={vscDarkPlus}
            customStyle={{
              margin: 0,
              borderRadius: '0.375rem',
              fontSize: '0.75rem',
              maxHeight: isExpanded ? 'none' : '300px',
            }}
          >
            {isExpanded
              ? JSON.stringify(JSON.parse(contentStr), null, 2)
              : JSON.stringify(JSON.parse(contentStr.slice(0, 500)), null, 2)}
          </SyntaxHighlighter>
        ) : (
          <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap break-words overflow-x-auto max-h-[300px]">
            {displayContent}
          </pre>
        )}

        {isTruncated && !isExpanded && (
          <button
            onClick={() => setIsExpanded(true)}
            className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline"
          >
            Show more ({contentStr.length - 500} more characters)
          </button>
        )}

        {isExpanded && isTruncated && (
          <button
            onClick={() => setIsExpanded(false)}
            className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline"
          >
            Show less
          </button>
        )}
      </div>
    </div>
  )
}

function SystemMessageView({
  message,
}: {
  message: ClaudeSystemMessage
}): React.JSX.Element {
  if (message.subtype === 'init') {
    return (
      <div className="p-4 rounded-lg border bg-gray-800 border-gray-700">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold px-2 py-1 rounded bg-gray-500 text-gray-100">
            Session Initialized
          </span>
        </div>
        <div className="text-xs text-gray-400 space-y-1">
          {message.model && <div>Model: {message.model}</div>}
          {message.cwd && <div>Working Directory: {message.cwd}</div>}
          {message.claude_code_version && (
            <div>Claude Code: v{message.claude_code_version}</div>
          )}
        </div>
      </div>
    )
  }

  // For other system messages, show minimal info
  return (
    <div className="p-3 rounded border bg-gray-800 border-gray-700">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold px-2 py-1 rounded bg-gray-500 text-gray-100">
          System
        </span>
        {message.subtype && (
          <span className="text-xs text-gray-400">{message.subtype}</span>
        )}
      </div>
    </div>
  )
}

function ResultMessageView({
  message,
}: {
  message: ClaudeResultMessage
}): React.JSX.Element {
  const isError = message.subtype === 'error' || message.is_error
  const durationSec = (message.duration_ms / 1000).toFixed(2)

  return (
    <div
      className={cns(
        'p-4 rounded-lg border',
        isError ? 'bg-red-950 border-red-800' : 'bg-green-950 border-green-800',
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className={cns(
            'text-xs font-semibold px-2 py-1 rounded',
            isError ? 'bg-red-500 text-red-100' : 'bg-green-500 text-green-100',
          )}
        >
          {isError ? 'Query Failed' : 'Query Completed'}
        </span>
      </div>

      <div className="text-sm text-gray-300 space-y-1">
        <div>Duration: {durationSec}s</div>
        {message.num_turns !== undefined && (
          <div>Turns: {message.num_turns}</div>
        )}
        {message.total_cost_usd !== undefined && (
          <div>Cost: ${message.total_cost_usd.toFixed(4)}</div>
        )}
      </div>

      {typeof message.result === 'string' && message.result && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="text-sm text-gray-200 prose prose-invert">
            <Markdown content={message.result} />
          </div>
        </div>
      )}
    </div>
  )
}
