import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketMessage {
  type: string;
  userId?: string;
  message?: string;
  macros?: any;
  timestamp: string;
}

export function useWebSocket(onMessage?: (message: WebSocketMessage) => void) {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const messageHandler = useRef(onMessage);
  messageHandler.current = onMessage;

  const connect = useCallback(() => {
    if (ws.current && (ws.current.readyState === WebSocket.CONNECTING || ws.current.readyState === WebSocket.OPEN)) {
      return;
    }

    try {
      let wsUrl;
      if (window.location.hostname.includes('replit.dev') || window.location.hostname.includes('replit.app')) {
        wsUrl = `wss://${window.location.host}/ws`;
      } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${protocol}//${window.location.host}/ws`;
      }
      
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('🔗 WebSocket connected to:', wsUrl);
        setIsConnected(true);
        reconnectAttempts.current = 0;
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📡 WebSocket raw message received:', data);
          if (messageHandler.current) {
            messageHandler.current(data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.current.onclose = (event) => {
        setIsConnected(false);
        
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          setTimeout(() => {
            connect();
          }, 1000 * reconnectAttempts.current);
        }
      };

      ws.current.onerror = (error) => {
        setIsConnected(false);
      };

    } catch (error) {
      console.error('WebSocket connection error:', error);
    }
  }, []);

  useEffect(() => {
    connect();
    
    return () => {
      if (ws.current) {
        ws.current.close(1000, 'Component unmounting');
        setIsConnected(false);
      }
    };
  }, [connect]);

  return { isConnected };
}