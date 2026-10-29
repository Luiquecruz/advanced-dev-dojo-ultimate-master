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

export const listQuerySchema = z.object({
  // TODO: limit (default 10, clamped to 50), offset (default 0), optional category, sort (whitelist, default 'id')
});

export function encodeCursor(id: number): string {
  // TODO: base64 of JSON.stringify({ id })
  return '';
}

export function decodeCursor(cursor: string): number | null {
  // TODO: decode, parse and return the numeric id, or null when anything is invalid
  return null;
}

export const app = new Hono();

app.get('/products', (c) => {
  // TODO: validate the query with zValidator, then filter, sort, slice and answer { items, total, limit, offset }
  return c.json({ items: products, total: products.length, limit: products.length, offset: 0 });
});

app.get('/products/feed', (c) => {
  // TODO: decode the cursor and answer { items, nextCursor } ordered by id
  return c.json({ items: products, nextCursor: null });
});
