import * as Toast from '@radix-ui/react-toast'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

import { queryClient } from 'src/api/queryClient'
import { ConnectionStatusToast } from 'src/components/ConnectionStatusToast'
import { MessageTester } from 'src/components/MessageTester'
import { SessionTester } from 'src/components/SessionTester'
import { SocketProvider } from 'src/context/SocketContext'

function AppContent() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Claude Code Web
          </h1>
          <p className="text-lg text-gray-600">
            WebSocket Communication Testing Interface
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MessageTester />
          <SessionTester />
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <Toast.Provider swipeDirection="right">
      <QueryClientProvider client={queryClient}>
        <SocketProvider>
          <AppContent />
          <ConnectionStatusToast />
          <Toast.Viewport className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-96 max-w-full p-4" />
        </SocketProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </Toast.Provider>
  )
}

export default App
