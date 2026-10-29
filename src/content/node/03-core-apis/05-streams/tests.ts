const { Readable } = require('node:stream');

async function collect(iterable: AsyncIterable<string>) {
  const lines: string[] = [];
  for await (const line of iterable) {
    lines.push(line);
  }
  return lines;
}

test('readLines() joins lines split across chunks', async () => {
  expect(await collect(mod.readLines(Readable.from(['first li', 'ne\nsec', 'ond\nthird\n'])))).toEqual(['first line', 'second', 'third']);
});

test('readLines() keeps empty lines and yields the last line without a trailing newline', async () => {
  expect(await collect(mod.readLines(Readable.from(['a\n\nb', '\nc'])))).toEqual(['a', '', 'b', 'c']);
  expect(await collect(mod.readLines(Readable.from(['only one line'])))).toEqual(['only one line']);
  expect(await collect(mod.readLines(Readable.from([])))).toEqual([]);
});

test('summarizeLog() counts lines and ERROR lines of a file', async () => {
  writeFiles({ 'logs/app.log': 'INFO boot\nERROR db down\nINFO retry with a long message that spans chunks\nERROR db down again\nINFO ready\n' });
  await expect(mod.summarizeLog('logs/app.log')).resolves.toEqual({ lines: 5, errors: 2 });
});

test('summarizeLog() streams with createReadStream instead of readFile', async () => {
  const big = Array.from({ length: 200 }, (_, index) => (index % 10 === 0 ? `ERROR ${index}` : `INFO ${index}`)).join('\n');
  writeFiles({ 'logs/big.log': big });
  await expect(mod.summarizeLog('logs/big.log')).resolves.toEqual({ lines: 200, errors: 20 });
  expect(source).toMatch(/createReadStream\s*\(/);
  expect(source).not.toMatch(/readFile\s*\(/);
});

test('summarizeLog() rejects with ENOENT for a missing file', async () => {
  await expect(mod.summarizeLog('logs/missing.log')).rejects.toHaveProperty('code', 'ENOENT');
});
