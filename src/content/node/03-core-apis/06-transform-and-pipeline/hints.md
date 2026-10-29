`splitLines` reuses the line logic of the previous lesson: split `rest + String(chunk)` on `'\n'`, keep `parts.pop()` in `rest` and `this.push` each complete line. In `flush`, push `rest` when it is not empty.
---
In `csvToObjects`, increment `lineNumber` for every incoming line before anything else. The first non-empty line becomes `header`; for later lines compare `values.length` with `header.length` and call `callback(new Error(...))` on a mismatch, otherwise `callback(null, Object.fromEntries(header.map((column, index) => [column, values[index]])))`.
---
`toNdjson` is `callback(null, JSON.stringify(record) + '\n')`. `convertCsvFile` wraps `await pipeline(createReadStream(input, { encoding: 'utf8' }), splitLines(), csvToObjects(), toNdjson(), createWriteStream(output))` in `try`, and the `catch` runs `await rm(output, { force: true })` before `throw error`.
