Summarize a log file of any size without loading it into memory.

1. `readLines(stream: AsyncIterable<string | Buffer>): AsyncGenerator<string>` is an async generator that yields every line of the stream:
   - lines are separated by `\n`; a line may be split across chunks;
   - empty lines in the middle are yielded as `''`;
   - the last line is yielded even without a trailing `\n`, but a trailing `\n` does not produce an extra empty line.
2. `summarizeLog(path: string): Promise<{ lines: number; errors: number }>` reads the file with `createReadStream(path, { encoding: 'utf8', highWaterMark: 16 })` (do not use `readFile`), counts the lines with `readLines`, and counts as `errors` the lines that contain `ERROR`. A missing file rejects with the `ENOENT` error.
