import { useEffect, useState } from 'react';

export default function UserCard({ userId = 1 }) {
  const [user, setUser] = useState(null);

  // Write your effect here: fetch `/api/users/${userId}` and store the result

  if (!user) {
    return <p>Loading...</p>;
  }

  return (
    <article>
      {/* Render the user's name inside an <h3> */}
    </article>
  );
}
