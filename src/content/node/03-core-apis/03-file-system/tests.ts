test('readJson() parses an existing file', async () => {
  writeFiles({ 'data/settings.json': '{ "theme": "dark", "retries": 3 }' });
  await expect(mod.readJson('data/settings.json', {})).resolves.toEqual({ theme: 'dark', retries: 3 });
});

test('readJson() returns the fallback only for a missing file and rethrows other errors', async () => {
  await expect(mod.readJson('data/missing.json', { empty: true })).resolves.toEqual({ empty: true });
  writeFiles({ 'data/broken.json': '{ "theme": ', 'data/folder/inner.json': '{}' });
  await expect(mod.readJson('data/broken.json', {})).rejects.toBeInstanceOf(SyntaxError);
  await expect(mod.readJson('data/folder', {})).rejects.toHaveProperty('code', 'EISDIR');
});

test('writeJsonAtomic() creates parent folders and writes pretty JSON with a trailing newline', async () => {
  await mod.writeJsonAtomic('data/out/report.json', { ok: true, items: [1] });
  expect(fs.readFileSync('/app/data/out/report.json', 'utf8')).toBe('{\n  "ok": true,\n  "items": [\n    1\n  ]\n}\n');
  await mod.writeJsonAtomic('data/out/report.json', []);
  expect(fs.readFileSync('/app/data/out/report.json', 'utf8')).toBe('[]\n');
});

test('writeJsonAtomic() renames a temporary file and leaves nothing else in the folder', async () => {
  await mod.writeJsonAtomic('data/state.json', { version: 2 });
  expect(fs.readdirSync('/app/data')).toEqual(['state.json']);
  expect(source).toMatch(/\brename\s*\(/);
  expect(source).not.toMatch(/Sync\s*\(/);
});

test('addNote() appends notes with the next id, starting from a missing file', async () => {
  await expect(mod.addNote('data/notes.json', 'first')).resolves.toEqual({ id: 1, text: 'first' });
  await expect(mod.addNote('data/notes.json', 'second')).resolves.toEqual({ id: 2, text: 'second' });
  writeFiles({ 'data/other.json': JSON.stringify([{ id: 7, text: 'old' }]) });
  await expect(mod.addNote('data/other.json', 'new')).resolves.toEqual({ id: 8, text: 'new' });
  expect(JSON.parse(fs.readFileSync('/app/data/notes.json', 'utf8'))).toEqual([{ id: 1, text: 'first' }, { id: 2, text: 'second' }]);
});
