import { SocketProvider } from 'src/context/SocketContext'
import { useSocket } from 'src/hooks/useSocket'
import { ConnectionStatus } from 'src/types/socket'

function AppContent() {
  const { connectionStatus, isConnected, error, reconnectAttempt } = useSocket()

  const getStatusColor = () => {
    switch (connectionStatus) {
      case ConnectionStatus.CONNECTED:
        return 'bg-green-100 border-green-400'
      case ConnectionStatus.CONNECTING:
      case ConnectionStatus.RECONNECTING:
        return 'bg-yellow-100 border-yellow-400'
      case ConnectionStatus.ERROR:
      case ConnectionStatus.DISCONNECTED:
        return 'bg-red-100 border-red-400'
      default:
        return 'bg-gray-100 border-gray-400'
    }
  }

  const getStatusText = () => {
    switch (connectionStatus) {
      case ConnectionStatus.CONNECTED:
        return '✅ Connected to WebSocket server'
      case ConnectionStatus.CONNECTING:
        return '🔄 Connecting to server...'
      case ConnectionStatus.RECONNECTING:
        return `🔄 Reconnecting... (Attempt ${reconnectAttempt})`
      case ConnectionStatus.DISCONNECTED:
        return '❌ Disconnected from server'
      case ConnectionStatus.ERROR:
        return `❌ Connection error: ${error || 'Unknown error'}`
      default:
        return 'Unknown status'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Claude Code Web - Frontend
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Architecture validation in progress...
          </p>

          {/* Connection Status */}
          <div className={`p-4 border rounded mb-4 ${getStatusColor()}`}>
            <p className="font-semibold">{getStatusText()}</p>
            {isConnected && (
              <p className="text-sm mt-2">WebSocket connection active</p>
            )}
          </div>

          {/* Tailwind CSS Verification */}
          <div className="mt-6 p-4 bg-green-100 border border-green-400 rounded">
            <p className="text-green-800 font-semibold">
              ✅ Tailwind CSS is working!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <SocketProvider>
      <AppContent />
    </SocketProvider>
  )
}

export default App
