The staging server should use TLS, but a typo in `stagingConfig` goes unnoticed because of an index
signature.

1. Remove the index signature from `ServerConfig` so it only has `host`, `port` and the optional
   `useTls`.
2. Fix the error the compiler now reports in `stagingConfig`.
3. Implement `createServerUrl(config: ServerConfig): string` returning `"https://<host>:<port>"` when
   `useTls` is `true`, otherwise `"http://<host>:<port>"`.

```ts
createServerUrl(stagingConfig);                        // "https://staging.example.com:8443"
createServerUrl({ host: 'localhost', port: 3000 });    // "http://localhost:3000"
```
