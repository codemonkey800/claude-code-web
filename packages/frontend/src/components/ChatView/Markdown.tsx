import React from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import remarkGfm from 'remark-gfm'

interface MarkdownProps {
  content: string
}

// Helper to safely extract text from ReactNode children
function extractTextFromChildren(children: React.ReactNode): string {
  if (typeof children === 'string') {
    return children
  }
  if (typeof children === 'number') {
    return children.toString()
  }
  if (Array.isArray(children)) {
    return children.map(extractTextFromChildren).join('')
  }
  // For other types (objects, etc), return empty string
  return ''
}

export function Markdown({ content }: MarkdownProps): React.JSX.Element {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code: ({ node: _node, className, children, ...props }) => {
          const match = /language-(\w+)/.exec(className || '')
          const language = match ? match[1] : ''
          const codeText = extractTextFromChildren(children)
          const isInline = (props as { inline?: boolean }).inline !== false

          if (!isInline && language) {
            return (
              <SyntaxHighlighter
                style={vscDarkPlus}
                language={language}
                PreTag="div"
                customStyle={{
                  margin: 0,
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                }}
              >
                {codeText.replace(/\n$/, '')}
              </SyntaxHighlighter>
            )
          }

          return (
            <code
              className="bg-gray-800 px-1.5 py-0.5 rounded text-sm"
              {...props}
            >
              {codeText}
            </code>
          )
        },
        // Style links
        a: ({ children, ...props }) => (
          <a
            className="text-blue-400 hover:text-blue-300 underline"
            target="_blank"
            rel="noopener noreferrer"
            {...props}
          >
            {children}
          </a>
        ),
        // Style headings
        h1: ({ children, ...props }) => (
          <h1 className="text-2xl font-bold mb-4 mt-6" {...props}>
            {children}
          </h1>
        ),
        h2: ({ children, ...props }) => (
          <h2 className="text-xl font-bold mb-3 mt-5" {...props}>
            {children}
          </h2>
        ),
        h3: ({ children, ...props }) => (
          <h3 className="text-lg font-bold mb-2 mt-4" {...props}>
            {children}
          </h3>
        ),
        // Style lists
        ul: ({ children, ...props }) => (
          <ul className="list-disc list-inside mb-4 space-y-2" {...props}>
            {children}
          </ul>
        ),
        ol: ({ children, ...props }) => (
          <ol className="list-decimal list-inside mb-4 space-y-2" {...props}>
            {children}
          </ol>
        ),
        // Style paragraphs
        p: ({ children, ...props }) => (
          <p className="mb-4 leading-relaxed" {...props}>
            {children}
          </p>
        ),
        // Style blockquotes
        blockquote: ({ children, ...props }) => (
          <blockquote
            className="border-l-4 border-gray-600 pl-4 italic my-4"
            {...props}
          >
            {children}
          </blockquote>
        ),
        // Style tables
        table: ({ children, ...props }) => (
          <div className="overflow-x-auto mb-4">
            <table className="min-w-full border-collapse" {...props}>
              {children}
            </table>
          </div>
        ),
        th: ({ children, ...props }) => (
          <th
            className="border border-gray-600 px-4 py-2 bg-gray-800"
            {...props}
          >
            {children}
          </th>
        ),
        td: ({ children, ...props }) => (
          <td className="border border-gray-600 px-4 py-2" {...props}>
            {children}
          </td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
