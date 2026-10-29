import { app } from './server';
import { createTodoClient } from './client';

async function main() {
  const client = createTodoClient(async (input, init) => app.request(input, init));
  console.log(await client.list());
  await client.toggle(99).catch((error) => console.log(`${error.name} ${error.status}: ${error.message}`));
}

main().catch((error) => console.error(error));
