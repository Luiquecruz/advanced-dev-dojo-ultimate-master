import { createServer, type ServerResponse } from 'node:http';

export interface Todo {
  id: number;
  title: string;
  done: boolean;
}

export const todos: Todo[] = [
  { id: 1, title: 'Learn the event loop', done: true },
  { id: 2, title: 'Write a server with node:http', done: false },
  { id: 3, title: 'Compare it with Hono', done: false },
];

export function sendJson(res: ServerResponse, status: number, data: unknown): void {
  // TODO: set the status and the JSON Content-Type, then end with the serialized data
}

export const server = createServer((req, res) => {
  // TODO: parse req.url with new URL(), then route GET /health, GET /todos (with ?done=) and GET /todos/:id
  res.end();
});

const PORT = Number(process.env.PORT ?? 3000);
server.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));
