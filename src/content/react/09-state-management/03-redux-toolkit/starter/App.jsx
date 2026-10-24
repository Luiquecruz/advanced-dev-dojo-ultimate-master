import { useState } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { makeStore } from './store';
import { completedCleared, selectRemainingCount, selectTodos, todoAdded, todoToggled } from './todosSlice';

export function TodoApp() {
  // TODO: read the todos and the remaining count with useSelector, and get dispatch with useDispatch
  const todos = [];
  const remaining = 0;
  const [title, setTitle] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    // TODO: dispatch todoAdded with the trimmed title (ignore empty titles) and clear the input
  }

  return (
    <section>
      <form onSubmit={handleSubmit}>
        <label>
          New todo
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <button type="submit">Add</button>
      </form>
      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>
            <label>
              {/* TODO: dispatch todoToggled(todo.id) on change */}
              <input type="checkbox" checked={todo.completed} readOnly />
              {todo.title}
            </label>
          </li>
        ))}
      </ul>
      <p data-testid="remaining">{remaining} remaining</p>
      {/* TODO: dispatch completedCleared() on click */}
      <button>Clear completed</button>
    </section>
  );
}

// TODO: create the store with makeStore() and provide it with <Provider store={store}>
export default function App() {
  return <TodoApp />;
}
