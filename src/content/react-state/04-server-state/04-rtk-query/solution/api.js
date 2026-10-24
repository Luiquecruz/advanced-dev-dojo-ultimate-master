import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const todosApi = createApi({
  reducerPath: 'todosApi',
  baseQuery: fetchBaseQuery({ baseUrl: 'https://api.example.com/api' }),
  tagTypes: ['Todo'],
  endpoints: (build) => ({
    getTodos: build.query({
      query: () => '/todos',
      providesTags: (result = []) => [{ type: 'Todo', id: 'LIST' }, ...result.map(({ id }) => ({ type: 'Todo', id }))],
    }),
    getTodo: build.query({
      query: (id) => `/todos/${id}`,
      providesTags: (result, error, id) => [{ type: 'Todo', id }],
    }),
    addTodo: build.mutation({
      query: (title) => ({ url: '/todos', method: 'POST', body: { title } }),
      invalidatesTags: [{ type: 'Todo', id: 'LIST' }],
    }),
    updateTodo: build.mutation({
      query: ({ id, ...patch }) => ({ url: `/todos/${id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Todo', id }],
    }),
  }),
});

export const { useGetTodosQuery, useGetTodoQuery, useAddTodoMutation, useUpdateTodoMutation } = todosApi;
