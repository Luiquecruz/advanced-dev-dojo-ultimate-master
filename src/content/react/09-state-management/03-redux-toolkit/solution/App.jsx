import { useState } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { makeStore } from './store';
import { completedCleared, selectRemainingCount, selectTodos, todoAdded, todoToggled } from './todosSlice';

export function TodoApp() {
  const todos = useSelector(selectTodos);
  const remaining = useSelector(selectRemainingCount);
  const dispatch = useDispatch();
  const [title, setTitle] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    if (!title.trim()) return;
    dispatch(todoAdded(title.trim()));
    setTitle('');
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
              <input type="checkbox" checked={todo.completed} onChange={() => dispatch(todoToggled(todo.id))} />
              {todo.title}
            </label>
          </li>
        ))}
      </ul>
      <p data-testid="remaining">{remaining} remaining</p>
      <button onClick={() => dispatch(completedCleared())}>Clear completed</button>
    </section>
  );
}

const store = makeStore();

export default function App() {
  return (
    <Provider store={store}>
      <TodoApp />
    </Provider>
  );
}
