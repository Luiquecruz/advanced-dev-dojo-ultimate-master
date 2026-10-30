import { useEffect, useState } from 'react';

export function useUserDirectory() {
  const [status, setStatus] = useState('loading');
  const [allUsers, setAllUsers] = useState([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/users')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (active) {
          setAllUsers(data);
          setStatus('success');
        }
      })
      .catch(() => {
        if (active) setStatus('error');
      });
    return () => {
      active = false;
    };
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const users = allUsers.filter((user) => user.name.toLowerCase().includes(normalizedQuery));
  return { status, users, query, setQuery };
}
