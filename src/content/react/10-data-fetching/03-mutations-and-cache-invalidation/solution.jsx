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
  const toggle = useMutation({
    mutationFn: updateTodo,
    onSuccess: (updated) => {
      queryClient.setQueryData(['todos'], (todos) => todos.map((todo) => (todo.id === updated.id ? updated : todo)));
    },
  });

  if (isPending) return <p>Loading todos...</p>;

  return (
    <ul>
      {data.map((todo) => (
        <li key={todo.id}>
          <label>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggle.mutate({ id: todo.id, completed: !todo.completed })}
            />
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
  const addTodo = useMutation({
    mutationFn: createTodo,
    onSuccess: () => {
      setTitle('');
      return queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });

  function handleSubmit(event) {
    event.preventDefault();
    addTodo.mutate(title);
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        New todo
        <input value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <button type="submit" disabled={addTodo.isPending}>
        {addTodo.isPending ? 'Adding...' : 'Add todo'}
      </button>
      {addTodo.isError && <p role="alert">{addTodo.error.message}</p>}
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
