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

  const onConnected = useEffectEvent((connectedRoomId) => {
    setStatus(`Connected to ${connectedRoomId} (${theme} theme)`);
  });

  useEffect(() => {
    setStatus('Connecting...');
    const connection = chatServer.createConnection(roomId);
    connection.on('connected', () => {
      onConnected(roomId);
    });
    connection.connect();
    return () => connection.disconnect();
  }, [roomId]);

  return <p role="status">{status}</p>;
}
