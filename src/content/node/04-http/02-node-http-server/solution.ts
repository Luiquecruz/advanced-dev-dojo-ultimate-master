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
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

export const server = createServer((req, res) => {
  const { pathname, searchParams } = new URL(req.url ?? '/', 'http://localhost');

  if (req.method !== 'GET') {
    return sendJson(res, 404, { error: 'Not found' });
  }
  if (pathname === '/health') {
    return sendJson(res, 200, { status: 'ok' });
  }
  if (pathname === '/todos') {
    const done = searchParams.get('done');
    const result = done === null ? todos : todos.filter((todo) => todo.done === (done === 'true'));
    return sendJson(res, 200, result);
  }
  const match = /^\/todos\/(\d+)$/.exec(pathname);
  if (match) {
    const todo = todos.find((item) => item.id === Number(match[1]));
    return todo ? sendJson(res, 200, todo) : sendJson(res, 404, { error: 'Todo not found' });
  }
  sendJson(res, 404, { error: 'Not found' });
});

const PORT = Number(process.env.PORT ?? 3000);
server.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));
