const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');

async function run(chunks: unknown[], ...steps: any[]) {
  const output: unknown[] = [];
  await pipeline(Readable.from(chunks), ...steps, async (source: AsyncIterable<unknown>) => {
    for await (const item of source) {
      output.push(item);
    }
  });
  return output;
}

test('splitLines() emits one string per line across chunk boundaries and flushes the last line', async () => {
  expect(await run(['id,na', 'me\n1,Ada\n2,Al', 'an'], mod.splitLines())).toEqual(['id,name', '1,Ada', '2,Alan']);
  expect(await run(['a\nb\n'], mod.splitLines())).toEqual(['a', 'b']);
});

test('csvToObjects() maps rows to objects using the header and skips empty lines', async () => {
  expect(await run(['id,name,role', '1,Ada,admin', '', '2,Alan,editor'], mod.csvToObjects())).toEqual([
    { id: '1', name: 'Ada', role: 'admin' },
    { id: '2', name: 'Alan', role: 'editor' },
  ]);
});

test('csvToObjects() fails with "Invalid row <n>" when a row has the wrong number of values', async () => {
  await expect(run(['id,name', '1,Ada', '2,Alan,extra'], mod.csvToObjects())).rejects.toThrow('Invalid row 3');
});

test('toNdjson() turns each record into one JSON line', async () => {
  expect((await run([{ id: '1' }, { id: '2', name: 'Alan' }], mod.toNdjson())).map(String).join('')).toBe('{"id":"1"}\n{"id":"2","name":"Alan"}\n');
});

test('convertCsvFile() writes NDJSON with pipeline()', async () => {
  const rows = Array.from({ length: 300 }, (_, index) => `${index + 1},user${index + 1}`);
  writeFiles({ 'in/users.csv': `id,name\n${rows.join('\n')}\n` });
  await mod.convertCsvFile('in/users.csv', 'out.ndjson');
  const lines = fs.readFileSync('/app/out.ndjson', 'utf8').trim().split('\n');
  expect(lines).toHaveLength(300);
  expect(JSON.parse(lines[299])).toEqual({ id: '300', name: 'user300' });
  expect(source).toMatch(/\bpipeline\s*\(/);
  expect(source).not.toMatch(/\.pipe\s*\(/);
});

test('convertCsvFile() rejects with the original error and removes the partial output', async () => {
  writeFiles({ 'in/bad.csv': 'id,name\n1,Ada\n2,Alan\n3\n' });
  await expect(mod.convertCsvFile('in/bad.csv', 'bad.ndjson')).rejects.toThrow('Invalid row 4');
  expect(fs.existsSync('/app/bad.ndjson')).toBe(false);
  await expect(mod.convertCsvFile('in/missing.csv', 'none.ndjson')).rejects.toHaveProperty('code', 'ENOENT');
});
