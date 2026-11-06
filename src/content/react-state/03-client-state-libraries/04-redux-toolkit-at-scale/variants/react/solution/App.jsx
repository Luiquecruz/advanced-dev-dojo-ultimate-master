import { useEffect, useState } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { notificationDismissed } from './notificationsSlice';
import { makeStore } from './store';
import { fetchTodos, selectAllTodos, selectRemainingCount, todoToggled } from './todosSlice';

export function TodoList() {
  const dispatch = useDispatch();
  const status = useSelector((state) => state.todos.status);
  const error = useSelector((state) => state.todos.error);
  const todos = useSelector(selectAllTodos);
  const remaining = useSelector(selectRemainingCount);

  useEffect(() => {
    dispatch(fetchTodos());
  }, [dispatch]);

  if (status === 'idle' || status === 'loading') {
    return <p role="status">Loading todos...</p>;
  }

  if (status === 'failed') {
    return (
      <div>
        <p role="alert">{error}</p>
        <button onClick={() => dispatch(fetchTodos())}>Retry</button>
      </div>
    );
  }

  return (
    <section>
      <ul aria-label="Todos">
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
    </section>
  );
}

export function Notifications() {
  const dispatch = useDispatch();
  const notifications = useSelector((state) => state.notifications);
  return (
    <ul aria-label="Notifications">
      {notifications.map((notification) => (
        <li key={notification.id}>
          {notification.message}
          <button onClick={() => dispatch(notificationDismissed(notification.id))}>Dismiss</button>
        </li>
      ))}
    </ul>
  );
}

export default function App() {
  const [store] = useState(() => makeStore());
  return (
    <Provider store={store}>
      <Notifications />
      <TodoList />
    </Provider>
  );
}
