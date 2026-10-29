Convert a CSV file to NDJSON (one JSON object per line) with three transforms and `pipeline`.

1. `splitLines(): Transform` — text in, one string per line out (`readableObjectMode: true`). Lines may be split across chunks; the last line is emitted in `flush` when it is not empty.
2. `csvToObjects(): Transform` — `objectMode: true`. The first line is the header (column names separated by `,`). Each following line becomes an object mapping column names to string values. Skip empty lines. A line with a different number of values than the header fails the stream with `new Error('Invalid row <n>')`, where `n` is the line number counting the header as line 1.
3. `toNdjson(): Transform` — `writableObjectMode: true`, emits `JSON.stringify(record) + '\n'` for each record.
4. `convertCsvFile(input: string, output: string): Promise<void>` runs `pipeline` from `node:stream/promises` with `createReadStream(input, { encoding: 'utf8' })`, the three transforms and `createWriteStream(output)`. If the pipeline fails, delete `output` (ignore a missing file) and rethrow the original error.
