import { useState, useTransition } from 'react';

export default function RenameTodo({ todoId = 2 }) {
  const [title, setTitle] = useState('');
  const [savedTitle, setSavedTitle] = useState(null);
  const [error, setError] = useState(null);
  // TODO: call useTransition() to get isPending and startTransition

  function handleSave() {
    // TODO: start an async transition that PATCHes `/api/todos/${todoId}` with { title }
    // TODO: on success store the returned title, otherwise store 'Could not save the title.'
  }

  return (
    <div>
      <label>
        New title
        <input value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      {/* TODO: disable the button and show "Saving..." while the Action is pending */}
      <button onClick={handleSave}>Save</button>
      {/* TODO: render <p role="status">Saved: ...</p> or <p role="alert">...</p> */}
    </div>
  );
}
