interface WebSocketMessage {
  type: string;
  userId?: string;
  message?: string;
  macros?: any;
  timestamp: string;
}

export function useWebSocket(onMessage?: (message: WebSocketMessage) => void) {
  // WebSocket functionality disabled for performance optimization
  return { isConnected: false };
}