Delete the `[option: string]: unknown;` line and read the new error on `stagingConfig`.
---
The property name is case sensitive: `useTLS` is not `useTls`.
---
Pick the protocol with a ternary: `config.useTls ? "https" : "http"`.
