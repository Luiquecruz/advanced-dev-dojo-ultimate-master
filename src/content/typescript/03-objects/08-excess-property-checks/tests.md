## type: ServerConfig only knows host, port and useTls

```ts
type _ = Expect<Equal<keyof ServerConfig, 'host' | 'port' | 'useTls'>>;
```

## type: Misspelled options in object literals are rejected

```ts
// @ts-expect-error
createServerUrl({ host: 'example.com', port: 443, usetls: true });
```

## forbid: Does not use a string index signature

```regex
\[\s*\w+\s*:\s*string\s*\]\s*:
```

## runtime: Staging uses https

```js
assert.equal(createServerUrl(stagingConfig), 'https://staging.example.com:8443');
```

## runtime: Configurations without TLS use http

```js
assert.equal(createServerUrl({ host: 'localhost', port: 3000 }), 'http://localhost:3000'); assert.equal(createServerUrl({ host: 'api.local', port: 80, useTls: false }), 'http://api.local:80');
```
