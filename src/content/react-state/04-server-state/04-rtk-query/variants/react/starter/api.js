import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const todosApi = createApi({
  reducerPath: 'todosApi',
  baseQuery: fetchBaseQuery({ baseUrl: 'https://api.example.com/api' }),
  // TODO: declare tagTypes: ['Todo']
  endpoints: (build) => ({
    getTodos: build.query({
      query: () => '/todos',
      // TODO: provide { type: 'Todo', id: 'LIST' } plus one { type: 'Todo', id } per todo
    }),
    getTodo: build.query({
      query: (id) => `/todos/${id}`,
      // TODO: provide { type: 'Todo', id }
    }),
    addTodo: build.mutation({
      query: (title) => ({ url: '/todos', method: 'POST', body: { title } }),
      // TODO: invalidate { type: 'Todo', id: 'LIST' }
    }),
    updateTodo: build.mutation({
      query: ({ id, ...patch }) => ({ url: `/todos/${id}`, method: 'PATCH', body: patch }),
      // TODO: invalidate only { type: 'Todo', id } of the updated todo
    }),
  }),
});

export const { useGetTodosQuery, useGetTodoQuery, useAddTodoMutation, useUpdateTodoMutation } = todosApi;
