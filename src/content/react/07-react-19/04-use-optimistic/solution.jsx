import { startTransition, useOptimistic, useState } from 'react';

export default function TodoList({ initialTodos = [] }) {
  const [todos, setTodos] = useState(initialTodos);
  const [error, setError] = useState(null);
  const [optimisticTodos, addOptimisticTodo] = useOptimistic(todos, (current, newTodo) => [
    ...current,
    { ...newTodo, pending: true },
  ]);

  async function addTodo(formData) {
    const title = formData.get('title');
    addOptimisticTodo({ id: 'optimistic', title });
    const response = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!response.ok) {
      startTransition(() => setError('Could not add todo.'));
      return;
    }
    const todo = await response.json();
    startTransition(() => {
      setError(null);
      setTodos((current) => [...current, todo]);
    });
  }

  return (
    <form action={addTodo}>
      <label>
        New todo
        <input name="title" />
      </label>
      <button type="submit">Add</button>
      {error && <p role="alert">{error}</p>}
      <ul>
        {optimisticTodos.map((todo) => (
          <li key={todo.id}>
            {todo.title} {todo.pending && <small>Saving...</small>}
          </li>
        ))}
      </ul>
    </form>
  );
}
