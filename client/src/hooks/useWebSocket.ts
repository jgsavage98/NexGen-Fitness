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

  const connect = useCallback(() => {
    try {
      // Connect to WebSocket server - handle Replit environment
      let wsUrl;
      if (window.location.hostname.includes('replit.dev') || window.location.hostname.includes('replit.app')) {
        // For Replit environment, use the current host with wss protocol
        wsUrl = `wss://${window.location.host}/ws`;
      } else {
        // For local development
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${protocol}//${window.location.host}/ws`;
      }
      
      console.log('Attempting WebSocket connection to:', wsUrl);
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('WebSocket connected successfully');
        setIsConnected(true);
        reconnectAttempts.current = 0;
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('WebSocket message received:', message);
          if (onMessage) {
            onMessage(message);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.current.onclose = (event) => {
        console.log('WebSocket disconnected. Code:', event.code, 'Reason:', event.reason);
        setIsConnected(false);
        
        // Attempt to reconnect if not a manual close
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          console.log(`Attempting to reconnect... (${reconnectAttempts.current}/${maxReconnectAttempts})`);
          setTimeout(() => {
            connect();
          }, 2000 * reconnectAttempts.current); // Exponential backoff
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }, [onMessage]);

  useEffect(() => {
    connect();

    // Cleanup on unmount
    return () => {
      if (ws.current) {
        ws.current.close(1000, 'Component unmounting');
      }
    };
  }, [connect]);

  const sendMessage = (message: any) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      console.log('Sending WebSocket message:', message);
      ws.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, unable to send message:', message);
    }
  };

  return { isConnected, sendMessage };
}