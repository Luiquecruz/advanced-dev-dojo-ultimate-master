Bridge a callback API to promises by hand, the way `util.promisify` does, then use it with `async`/`await`. Do not import `node:util` or `node:fs/promises`.

1. `promisify(fn)` returns a function that:
   - calls `fn` with all the arguments it received plus an error-first callback as the last argument;
   - returns a promise that rejects with the **same** error object when the callback receives an error, and resolves with the value otherwise.
2. `readJson(path, callback)` is a Node-style callback API:
   - reads the file with `readFile(path, 'utf8', ...)` from `node:fs`;
   - on a read error, calls `callback(error)` (a missing file gives an error with `code: 'ENOENT'`);
   - on invalid JSON, calls `callback(syntaxError)` with the `SyntaxError` from `JSON.parse`; it never throws;
   - on success, calls `callback(null, data)`;
   - calls the callback **exactly once** in every case.
3. `readJsonAsync` is `promisify(readJson)` (already written).
4. `loadSettings(path)` is `async` and returns `{ ...DEFAULT_SETTINGS, ...fileContent }`. When the file does not exist (`ENOENT`) it returns a copy of `DEFAULT_SETTINGS`; any other error (invalid JSON) rejects.
