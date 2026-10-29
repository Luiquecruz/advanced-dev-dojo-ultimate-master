test('promisify resolves with the callback value and forwards every argument', async () => {
  const add = (a: number, b: number, callback: any) => setTimeout(() => callback(null, a + b), 1);
  await expect(mod.promisify(add)(2, 3)).resolves.toBe(5);
});

test('promisify rejects with the exact error passed to the callback', async () => {
  const failure = new Error('disk on fire');
  const broken = (callback: any) => setTimeout(() => callback(failure), 1);
  let caught: unknown;
  try {
    await mod.promisify(broken)();
  } catch (error) {
    caught = error;
  }
  expect(caught).toBe(failure);
});

test('readJson calls back once with (null, data) for a valid file and with the ENOENT error for a missing one', async () => {
  writeFiles({ 'data/settings.json': '{"theme":"dark"}' });
  const found = fn();
  const missing = fn();
  mod.readJson('data/settings.json', found);
  mod.readJson('data/nope.json', missing);
  await sleep(30);
  expect(found.mock.calls).toEqual([[null, { theme: 'dark' }]]);
  expect(missing).toHaveBeenCalledTimes(1);
  expect(missing.mock.calls[0][0].code).toBe('ENOENT');
});

test('readJson reports invalid JSON through the callback exactly once instead of throwing', async () => {
  writeFiles({ 'broken.json': '{ not json' });
  const callback = fn();
  mod.readJson('broken.json', callback);
  await sleep(30);
  expect(callback).toHaveBeenCalledTimes(1);
  expect(callback.mock.calls[0][0]).toBeInstanceOf(SyntaxError);
});

test('loadSettings merges the file over the defaults, falls back to the defaults on ENOENT and rejects on invalid JSON', async () => {
  writeFiles({ 'settings.json': '{"pageSize":50}', 'broken.json': '{' });
  await expect(mod.loadSettings('settings.json')).resolves.toEqual({ theme: 'light', pageSize: 50 });
  await expect(mod.loadSettings('missing.json')).resolves.toEqual({ theme: 'light', pageSize: 20 });
  await expect(mod.loadSettings('broken.json')).rejects.toBeInstanceOf(SyntaxError);
});

test('readJsonAsync is built with your own promisify, not util.promisify or fs/promises', async () => {
  expect(source).not.toMatch(/['"](node:)?util['"]/);
  expect(source).not.toMatch(/['"](node:)?fs\/promises['"]/);
  writeFiles({ 'a.json': '[1,2]' });
  await expect(mod.readJsonAsync('a.json')).resolves.toEqual([1, 2]);
});
