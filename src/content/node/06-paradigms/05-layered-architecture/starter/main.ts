import { Hono } from 'hono';
import { InMemoryTaskRepository, type TaskRepository } from './repository';
import { TaskService } from './service';
import { createTaskRoutes, handleError } from './routes';

export function createApp(repository: TaskRepository) {
  const app = new Hono();
  app.route('/tasks', createTaskRoutes(new TaskService(repository)));
  app.onError(handleError);
  return app;
}

const seed = () => [
  { id: 1, title: 'Write the repository', done: true },
  { id: 2, title: 'Write the service', done: false },
];

export const app = createApp(new InMemoryTaskRepository(seed()));

async function main() {
  const demo = createApp(new InMemoryTaskRepository(seed()));
  const created = await demo.request('/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Write the routes' }) });
  console.log(created.status, await created.text());
  console.log(await (await demo.request('/tasks')).text());
}

main();
