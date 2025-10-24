/**
 * Frontend-specific Socket.io type definitions
 */

import type { Socket } from 'socket.io-client'

/**
 * Connection status states
 */
export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}

/**
 * Socket context state interface
 */
export interface SocketContextState {
  socket: Socket | null
  connectionStatus: ConnectionStatus
  error: string | null
  isConnected: boolean
  reconnectAttempt: number
}
