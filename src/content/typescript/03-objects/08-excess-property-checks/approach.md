1. Remove the index signature from the interface.
2. Rename `useTLS` to `useTls` in `stagingConfig`.
3. Return `` `${protocol}://${config.host}:${config.port}` `` from `createServerUrl`.
