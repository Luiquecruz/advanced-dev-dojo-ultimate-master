test('slugify.ts default-exports a function that turns a title into a URL slug', async () => {
  const slugify = modules['slugify.ts'].default;
  expect(typeof slugify).toBe('function');
  expect(slugify('  Hello, Node World! ')).toBe('hello-node-world');
});

test('ids.ts imports randomUUID from "node:crypto" with the node: prefix', async () => {
  expect(sources['ids.ts']).toMatch(/from\s*['"]node:crypto['"]/);
  expect(modules['ids.ts'].createId('user')).toMatch(/^user_[0-9a-f-]{36}$/);
});

test('main.ts re-exports slugify and createId as named exports', async () => {
  expect(mod.slugify).toBe(modules['slugify.ts'].default);
  expect(mod.createId).toBe(modules['ids.ts'].createId);
});

test('createPost returns { id, slug, title } with a "post_" id', async () => {
  const post = mod.createPost('Modules in Node 24');
  expect(post).toEqual({ id: expect.stringMatching(/^post_[0-9a-f-]{36}$/), slug: 'modules-in-node-24', title: 'Modules in Node 24' });
  expect(mod.createPost('Modules in Node 24').id).not.toBe(post.id);
});

test('main.ts exposes exactly createId, createPost and slugify (isId stays internal)', async () => {
  expect(Object.keys(mod).sort()).toEqual(['createId', 'createPost', 'slugify']);
});
