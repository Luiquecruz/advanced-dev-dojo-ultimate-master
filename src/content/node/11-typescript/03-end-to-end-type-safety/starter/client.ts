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

export function createTodoClient(fetchImpl: typeof fetch, baseUrl = 'http://localhost') {
  // TODO: create the typed client with hc<AppType>(baseUrl, { fetch: fetchImpl })

  return {
    async list(): Promise<Todo[]> {
      // TODO: GET /todos through the typed client
      throw new ApiError(501, 'Not implemented');
    },

    async create(input: CreateTodo): Promise<Todo> {
      // TODO: parse input with createTodoSchema, then POST /todos; throw ApiError unless 201
      throw new ApiError(501, 'Not implemented');
    },

    async toggle(id: number): Promise<Todo> {
      // TODO: PATCH /todos/:id/toggle; throw ApiError(status, body.error) unless 200
      throw new ApiError(501, 'Not implemented');
    },
  };
}
