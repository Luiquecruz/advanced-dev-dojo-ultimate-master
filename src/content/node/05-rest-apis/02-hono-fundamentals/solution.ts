import { Hono } from 'hono';

export interface Book {
  id: number;
  title: string;
  author: string;
}

export const books: Book[] = [
  { id: 1, title: 'Eloquent JavaScript', author: 'Marijn Haverbeke' },
  { id: 2, title: 'Node.js Design Patterns', author: 'Mario Casciaro' },
  { id: 3, title: 'Designing Data-Intensive Applications', author: 'Martin Kleppmann' },
  { id: 4, title: 'Refactoring', author: 'Martin Fowler' },
];

export const app = new Hono();

app.get('/health', (c) => c.text('ok'));

app.get('/books', (c) => {
  const author = c.req.query('author')?.toLowerCase();
  const limit = c.req.query('limit');
  let result = author ? books.filter((book) => book.author.toLowerCase().includes(author)) : books;
  if (limit !== undefined) {
    result = result.slice(0, Number(limit));
  }
  c.header('X-Total-Count', String(result.length));
  return c.json(result);
});

app.get('/books/:id{[0-9]+}', (c) => {
  const book = books.find((item) => item.id === Number(c.req.param('id')));
  if (!book) {
    return c.json({ error: 'Book not found' }, 404);
  }
  return c.json(book);
});

app.post('/books', async (c) => {
  const input = await c.req.json<{ title: string; author: string }>();
  const book: Book = { id: Math.max(0, ...books.map((item) => item.id)) + 1, title: input.title, author: input.author };
  books.push(book);
  return c.json(book, 201);
});

async function main() {
  for (const path of ['/health', '/books?author=martin', '/books/2', '/books/99']) {
    const response = await app.request(path);
    console.log(`GET ${path} -> ${response.status}`, await response.text());
  }
}

main();
