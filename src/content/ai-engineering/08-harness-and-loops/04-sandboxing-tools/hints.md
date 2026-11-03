In the jail, compute one absolute `target` per call: `normalize(path)` when the path starts with `/`, otherwise `resolve(root, path)`. Accept it only when `target === root || target.startsWith(root + '/')`. The separator is the whole point: without it, `/app/workspace-secrets` passes for `/app/workspace`.
---
In `checkEgress`, parse once with `new URL(url)` inside `try`/`catch` and work only with the parsed object: `protocol`, `username`, `password`, `port` and `hostname`. The parser has already turned `0x7f000001` and `2130706433` into `127.0.0.1`, so an IPv4 test on `hostname` (`/^\d{1,3}(\.\d{1,3}){3}$/`) plus `hostname.startsWith('[')` catches every spelling.
---
For a wildcard entry such as `*.github.com`, keep the leading dot when comparing: `host.endsWith('.github.com')`. That accepts `api.github.com` and rejects both `github.com` and `evilgithub.com`. Strip one trailing dot from the hostname before the localhost and allowlist checks.
---
The fetch tool is a loop: check the current URL, fetch it with `{ redirect: 'manual' }`, and return unless the status is a redirect with a `location` header. Otherwise count the redirect, throw past `maxRedirects`, and continue with `new URL(location, current).toString()`. In `executeToolCall`, put the parsing and the dispatch inside one `try` and build the `Error:` message in the `catch`, adding `error.code` for a `SandboxError`.
