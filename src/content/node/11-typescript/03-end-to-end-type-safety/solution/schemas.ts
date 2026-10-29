import { z } from 'zod';

export const todoSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  done: z.boolean(),
});

export const createTodoSchema = z.object({
  title: z.string().trim().min(1).max(100),
});

export const todoParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type Todo = z.infer<typeof todoSchema>;
export type CreateTodo = z.input<typeof createTodoSchema>;
