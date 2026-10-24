import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

async function request(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
}

export const todosKey = ['todos'];

export const fetchTodos = () => request('/api/todos');

export const updateTodo = ({ id, completed }) =>
  request(`/api/todos/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed }),
  });

export const deleteTodo = (id) => request(`/api/todos/${id}`, { method: 'DELETE' });

export function useToggleTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateTodo,
    onMutate: async ({ id, completed }) => {
      await queryClient.cancelQueries({ queryKey: todosKey });
      const previous = queryClient.getQueryData(todosKey);
      queryClient.setQueryData(todosKey, (todos) =>
        todos.map((todo) => (todo.id === id ? { ...todo, completed } : todo)),
      );
      return { previous };
    },
    onError: (error, variables, onMutateResult) => {
      queryClient.setQueryData(todosKey, onMutateResult.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: todosKey }),
  });
}

export function useDeleteTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTodo,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: todosKey });
      const previous = queryClient.getQueryData(todosKey);
      queryClient.setQueryData(todosKey, (todos) => todos.filter((todo) => todo.id !== id));
      return { previous };
    },
    onError: (error, id, onMutateResult) => {
      queryClient.setQueryData(todosKey, onMutateResult.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: todosKey }),
  });
}

export function TodoList() {
  const { data, isPending } = useQuery({ queryKey: todosKey, queryFn: fetchTodos });
  const toggle = useToggleTodo();
  const remove = useDeleteTodo();

  if (isPending) return <p>Loading todos...</p>;

  return (
    <section>
      {(toggle.isError || remove.isError) && <p role="alert">Could not save your change</p>}
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
            <button onClick={() => remove.mutate(todo.id)}>Delete {todo.title}</button>
          </li>
        ))}
      </ul>
    </section>
  );
}

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TodoList />
    </QueryClientProvider>
  );
}
