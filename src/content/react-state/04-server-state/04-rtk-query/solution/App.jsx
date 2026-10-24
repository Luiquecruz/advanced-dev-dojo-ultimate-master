import { useState } from 'react';
import { Provider } from 'react-redux';
import { useAddTodoMutation, useGetTodoQuery, useGetTodosQuery, useUpdateTodoMutation } from './api';
import { makeStore } from './store';

export function TodoList() {
  const { data: todos = [], isLoading } = useGetTodosQuery();
  const [updateTodo] = useUpdateTodoMutation();

  if (isLoading) return <p>Loading todos...</p>;

  return (
    <ul aria-label="Todos">
      {todos.map((todo) => (
        <li key={todo.id}>
          <label>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => updateTodo({ id: todo.id, completed: !todo.completed })}
            />
            {todo.title}
          </label>
        </li>
      ))}
    </ul>
  );
}

export function AddTodo() {
  const [title, setTitle] = useState('');
  const [addTodo, { isLoading }] = useAddTodoMutation();

  async function handleSubmit(event) {
    event.preventDefault();
    await addTodo(title);
    setTitle('');
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        New todo
        <input value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <button type="submit" disabled={isLoading}>
        Add
      </button>
    </form>
  );
}

export function TodoDetail({ id }) {
  const { data: todo } = useGetTodoQuery(id);
  if (!todo) return <p data-testid={`todo-${id}`}>Loading...</p>;
  return (
    <p data-testid={`todo-${id}`}>
      {todo.title}: {todo.completed ? 'done' : 'open'}
    </p>
  );
}

export function TodosScreen() {
  return (
    <main>
      <AddTodo />
      <TodoList />
      <TodoDetail id={2} />
      <TodoDetail id={3} />
    </main>
  );
}

export default function App() {
  const [store] = useState(makeStore);
  return (
    <Provider store={store}>
      <TodosScreen />
    </Provider>
  );
}
