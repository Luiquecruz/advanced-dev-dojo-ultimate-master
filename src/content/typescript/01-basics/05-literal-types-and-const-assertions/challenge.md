The HTTP helper accepts any string as a method. Tighten it by deriving the types from the values.

1. Add a const assertion to `HTTP_METHODS` so it becomes `readonly ["GET", "POST", "PUT", "DELETE"]`.
2. Derive `HttpMethod` from `HTTP_METHODS` so it equals `"GET" | "POST" | "PUT" | "DELETE"`. Do not repeat the strings.
3. Make `defaultRequest.method` keep the literal type `"GET"` (a const assertion on the object works).
4. Implement `describeRequest(request: { url: string; method: HttpMethod }): string` returning `"<METHOD> <url>"`.

```ts
describeRequest(defaultRequest);                        // "GET /api/users"
describeRequest({ url: '/api/todos', method: 'POST' }); // "POST /api/todos"
describeRequest({ url: '/', method: 'PATCH' });         // type error
```
