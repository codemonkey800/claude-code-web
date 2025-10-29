import * as Toast from '@radix-ui/react-toast'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

import { queryClient } from 'src/api/queryClient'
import { ConnectedView } from 'src/components/ConnectedView'
import { ConnectionStatusToast } from 'src/components/ConnectionStatusToast'
import { LandingPage } from 'src/components/LandingPage'
import { SocketProvider } from 'src/context/SocketContext'
import { useSocket } from 'src/hooks/useSocket'
import { ConnectionStatus } from 'src/types/socket'

function AppContent() {
  const { connectionStatus } = useSocket()

  return (
    <>
      {connectionStatus === ConnectionStatus.CONNECTED ? (
        <ConnectedView />
      ) : (
        <LandingPage />
      )}
    </>
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
