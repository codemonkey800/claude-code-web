import { Menu, X } from 'lucide-react'
import React, { useState } from 'react'

import { Button } from 'src/components/Button'
import { ChatView } from 'src/components/ChatView/ChatView'
import { cns } from 'src/utils/cns'

import { SessionSidebar } from './SessionSidebar'

interface ChatLayoutProps {
  activeSessionId: string | null
  onSessionChange: (sessionId: string | null) => void
}

export function ChatLayout({
  activeSessionId,
  onSessionChange,
}: ChatLayoutProps): React.JSX.Element {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-gray-950">
      {/* Mobile: Overlay sidebar */}
      <div
        className={cns(
          'fixed inset-y-0 left-0 z-50 w-80 bg-gray-900',
          'transform transition-transform duration-300 ease-in-out',
          'lg:relative lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <SessionSidebar
          activeSessionId={activeSessionId}
          onSessionChange={onSessionChange}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Backdrop for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile: Hamburger button */}
        <div className="lg:hidden flex items-center p-4 border-b border-gray-700">
          <Button
            variant="ghost"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            icon={
              sidebarOpen ? (
                <X className="w-6 h-6 text-gray-400" />
              ) : (
                <Menu className="w-6 h-6 text-gray-400" />
              )
            }
            className="p-2"
          />
          <h1 className="ml-3 text-lg font-semibold text-gray-100">
            Claude Code Web
          </h1>
        </div>

        <ChatView
          sessionId={activeSessionId}
          onSessionChange={onSessionChange}
        />
      </main>
    </div>
  )
}
