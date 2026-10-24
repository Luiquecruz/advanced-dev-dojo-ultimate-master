import { useState, useTransition } from 'react';

export default function RenameTodo({ todoId = 2 }) {
  const [title, setTitle] = useState('');
  const [savedTitle, setSavedTitle] = useState(null);
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const response = await fetch(`/api/todos/${todoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (!response.ok) {
        startTransition(() => {
          setSavedTitle(null);
          setError('Could not save the title.');
        });
        return;
      }
      const todo = await response.json();
      startTransition(() => {
        setError(null);
        setSavedTitle(todo.title);
      });
    });
  }

  return (
    <div>
      <label>
        New title
        <input value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <button onClick={handleSave} disabled={isPending}>
        {isPending ? 'Saving...' : 'Save'}
      </button>
      {savedTitle && <p role="status">Saved: {savedTitle}</p>}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
