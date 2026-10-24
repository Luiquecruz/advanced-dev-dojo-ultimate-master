import { useState } from 'react';
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

async function request(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
}

export const fetchTodos = () => request('/api/todos');

export const createTodo = (title) =>
  request('/api/todos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });

export const updateTodo = ({ id, completed }) =>
  request(`/api/todos/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed }),
  });

export function TodoList() {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({ queryKey: ['todos'], queryFn: fetchTodos });
  // TODO: create a `toggle` mutation with mutationFn: updateTodo
  // TODO: onSuccess, replace the updated todo inside the ['todos'] cache with queryClient.setQueryData

  if (isPending) return <p>Loading todos...</p>;

  return (
    <ul>
      {data.map((todo) => (
        <li key={todo.id}>
          <label>
            {/* TODO: call toggle.mutate({ id: todo.id, completed: !todo.completed }) on change */}
            <input type="checkbox" checked={todo.completed} readOnly />
            {todo.title}
          </label>
        </li>
      ))}
    </ul>
  );
}

export function AddTodoForm() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  // TODO: create an `addTodo` mutation with mutationFn: createTodo
  // TODO: onSuccess, clear the input and invalidate the ['todos'] query

  function handleSubmit(event) {
    event.preventDefault();
    // TODO: call addTodo.mutate(title)
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        New todo
        <input value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      {/* TODO: disable the button and show "Adding..." while the mutation is pending */}
      <button type="submit">Add todo</button>
    </form>
  );
}

export function TodosPage() {
  return (
    <section>
      <AddTodoForm />
      <TodoList />
    </section>
  );
}

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TodosPage />
    </QueryClientProvider>
  );
}
