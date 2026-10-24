import { startTransition, useOptimistic, useState } from 'react';

export default function TodoList({ initialTodos = [] }) {
  const [todos, setTodos] = useState(initialTodos);
  const [error, setError] = useState(null);
  // TODO: create optimisticTodos with useOptimistic(todos, (current, newTodo) => ...)

  async function addTodo(formData) {
    const title = formData.get('title');
    // TODO: add the optimistic todo { id: 'optimistic', title } here
    const response = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!response.ok) {
      // TODO: show the error message
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
        {/* TODO: render the optimistic todos and mark pending ones with <small>Saving...</small> */}
        {todos.map((todo) => (
          <li key={todo.id}>{todo.title}</li>
        ))}
      </ul>
    </form>
  );
}
