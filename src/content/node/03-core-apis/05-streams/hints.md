Keep a `rest` string outside the loop. For each chunk, split `rest + chunk` on `'\n'`: every part except the last is a complete line.
---
`rest = parts.pop()` keeps the unfinished tail for the next chunk; `yield* parts` emits the complete lines. After the loop, yield `rest` only when it is not empty.
---
`summarizeLog`: `for await (const line of readLines(createReadStream(path, { encoding: 'utf8', highWaterMark: 16 })))`, incrementing `lines` every time and `errors` when `line.includes('ERROR')`. A missing file throws inside the loop, so no `try/catch` is needed.
