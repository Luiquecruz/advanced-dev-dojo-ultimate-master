import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createTodoSchema, todoParamsSchema, type Todo } from './schemas';

export const todos: Todo[] = [
  { id: 1, title: 'Share the schemas', done: true },
  { id: 2, title: 'Type the client', done: false },
];

export const app = new Hono()
  .get('/todos', (c) => c.json(todos, 200))
  .post(
    '/todos',
    zValidator('json', createTodoSchema, (result, c) => {
      if (!result.success) {
        return c.json({ error: 'Invalid todo' }, 400);
      }
    }),
    (c) => {
      const { title } = c.req.valid('json');
      const todo: Todo = { id: Math.max(0, ...todos.map((item) => item.id)) + 1, title, done: false };
      todos.push(todo);
      return c.json(todo, 201);
    },
  )
  .patch(
    '/todos/:id/toggle',
    zValidator('param', todoParamsSchema, (result, c) => {
      if (!result.success) {
        return c.json({ error: 'Invalid id' }, 400);
      }
    }),
    (c) => {
      const { id } = c.req.valid('param');
      const todo = todos.find((item) => item.id === id);
      if (!todo) {
        return c.json({ error: 'Todo not found' }, 404);
      }
      todo.done = !todo.done;
      return c.json(todo, 200);
    },
  );

export type AppType = typeof app;
