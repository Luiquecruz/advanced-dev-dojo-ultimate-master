import { createReadStream } from 'node:fs';
import { writeFile } from 'node:fs/promises';

export async function* readLines(stream: AsyncIterable<string | Buffer>): AsyncGenerator<string> {
  let rest = '';
  for await (const chunk of stream) {
    const parts = (rest + String(chunk)).split('\n');
    rest = parts.pop() ?? '';
    yield* parts;
  }
  if (rest !== '') {
    yield rest;
  }
}

export async function summarizeLog(path: string): Promise<{ lines: number; errors: number }> {
  const summary = { lines: 0, errors: 0 };
  for await (const line of readLines(createReadStream(path, { encoding: 'utf8', highWaterMark: 16 }))) {
    summary.lines++;
    if (line.includes('ERROR')) {
      summary.errors++;
    }
  }
  return summary;
}

async function main() {
  await writeFile('server.log', 'INFO boot\nERROR db down\nINFO retry\nERROR db down again\nINFO ready\n');
  console.log(await summarizeLog('server.log'));
}

main();
