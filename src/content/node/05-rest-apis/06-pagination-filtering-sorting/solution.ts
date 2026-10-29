import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

export interface Product {
  id: number;
  name: string;
  category: 'books' | 'games' | 'tools';
  price: number;
}

const categories = ['books', 'games', 'tools'] as const;

export const products: Product[] = Array.from({ length: 25 }, (_, index) => ({
  id: index + 1,
  name: `Product ${String(index + 1).padStart(2, '0')}`,
  category: categories[index % 3],
  price: ((index * 37) % 90) + 10,
}));

const MAX_LIMIT = 50;

const limitSchema = z.coerce.number().int().min(1).default(10).transform((limit) => Math.min(limit, MAX_LIMIT));

export const listQuerySchema = z.object({
  limit: limitSchema,
  offset: z.coerce.number().int().min(0).default(0),
  category: z.string().optional(),
  sort: z.enum(['id', 'price', '-price', 'name', '-name']).default('id'),
});

const feedQuerySchema = z.object({
  limit: limitSchema,
  cursor: z.string().optional(),
});

export function encodeCursor(id: number): string {
  return Buffer.from(JSON.stringify({ id })).toString('base64');
}

export function decodeCursor(cursor: string): number | null {
  try {
    const value = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
    return typeof value?.id === 'number' ? value.id : null;
  } catch {
    return null;
  }
}

function compareBy(sort: z.infer<typeof listQuerySchema>['sort']) {
  const direction = sort.startsWith('-') ? -1 : 1;
  const field = sort.replace('-', '') as 'id' | 'price' | 'name';
  return (a: Product, b: Product) => {
    const left = a[field];
    const right = b[field];
    return (left < right ? -1 : left > right ? 1 : a.id - b.id) * direction;
  };
}

export const app = new Hono();

app.get(
  '/products',
  zValidator('query', listQuerySchema, (result, c) => {
    if (!result.success) {
      return c.json({ error: 'Invalid query' }, 400);
    }
  }),
  (c) => {
    const { limit, offset, category, sort } = c.req.valid('query');
    const filtered = category ? products.filter((product) => product.category === category) : products;
    const items = [...filtered].sort(compareBy(sort)).slice(offset, offset + limit);
    return c.json({ items, total: filtered.length, limit, offset });
  },
);

app.get(
  '/products/feed',
  zValidator('query', feedQuerySchema, (result, c) => {
    if (!result.success) {
      return c.json({ error: 'Invalid query' }, 400);
    }
  }),
  (c) => {
    const { limit, cursor } = c.req.valid('query');
    const after = cursor === undefined ? 0 : decodeCursor(cursor);
    if (after === null) {
      return c.json({ error: 'Invalid cursor' }, 400);
    }
    const remaining = products.filter((product) => product.id > after);
    const items = remaining.slice(0, limit);
    const nextCursor = remaining.length > limit ? encodeCursor(items[items.length - 1].id) : null;
    return c.json({ items, nextCursor });
  },
);
