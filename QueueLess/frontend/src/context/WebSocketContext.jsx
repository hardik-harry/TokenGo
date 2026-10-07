import React, { createContext, useContext, useEffect, useState } from 'react';

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children, officeId, serviceId, tokenId }) => {
  const [socketData, setSocketData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!officeId || !serviceId) return;

    let wsUrl = `ws://localhost:8000/api/v1/ws/queue/${officeId}/${serviceId}`;
    if (tokenId) wsUrl += `?token_id=${tokenId}`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => setIsConnected(true);
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setSocketData(data);
      } catch (e) {
        console.error("WS Parse error", e);
      }
    };

    ws.onclose = () => setIsConnected(false);

    return () => {
      ws.close();
    };
  }, [officeId, serviceId, tokenId]);

  return (
    <WebSocketContext.Provider value={{ socketData, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => useContext(WebSocketContext);
