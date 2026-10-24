import { useState } from 'react';

export function useLocalStorage(key, initialValue) {
  // TODO: lazily read localStorage.getItem(key) and JSON.parse it; fall back to initialValue when it is null
  const [value, setValue] = useState(initialValue);

  // TODO: write JSON.stringify(value) to localStorage whenever key or value changes

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
