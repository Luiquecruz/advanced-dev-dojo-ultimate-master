import { useEffect, useState } from 'react';

export default function RoomStatus({ roomId, chat }) {
  const [count, setCount] = useState(0);
  const [prevRoomId, setPrevRoomId] = useState(roomId);

  if (roomId !== prevRoomId) {
    setPrevRoomId(roomId);
    setCount(0);
  }

  useEffect(() => {
    const unsubscribe = chat.subscribe(roomId, () => setCount((current) => current + 1));
    return unsubscribe;
  }, [roomId, chat]);

  useEffect(() => {
    document.title = `(${count}) ${roomId}`;
  }, [count, roomId]);

  return (
    <section>
      <h2>Room: {roomId}</h2>
      <p>Messages: {count}</p>
      <button onClick={() => setCount(0)}>Clear</button>
    </section>
  );
}
