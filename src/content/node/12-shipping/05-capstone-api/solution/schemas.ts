import { z } from 'zod';

export const CreateBookmarkSchema = z.object({
  url: z.httpUrl(),
  title: z.string().trim().min(1).max(100),
  tags: z.array(z.string().trim().toLowerCase().min(1).max(20)).max(5).default([]),
});

export type CreateBookmarkInput = z.infer<typeof CreateBookmarkSchema>;
