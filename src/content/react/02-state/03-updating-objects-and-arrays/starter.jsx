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
    // TODO: push mutates the array and React sees the same reference; create a new array instead
    todos.push({ id: nextId(todos), title, completed: false });
    setTodos(todos);
    event.currentTarget.reset();
  }

  function handleToggle(id) {
    // TODO: create a new array with a new object for the toggled todo
    const todo = todos.find((item) => item.id === id);
    todo.completed = !todo.completed;
    setTodos(todos);
  }

  function handleDelete(id) {
    // TODO: splice mutates the array; build a new array without the todo
    const index = todos.findIndex((item) => item.id === id);
    todos.splice(index, 1);
    setTodos(todos);
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
