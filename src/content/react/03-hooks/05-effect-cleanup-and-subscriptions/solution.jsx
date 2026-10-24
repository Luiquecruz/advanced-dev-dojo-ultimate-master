import { useEffect, useState } from 'react';

export default function ChatRoom({ roomId, createConnection }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const connection = createConnection(roomId);
    connection.connect();
    return () => connection.disconnect();
  }, [roomId, createConnection]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <section>
      <h2>Welcome to #{roomId}</h2>
      <p>{isOnline ? 'Online' : 'Offline'}</p>
    </section>
  );
}
