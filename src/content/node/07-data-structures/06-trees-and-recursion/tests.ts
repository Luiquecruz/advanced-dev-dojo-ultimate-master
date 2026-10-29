const rows = [
  { id: 5, parentId: 2, author: 'margaret', body: 'Late reply' },
  { id: 1, parentId: null, author: 'ada', body: 'Great article' },
  { id: 2, parentId: 1, author: 'alan', body: 'Agreed' },
  { id: 3, parentId: 2, author: 'grace', body: 'Same here' },
  { id: 4, parentId: null, author: 'linus', body: 'Typo' },
  { id: 6, parentId: 1, author: 'ken', body: 'Second reply' },
  { id: 7, parentId: 99, author: 'dennis', body: 'Parent was deleted' },
];

const shape = (nodes: any[]): any[] => nodes.map((node) => ({ id: node.id, replies: shape(node.replies) }));

test('buildTree nests replies under their parents and keeps the input order', () => {
  expect(shape(mod.buildTree(rows))).toEqual([
    { id: 1, replies: [{ id: 2, replies: [{ id: 5, replies: [] }, { id: 3, replies: [] }] }, { id: 6, replies: [] }] },
    { id: 4, replies: [] },
    { id: 7, replies: [] },
  ]);
});

test('buildTree returns new nodes with every field and leaves the rows untouched', () => {
  const [root] = mod.buildTree(rows);
  expect(root).toEqual(expect.objectContaining({ id: 1, parentId: null, author: 'ada', body: 'Great article' }));
  expect(root).not.toBe(rows[1]);
  expect(rows[1]).not.toHaveProperty('replies');
});

test('buildTree handles 20 000 comments listed replies-first in linear time', () => {
  const many = Array.from({ length: 20_000 }, (_, index) => {
    const id = 20_000 - index;
    return { id, parentId: id === 1 ? null : Math.floor(id / 2), author: 'user', body: 'text' };
  });
  const startedAt = performance.now();
  const roots = mod.buildTree(many);
  const elapsed = performance.now() - startedAt;
  expect(roots.length).toBe(1);
  expect(roots[0].id).toBe(1);
  expect(roots[0].replies.map((node: any) => node.id)).toEqual([3, 2]);
  expect(mod.countReplies(roots[0])).toBe(19_999);
  expect(elapsed).toBeLessThan(200);
});

test('countReplies counts every descendant', () => {
  const [first, second] = mod.buildTree(rows);
  expect(mod.countReplies(first)).toBe(4);
  expect(mod.countReplies(first.replies[0])).toBe(2);
  expect(mod.countReplies(second)).toBe(0);
});

test('flattenThread lists nodes in depth-first pre-order with their depth', () => {
  expect(mod.flattenThread(mod.buildTree(rows))).toEqual([
    { id: 1, depth: 0 },
    { id: 2, depth: 1 },
    { id: 5, depth: 2 },
    { id: 3, depth: 2 },
    { id: 6, depth: 1 },
    { id: 4, depth: 0 },
    { id: 7, depth: 0 },
  ]);
});

test('a 100 000-level reply chain builds and flattens without a stack overflow', () => {
  const chain = Array.from({ length: 100_000 }, (_, index) => ({ id: index + 1, parentId: index === 0 ? null : index, author: 'bot', body: 'reply' }));
  const roots = mod.buildTree(chain);
  const flat = mod.flattenThread(roots);
  expect(flat.length).toBe(100_000);
  expect(flat[99_999]).toEqual({ id: 100_000, depth: 99_999 });
});
