import { createReadStream } from 'node:fs';
import { writeFile } from 'node:fs/promises';

export async function* readLines(stream: AsyncIterable<string | Buffer>): AsyncGenerator<string> {
  // TODO: keep the unfinished tail between chunks and yield complete lines, then the last one
  for await (const chunk of stream) {
    yield* String(chunk).split('\n');
  }
}

export async function summarizeLog(path: string): Promise<{ lines: number; errors: number }> {
  // TODO: stream the file with createReadStream (utf8, highWaterMark 16) and count lines and ERROR lines
  return { lines: 0, errors: 0 };
}

async function main() {
  await writeFile('server.log', 'INFO boot\nERROR db down\nINFO retry\nERROR db down again\nINFO ready\n');
  console.log(await summarizeLog('server.log'));
}

main();
