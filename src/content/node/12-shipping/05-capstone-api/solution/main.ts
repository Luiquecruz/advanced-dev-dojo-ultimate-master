import { randomUUID } from 'node:crypto';
import { createApp } from './app';
import type { User } from './auth';
import { InMemoryBookmarkRepository } from './repository';

export const tokens = new Map<string, User>([
  ['token-ada', { id: 'u1', name: 'Ada' }],
  ['token-alan', { id: 'u2', name: 'Alan' }],
]);

export const app = createApp({ repository: new InMemoryBookmarkRepository(), ids: randomUUID, now: () => new Date(), tokens });

async function main() {
  const demo = createApp({ repository: new InMemoryBookmarkRepository(), ids: randomUUID, now: () => new Date(), tokens });
  const headers = { Authorization: 'Bearer token-ada', 'Content-Type': 'application/json' };
  const created = await demo.request('/bookmarks', { method: 'POST', headers, body: JSON.stringify({ url: 'https://hono.dev', title: ' Hono ', tags: ['Web'] }) });
  console.log(created.status, created.headers.get('Location'), await created.text());
  const invalid = await demo.request('/bookmarks', { method: 'POST', headers, body: JSON.stringify({ url: 'javascript:alert(1)', title: '' }) });
  console.log(invalid.status, await invalid.text());
  const anonymous = await demo.request('/bookmarks');
  console.log(anonymous.status, await anonymous.text());
}

main();
