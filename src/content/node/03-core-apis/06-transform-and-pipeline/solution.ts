import { createReadStream, createWriteStream } from 'node:fs';
import { rm, readFile, writeFile } from 'node:fs/promises';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';

export function splitLines(): Transform {
  let rest = '';
  return new Transform({
    readableObjectMode: true,
    transform(chunk, _encoding, callback) {
      const parts = (rest + String(chunk)).split('\n');
      rest = parts.pop() ?? '';
      parts.forEach((line) => this.push(line));
      callback();
    },
    flush(callback) {
      if (rest !== '') {
        this.push(rest);
      }
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
      lineNumber++;
      if (line.trim() === '') {
        return callback();
      }
      const values = line.split(',');
      if (!header) {
        header = values;
        return callback();
      }
      if (values.length !== header.length) {
        return callback(new Error(`Invalid row ${lineNumber}`));
      }
      callback(null, Object.fromEntries(header.map((column, index) => [column, values[index]])));
    },
  });
}

export function toNdjson(): Transform {
  return new Transform({
    writableObjectMode: true,
    transform(record, _encoding, callback) {
      callback(null, `${JSON.stringify(record)}\n`);
    },
  });
}

export async function convertCsvFile(input: string, output: string): Promise<void> {
  try {
    await pipeline(createReadStream(input, { encoding: 'utf8' }), splitLines(), csvToObjects(), toNdjson(), createWriteStream(output));
  } catch (error) {
    await rm(output, { force: true });
    throw error;
  }
}

async function main() {
  await writeFile('users.csv', 'id,name,role\n1,Ada,admin\n2,Alan,editor\n');
  await convertCsvFile('users.csv', 'users.ndjson');
  console.log(await readFile('users.ndjson', 'utf8'));
}

main();
