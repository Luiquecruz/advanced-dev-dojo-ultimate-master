import { createReadStream, createWriteStream } from 'node:fs';
import { rm, readFile, writeFile } from 'node:fs/promises';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';

export function splitLines(): Transform {
  let rest = '';
  return new Transform({
    readableObjectMode: true,
    transform(chunk, _encoding, callback) {
      // TODO: push every complete line and keep the unfinished tail in rest
      callback();
    },
    flush(callback) {
      // TODO: push the last line when it is not empty
      callback();
    },
  });
}

export function csvToObjects(): Transform {
  let header: string[] | undefined;
  let lineNumber = 0;
  return new Transform({
    objectMode: true,
    transform(line: string, _encoding, callback) {
      // TODO: read the header first, skip empty lines, map values to columns or fail with 'Invalid row <n>'
      callback();
    },
  });
}

export function toNdjson(): Transform {
  return new Transform({
    writableObjectMode: true,
    transform(record, _encoding, callback) {
      // TODO: emit the record as one JSON line
      callback();
    },
  });
}

export async function convertCsvFile(input: string, output: string): Promise<void> {
  // TODO: pipeline(read, splitLines, csvToObjects, toNdjson, write), delete output and rethrow on failure
}

async function main() {
  await writeFile('users.csv', 'id,name,role\n1,Ada,admin\n2,Alan,editor\n');
  await convertCsvFile('users.csv', 'users.ndjson');
  console.log(await readFile('users.ndjson', 'utf8'));
}

main();
