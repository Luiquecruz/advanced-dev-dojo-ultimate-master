import { useEffect, useState } from 'react';

export default function UserCard({ userId = 1 }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setUser(null);
    fetch(`/api/users/${userId}`, { signal: controller.signal })
      .then((response) => response.json())
      .then(setUser)
      .catch((error) => {
        if (error.name !== 'AbortError') throw error;
      });
    return () => controller.abort();
  }, [userId]);

  if (!user) {
    return <p>Loading...</p>;
  }

  return (
    <article>
      <h3>{user.name}</h3>
    </article>
  );
}
