import { useEffect, useEffectEvent, useState } from 'react';

export const chatServer = {
  log: [],
  createConnection(roomId) {
    const handlers = [];
    let timer;
    return {
      on(event, handler) {
        if (event === 'connected') handlers.push(handler);
      },
      connect() {
        chatServer.log.push(`connect:${roomId}`);
        timer = setTimeout(() => handlers.forEach((handler) => handler()), 50);
      },
      disconnect() {
        clearTimeout(timer);
        chatServer.log.push(`disconnect:${roomId}`);
      },
    };
  },
};

export default function ChatRoom({ roomId, theme }) {
  const [status, setStatus] = useState('Connecting...');

  // TODO: create an Effect Event that sets the status with the latest roomId and theme

  useEffect(() => {
    setStatus('Connecting...');
    const connection = chatServer.createConnection(roomId);
    connection.on('connected', () => {
      setStatus(`Connected to ${roomId} (${theme} theme)`);
    });
    connection.connect();
    return () => connection.disconnect();
    // TODO: the effect must depend on roomId only
  }, [roomId, theme]);

  return <p role="status">{status}</p>;
}
