import { useState } from 'react';

const sampleTodos = [
  { id: 1, title: 'Learn JSX', completed: true },
  { id: 2, title: 'Master hooks', completed: false },
  { id: 3, title: 'Ship a React app', completed: false },
];

export function nextId(todos) {
  return Math.max(0, ...todos.map((todo) => todo.id)) + 1;
}

export default function TodoList({ initialTodos = sampleTodos }) {
  const [todos, setTodos] = useState(initialTodos);

  function handleAdd(event) {
    event.preventDefault();
    const title = String(new FormData(event.currentTarget).get('title')).trim();
    if (!title) return;
    setTodos([...todos, { id: nextId(todos), title, completed: false }]);
    event.currentTarget.reset();
  }

  function handleToggle(id) {
    setTodos(todos.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo)));
  }

  function handleDelete(id) {
    setTodos(todos.filter((todo) => todo.id !== id));
  }

  return (
    <section>
      <form onSubmit={handleAdd}>
        <input name="title" aria-label="New todo" />
        <button type="submit">Add</button>
      </form>
      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>
            <label>
              <input type="checkbox" checked={todo.completed} onChange={() => handleToggle(todo.id)} />
              {todo.title}
            </label>
            <button type="button" aria-label={`Delete ${todo.title}`} onClick={() => handleDelete(todo.id)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
