import { useEffect, useState } from 'react';

export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    const stored = localStorage.getItem(key);
    return stored === null ? initialValue : JSON.parse(stored);
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}

export default function App() {
  const [name, setName] = useLocalStorage('dojo:name', '');
  const [visits, setVisits] = useLocalStorage('dojo:visits', 0);

  return (
    <section>
      <label>
        Your name
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <button onClick={() => setVisits((current) => current + 1)}>Visits: {visits}</button>
      <p>Reload the preview: both values survive.</p>
    </section>
  );
}
