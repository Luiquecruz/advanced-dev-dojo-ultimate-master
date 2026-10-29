import { z } from 'zod';

export const CreateBookmarkSchema = z.object({
  // TODO: url (http or https only), title (trimmed, 1 to 100 characters), tags (trimmed lowercase strings of 1 to 20 characters, at most 5, default [])
});

export type CreateBookmarkInput = z.infer<typeof CreateBookmarkSchema>;
