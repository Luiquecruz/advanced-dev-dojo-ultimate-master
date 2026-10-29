import { z } from 'zod';

export const todoSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  done: z.boolean(),
});

export const createTodoSchema = z.object({
  // TODO: trim the title and require 1 to 100 characters
  title: z.string(),
});

export const todoParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type Todo = z.infer<typeof todoSchema>;
export type CreateTodo = z.input<typeof createTodoSchema>;
