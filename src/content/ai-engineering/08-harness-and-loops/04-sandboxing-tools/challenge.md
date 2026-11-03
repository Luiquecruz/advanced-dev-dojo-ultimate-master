Sandbox an agent's file and network tools: a path jail over the in-memory file system, an egress allowlist for URLs, a fetch tool that also checks redirects, and a dispatcher that turns every refusal into a tool message the model can read.

The starter exports `SandboxError`, an `Error` with a `code`: `'invalid_path'`, `'path_escape'` or `'egress_denied'`. The file system is the in-memory `node:fs` (working directory `/app`); it has no symbolic links.

## 1. `createJail(root)`

Return `{ root, resolve, readFile, writeFile, list }`. `root` is the given root resolved to an absolute path (`'workspace'` becomes `/app/workspace`).

- `resolve(path)`: throw `SandboxError('invalid_path', ...)` for an empty path or a path containing `\0`. Resolve a relative path against the root and normalize an absolute path as it is. Return the absolute result when it equals the root or starts with the root followed by `/`; otherwise throw `SandboxError('path_escape', ...)`. `/app/workspace-secrets` is **outside** `/app/workspace`.
- `readFile(path)`: the UTF-8 content of the resolved path. File system errors (such as `ENOENT`) reach the caller unchanged.
- `writeFile(path, content)`: create the missing parent folders, then write the file.
- `list(path = '.')`: the entry names of the resolved folder, sorted.

## 2. `checkEgress(url, policy)`

`policy` is `{ allowedHosts: string[], allowedSchemes?: string[] }`; `allowedSchemes` defaults to `['https:']`. An entry of `allowedHosts` is either an exact host (`registry.npmjs.org`) or `*.` plus a domain (`*.github.com`), which allows strict subdomains only (`api.github.com`, not `github.com` and not `evilgithub.com`).

Return `{ allowed: true, host }` or `{ allowed: false, reason }`, applying these checks in order to the parsed URL:

1. not parseable by `new URL(url)` → `'invalid_url'`;
2. protocol not in `allowedSchemes` → `'scheme'`;
3. a username or password → `'credentials'`;
4. an explicit port (`url.port` is not empty) → `'port'`;
5. the hostname is an IPv4 address or a bracketed IPv6 address, after parsing (so `0x7f000001` and `2130706433` count) → `'ip_literal'`;
6. the hostname, lowercase and without a trailing dot, is `localhost` or ends with `.localhost` → `'local_host'`;
7. that hostname matches no `allowedHosts` entry → `'not_allowlisted'`.

`host` is that normalized hostname.

## 3. `createFetchTool({ fetch, policy, maxRedirects = 3 })`

Return `fetchUrl(url)`, which resolves to `{ status, url, body }`.

- Check the URL with `checkEgress`. When it is denied, throw `SandboxError('egress_denied', ...)` with the reason in the message, without calling `fetch`.
- Call `fetch(url, { redirect: 'manual' })`. The response has `status`, `headers.get(name)` and `text()`.
- When the status is `301`, `302`, `303`, `307` or `308` and there is a `location` header, resolve it against the current URL, check it like the first URL, and fetch it. After `maxRedirects` redirects, throw `SandboxError('egress_denied', ...)`.
- Otherwise return the status, the final URL and the body text.

## 4. `executeToolCall(toolCall, { jail, fetchUrl })`

`toolCall` is a tool call from a model response (`id`, `name`, `arguments` as a JSON string). Return a tool message `{ role: 'tool', toolCallId, content }` and never throw:

| Tool | Arguments | `content` on success |
| --- | --- | --- |
| `read_file` | `{ path }` | the file content |
| `write_file` | `{ path, content }` | a confirmation that mentions the path |
| `list_files` | `{ path? }` | the names, one per line |
| `fetch_url` | `{ url }` | the body |

Any failure (unparseable arguments, an unknown tool, a `SandboxError`, a file system error) becomes `content` starting with `Error:`; for a `SandboxError`, include its `code`.

The tests check what reaches the file system and the network, never the wording of model output.
