# Sandboxing Tools

A permission policy decides which calls the agent *asks* for. A **sandbox** limits what any call can *do*, whatever the policy, the prompt or the model decided. It is the layer that still holds when the policy has a gap, when a prompt injection talks the model into something, or when an approved command does more than its text suggests (`npm test` runs whatever `package.json` says).

Two boundaries matter most for coding and research agents: **where files can be read and written**, and **which hosts the network can reach**.

## Layers of isolation

| Layer | What it limits | Examples |
| --- | --- | --- |
| Tool-level jail | paths and URLs your own tools accept | path checks in `read_file`, a URL allowlist in `fetch_url` |
| OS sandbox | every process the agent starts | macOS Seatbelt, Linux namespaces, Landlock, seccomp |
| Container or microVM | the whole machine the agent sees | Docker, gVisor, Firecracker, cloud sandboxes |
| Credentials | what a leaked token can reach | short-lived, scoped tokens; no production secrets |

Tool-level checks are what you write in application code, and they are the subject of the challenge. They only cover your own tools: the moment the agent has a shell, the OS sandbox or the container is the real boundary. Production harnesses stack several layers.

## A path jail

A file tool should accept paths relative to a **root** (the workspace) and refuse everything outside it. The algorithm is short, and each step closes a known bypass:

1. Reject empty paths and paths containing a NUL byte (`\0`), which some file APIs truncate.
2. **Resolve** the path against the root and **normalize** it: `notes/../../etc/passwd` becomes `/etc/passwd`. Absolute paths are resolved as they are, not appended to the root.
3. Accept the result only if it **is** the root or starts with **root + `/`**.

```ts
const target = resolve(root, requested);
if (target !== root && !target.startsWith(`${root}/`)) {
  throw new SandboxError('path_escape', `${requested} is outside the workspace`);
}
```

Step 3 has a classic bug: `target.startsWith(root)` accepts `/app/workspace-secrets/key.pem` for the root `/app/workspace`. Compare against the root plus a separator.

On a real disk, add one more step: resolve **symbolic links** (`realpath`) and check again, because a link inside the workspace can point anywhere. This course's virtual file system has no links, so the check above is complete here; on a real machine it is not.

## A network egress allowlist

Agents that can fetch URLs can **exfiltrate** data (send secrets to an attacker's server in a query string) and perform **server-side request forgery** (reach internal services such as `http://localhost:8080/admin` or the cloud metadata endpoint `169.254.169.254`). The defense is an **allowlist** of hosts, checked before every request:

- **Parse** with a real URL parser, never with regular expressions on the raw string.
- Allow only the schemes you need, usually `https:`.
- Reject URLs with credentials (`https://user:pass@host`) and explicit unusual ports.
- Reject **IP literals**. URL parsers normalize the many spellings of an address: `https://0x7f000001/`, `https://2130706433/` and `https://127.1/` all parse to the host `127.0.0.1`. Check the parsed hostname, not the input text, and refuse anything that is an IPv4 address or a bracketed IPv6 address.
- Reject `localhost` and its subdomains, and drop a trailing dot before comparing (`localhost.` is still localhost).
- Match hosts **exactly**, or as a subdomain when the allowlist says so (`*.github.com` allows `api.github.com`). Never use `endsWith('github.com')`: it allows `evilgithub.com`.
- Check every **redirect** target too. A harmless allowlisted URL can answer `302 Location: http://169.254.169.254/`. Fetch with redirects handled manually and run the same check on each hop.

A hostname check still trusts DNS: an allowed name can resolve to a private address (DNS rebinding). Egress proxies used in production resolve the name and check the resulting IP as well; tool-level checks cannot.

## Errors the model can use

When the jail refuses, return the refusal to the model as a tool result (`Error: path_escape: ../../etc/passwd is outside the workspace`) instead of crashing the loop. The model learns the boundary and usually tries a legitimate path; the harness logs the attempt, which is also a signal of prompt injection.

## Pitfalls

- `startsWith(root)` without the separator.
- Allowlists checked with `includes` or `endsWith` on the hostname.
- Validating the URL text and then fetching a redirect without checking it.
- Trusting tool-level checks once the agent has a shell.
- Mounting the home directory, SSH keys or cloud credentials into the sandbox "for convenience".

Optional sandboxes in coding agents use operating-system isolation, route network traffic through a proxy with a domain allowlist that starts empty, and keep settings files write-protected inside the workspace. Default modes limit writes to the workspace and keep network access off unless enabled. Cloud agents commonly run in containers or microVMs with egress proxies.

## When to choose it

Add a path jail to every file tool and an egress allowlist to every fetch tool from the first prototype; they are a few lines and remove whole classes of incidents. As soon as the agent runs arbitrary commands, put it in an OS sandbox or a container with no production credentials and a network allowlist, and treat tool-level checks as a second layer. Choose microVMs or remote sandboxes when you run untrusted code at scale or for many tenants, where a container escape would be a cross-customer breach.
