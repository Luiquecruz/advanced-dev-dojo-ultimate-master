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
  // TODO: make it optimistic
  //  onMutate: cancel in-flight ['todos'] queries, snapshot the cache, write the new `completed` value, return { previous }
  //  onError: restore the snapshot
  //  onSettled: invalidate ['todos'] (return the promise)
  return useMutation({
    mutationFn: updateTodo,
    onSuccess: (updated) => {
      queryClient.setQueryData(todosKey, (todos) => todos.map((todo) => (todo.id === updated.id ? updated : todo)));
    },
  });
}

export function useDeleteTodo() {
  const queryClient = useQueryClient();
  // TODO: make it optimistic with the same snapshot / rollback / invalidate pattern (remove the todo in onMutate)
  return useMutation({
    mutationFn: deleteTodo,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: todosKey }),
  });
}

export function TodoList() {
  const { data, isPending } = useQuery({ queryKey: todosKey, queryFn: fetchTodos });
  const toggle = useToggleTodo();
  const remove = useDeleteTodo();

  if (isPending) return <p>Loading todos...</p>;

  return (
    <section>
      {/* TODO: when either mutation failed, render <p role="alert">Could not save your change</p> */}
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
