Build a route table, a safe JSON body reader and a dispatcher with `node:http`. Every response is JSON (`Content-Type: application/json`) and errors have the shape `{ "error": string }`.

1. `class HttpError extends Error` with `constructor(status: number, message: string)` and a public `status` property (provided in the starter).
2. `matchRoute(pattern: string, pathname: string): Record<string, string> | null` — segments are separated by `/`; literal segments must match exactly, `:name` segments capture the URL-decoded value. Return `null` when the number of segments or a literal differs.
3. `readJsonBody(req: IncomingMessage, limitBytes: number): Promise<unknown>` throws:
   - `HttpError(415, 'Content-Type must be application/json')` unless the `content-type` header starts with `application/json`;
   - `HttpError(413, 'Payload too large')` when the body exceeds `limitBytes` bytes;
   - `HttpError(400, 'Invalid JSON')` when the body (including an empty one) is not valid JSON.
4. `createListener(routes: Route[])` returns a `(req, res)` listener that:
   - matches `pathname` (ignore the query string) against each route's `pattern`;
   - no route for the path: `404 { error: 'Not found' }`;
   - routes exist for the path but not for `req.method`: `405 { error: 'Method not allowed' }` with an `Allow` header listing those methods joined by `, ` in route order;
   - otherwise calls `handler(req, params)` and sends its `{ status, body }`;
   - a thrown `HttpError` becomes its status and `{ error: message }`; any other error is logged with `console.error` and becomes `500 { error: 'Internal server error' }`.
5. The exported `routes` must serve:
   - `GET /users/:id`: `200` with the user, or `HttpError(404, 'User not found')`;
   - `POST /users`: reads the body with a 1024-byte limit; `name` must be a non-empty string, otherwise `HttpError(422, 'name is required')`; adds `{ id: <highest id + 1>, name }` to `users` and answers `201` with it.
