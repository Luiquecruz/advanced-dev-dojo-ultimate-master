import { useEffect, useState } from 'react';

export default function ChatRoom({ roomId, createConnection }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // TODO: reconnect when roomId changes (fix the dependency array)
  // TODO: return a cleanup that disconnects
  useEffect(() => {
    const connection = createConnection(roomId);
    connection.connect();
  }, []);

  // TODO: return a cleanup that removes both listeners
  useEffect(() => {
    window.addEventListener('online', () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));
  }, []);

  return (
    <section>
      <h2>Welcome to #{roomId}</h2>
      <p>{isOnline ? 'Online' : 'Offline'}</p>
    </section>
  );
}
