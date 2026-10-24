## type: User and FetchUserOptions are derived from fetchUser

```ts
type _ = [
  Expect<Equal<User, { id: number; name: string; posts: string[] }>>,
  Expect<Equal<FetchUserOptions, { includePosts: boolean }>>,
];
```

## type: Logger and HttpClientArgs are derived

```ts
type _ = [
  Expect<Equal<Logger['level'], 'info' | 'debug'>>,
  Expect<Equal<Logger['format'], (message: string) => string>>,
  Expect<Equal<HttpClientArgs, [baseUrl: string, timeoutMs?: number]>>,
];
createClient('https://api.example.com');
// @ts-expect-error the timeout must be a number
createClient('https://api.example.com', '5s');
```

## pattern: Uses the utility types instead of hand-written shapes

```regex
Awaited\s*<\s*ReturnType\s*<\s*typeof\s+fetchUser[\s\S]*Parameters\s*<\s*typeof\s+fetchUser[\s\S]*ConstructorParameters\s*<\s*typeof\s+HttpClient
```

## runtime: loadUsers fetches every user in order

```js
const users = await loadUsers([3, 1], { includePosts: true });
assert.deepEqual(users, [
  { id: 3, name: 'User 3', posts: ['Post by 3'] },
  { id: 1, name: 'User 1', posts: ['Post by 1'] },
]);
assert.deepEqual(await loadUsers([], { includePosts: false }), []);
```

## runtime: createClient forwards constructor arguments

```js
const client = createClient('https://api.example.com', 1000);
assert.ok(client instanceof HttpClient);
assert.equal(client.baseUrl, 'https://api.example.com');
assert.equal(client.timeoutMs, 1000);
assert.equal(createClient('https://x.dev').timeoutMs, 5000);
```
