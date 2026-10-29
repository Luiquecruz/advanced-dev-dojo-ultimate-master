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

// TODO: GET /health answers the text "ok"

// TODO: GET /books with ?author= (case-insensitive contains), ?limit= and the X-Total-Count header

// TODO: GET /books/:id restricted to digits, 404 { error: 'Book not found' } for unknown ids

// TODO: POST /books creates { id, title, author } and answers 201

async function main() {
  for (const path of ['/health', '/books?author=martin', '/books/2', '/books/99']) {
    const response = await app.request(path);
    console.log(`GET ${path} -> ${response.status}`, await response.text());
  }
}

main();
