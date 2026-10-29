test('getFeed attaches each author (null when missing) with exactly two queries', async () => {
  const db = mod.createDatabase();
  const feed = await mod.getFeed(db);
  expect(feed.map((post: any) => [post.id, post.author?.name ?? null])).toEqual([
    [1, 'Ada Lovelace'], [2, 'Alan Turing'], [3, 'Ada Lovelace'], [4, 'Grace Hopper'], [5, null],
  ]);
  expect(feed[0]).toEqual({ id: 1, authorId: 1, title: 'Notes on the Analytical Engine', author: { id: 1, name: 'Ada Lovelace' } });
  expect(db.queries).toEqual(['SELECT * FROM posts', 'SELECT * FROM users WHERE id = ANY([1, 2, 3, 9])']);
});

test('loads requested in the same tick reach the batch function in one call', async () => {
  const batch = fn(async (keys: number[]) => keys.map((key) => key * 10));
  const loader = new mod.DataLoader(batch);
  expect(await Promise.all([loader.load(1), loader.load(2), loader.load(3)])).toEqual([10, 20, 30]);
  expect(batch).toHaveBeenCalledTimes(1);
  expect(batch).toHaveBeenCalledWith([1, 2, 3]);
  await loader.load(4);
  expect(batch).toHaveBeenCalledTimes(2);
  expect(batch).toHaveBeenLastCalledWith([4]);
});

test('the same key shares one promise, is sent once and is cached afterwards', async () => {
  const batch = fn(async (keys: string[]) => keys.map((key) => key.toUpperCase()));
  const loader = new mod.DataLoader(batch);
  const first = loader.load('a');
  expect(loader.load('a')).toBe(first);
  expect(await Promise.all([first, loader.load('b'), loader.load('a')])).toEqual(['A', 'B', 'A']);
  expect(batch).toHaveBeenCalledWith(['a', 'b']);
  expect(await loader.load('b')).toBe('B');
  expect(batch).toHaveBeenCalledTimes(1);
});

test('an Error in the results rejects only that key', async () => {
  const loader = new mod.DataLoader(async (keys: number[]) => keys.map((key) => (key === 2 ? new Error('User 2 is hidden') : `user ${key}`)));
  const results = await Promise.allSettled([loader.load(1), loader.load(2), loader.load(3)]);
  expect(results.map((result: any) => result.status)).toEqual(['fulfilled', 'rejected', 'fulfilled']);
  expect((results[1] as any).reason.message).toBe('User 2 is hidden');
});

test('a failed batch rejects every key and failed keys are retried by the next load', async () => {
  let calls = 0;
  const loader = new mod.DataLoader(async (keys: number[]) => {
    calls++;
    if (calls === 1) {
      return [keys[0]];
    }
    if (calls === 2) {
      throw new Error('Database offline');
    }
    return keys;
  });
  const wrongLength = await Promise.allSettled([loader.load(1), loader.load(2)]);
  expect(wrongLength.map((result: any) => result.reason?.message)).toEqual(['DataLoader batch returned 1 results for 2 keys', 'DataLoader batch returned 1 results for 2 keys']);
  await expect(loader.load(1)).rejects.toThrow('Database offline');
  expect(await loader.load(1)).toBe(1);
  expect(calls).toBe(3);
});
