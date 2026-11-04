Sandbox an agent's file and network tools: a path jail over an in-memory file system, an egress allowlist for URLs, a fetch tool that also checks redirects, and a dispatcher that turns every refusal into a tool message the model can read.

The starter defines `SandboxError`, an `Exception` with a `code`: `"invalid_path"`, `"path_escape"` or `"egress_denied"`. The file system is `file_system` from `memory_file_system.py` (provided, do not change it): an in-memory disk with POSIX paths and working directory `/app`, with `absolute(path)`, `read_file`, `write_file`, `make_directories`, `list_directory` and `exists`. It raises `FileNotFoundError` for a missing file and has no symbolic links.

## 1. `create_jail(root)`

Return a `Jail` with `root`, `resolve(path)` and the async methods `read_file(path)`, `write_file(path, content)` and `list(path=".")`. `root` is the given root resolved to an absolute path (`"workspace"` becomes `/app/workspace`).

- `resolve(path)`: raise `SandboxError("invalid_path", ...)` for an empty path or a path containing `"\0"`. Resolve a relative path against the root and normalize an absolute path as it is (`posixpath.join` then `posixpath.normpath` does both). Return the absolute result when it equals the root or starts with the root followed by `/`; otherwise raise `SandboxError("path_escape", ...)`. `/app/workspace-secrets` is **outside** `/app/workspace`.
- `await read_file(path)`: the content of the resolved path. File system errors (such as `FileNotFoundError`) reach the caller unchanged.
- `await write_file(path, content)`: create the missing parent folders, then write the file.
- `await list(path=".")`: the entry names of the resolved folder, sorted.

## 2. `check_egress(url, policy)`

`policy` is a dict `{"allowedHosts": [...], "allowedSchemes": [...]}`; `"allowedSchemes"` is optional and defaults to `["https:"]`. An entry of `"allowedHosts"` is either an exact host (`registry.npmjs.org`) or `*.` plus a domain (`*.github.com`), which allows strict subdomains only (`api.github.com`, not `github.com` and not `evilgithub.com`).

Return `{"allowed": True, "host": host}` or `{"allowed": False, "reason": reason}`, applying these checks in order to the URL parsed with `urllib.parse.urlsplit`:

1. not parseable (`urlsplit` or reading `.port` raises `ValueError`), no scheme, or an `http`/`https` URL without a host → `"invalid_url"`;
2. the scheme plus `:` (`"https:"`) not in `"allowedSchemes"` → `"scheme"`;
3. a username or password → `"credentials"`;
4. an explicit port that is not the scheme's default (443 for `https`, 80 for `http`) → `"port"`;
5. the hostname, without a trailing dot, is an IP address in any spelling: `socket.inet_aton` accepts every IPv4 form (`0x7f000001`, `2130706433`, `127.1`) and `ipaddress.IPv6Address` the bracketed IPv6 ones (`urlsplit` drops the brackets) → `"ip_literal"`;
6. that hostname (already lowercase) is `localhost` or ends with `.localhost` → `"local_host"`;
7. that hostname matches no `"allowedHosts"` entry → `"not_allowlisted"`.

`host` is that normalized hostname.

## 3. `create_fetch_tool(*, fetch, policy, max_redirects=3)`

Return an async `fetch_url(url)`, which returns `{"status": ..., "url": ..., "body": ...}`.

- Check the URL with `check_egress`. When it is denied, raise `SandboxError("egress_denied", ...)` with the reason in the message, without calling `fetch`.
- Call `await fetch(url, redirect="manual")`. The response has `status`, `headers.get(name)` (lowercase names) and `await response.text()`.
- When the status is `301`, `302`, `303`, `307` or `308` and there is a `location` header, resolve it against the current URL (`urllib.parse.urljoin`), check it like the first URL, and fetch it. After `max_redirects` redirects, raise `SandboxError("egress_denied", ...)`.
- Otherwise return the status, the final URL and the body text.

## 4. `execute_tool_call(tool_call, *, jail, fetch_url)`

`tool_call` is a tool call dict from a model response (`"id"`, `"name"`, `"arguments"` as a JSON string). Return a tool message `{"role": "tool", "toolCallId": ..., "content": ...}` and never raise:

| Tool | Arguments | `"content"` on success |
| --- | --- | --- |
| `read_file` | `{"path"}` | the file content |
| `write_file` | `{"path", "content"}` | a confirmation that mentions the path |
| `list_files` | `{"path"}` (optional) | the names, one per line |
| `fetch_url` | `{"url"}` | the body |

Any failure (unparseable arguments, an unknown tool, a `SandboxError`, a file system error) becomes `"content"` starting with `Error:`; for a `SandboxError`, include its `code`.

The tests check what reaches the file system and the network, never the wording of model output.
