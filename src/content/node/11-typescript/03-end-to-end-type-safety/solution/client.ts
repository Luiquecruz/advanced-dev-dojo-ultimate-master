import { hc } from 'hono/client';
import type { AppType } from './server';
import { createTodoSchema, type CreateTodo, type Todo } from './schemas';

export class ApiError extends Error {
  name = 'ApiError';
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function failure(response: Response): Promise<ApiError> {
  const body = await response.json().catch(() => ({}));
  return new ApiError(response.status, typeof body.error === 'string' ? body.error : `Request failed with status ${response.status}`);
}

export function createTodoClient(fetchImpl: typeof fetch, baseUrl = 'http://localhost') {
  const client = hc<AppType>(baseUrl, { fetch: fetchImpl });

  return {
    async list(): Promise<Todo[]> {
      const response = await client.todos.$get();
      if (!response.ok) {
        throw await failure(response);
      }
      return response.json();
    },

    async create(input: CreateTodo): Promise<Todo> {
      const json = createTodoSchema.parse(input);
      const response = await client.todos.$post({ json });
      if (response.status !== 201) {
        throw await failure(response);
      }
      return response.json();
    },

    async toggle(id: number): Promise<Todo> {
      const response = await client.todos[':id'].toggle.$patch({ param: { id: String(id) } });
      if (response.status !== 200) {
        throw await failure(response);
      }
      return response.json();
    },
  };
}
