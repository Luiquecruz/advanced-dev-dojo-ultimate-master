import { memo, useCallback, useState } from 'react';

const INITIAL_TODOS = [
  { id: 1, title: 'Learn JSX', done: true },
  { id: 2, title: 'Master hooks', done: false },
  { id: 3, title: 'Ship a React app', done: false },
];

export const TodoItem = memo(function TodoItem({ todo, onToggle, onDelete, onRender }) {
  onRender?.(todo.id);
  return (
    <li>
      <label>
        <input type="checkbox" checked={todo.done} onChange={() => onToggle(todo.id)} />
        {todo.title}
      </label>
      <button onClick={() => onDelete(todo.id)}>Delete {todo.title}</button>
    </li>
  );
});

export default function TodoList({ onItemRender }) {
  const [todos, setTodos] = useState(INITIAL_TODOS);
  const [draft, setDraft] = useState('');

  const handleToggle = useCallback((id) => {
    setTodos((current) => current.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo)));
  }, []);

  const handleDelete = useCallback((id) => {
    setTodos((current) => current.filter((todo) => todo.id !== id));
  }, []);

  return (
    <section>
      <input aria-label="New todo" value={draft} onChange={(event) => setDraft(event.target.value)} />
      <ul>
        {todos.map((todo) => (
          <TodoItem key={todo.id} todo={todo} onToggle={handleToggle} onDelete={handleDelete} onRender={onItemRender} />
        ))}
      </ul>
    </section>
  );
}
