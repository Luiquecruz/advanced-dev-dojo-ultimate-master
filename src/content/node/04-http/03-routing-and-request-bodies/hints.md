`matchRoute`: split both strings with `.split('/').filter(Boolean)`, compare lengths, then walk the pattern segments: a segment starting with `:` stores `decodeURIComponent(actual[index])` under `segment.slice(1)`, any other segment must be equal.
---
`readJsonBody`: check `req.headers['content-type']?.startsWith('application/json')` first. Then `req.setEncoding('utf8')` and `for await (const chunk of req)`: add `Buffer.byteLength(chunk)` to a byte counter, throw the 413 as soon as it passes the limit, and append the chunk to a string. Finally `JSON.parse(text)` inside a `try/catch` that throws the 400.
---
In `createListener`, compute every route whose pattern matches the pathname. None: 404. None with `route.method === req.method`: `res.setHeader('Allow', methods.join(', '))` and 405. Otherwise `await route.handler(req, params)` inside `try/catch`, using `error instanceof HttpError` to choose between `{ error: error.message }` and the generic 500 (after `console.error(error)`).
