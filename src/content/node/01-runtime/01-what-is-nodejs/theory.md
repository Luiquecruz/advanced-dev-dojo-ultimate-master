# What Is Node.js

Node.js is a program that runs JavaScript outside the browser. It takes the same engine Chrome uses (**V8**), removes everything tied to a page (DOM, `window`, rendering) and adds what a server needs: files, network sockets, processes, environment variables and binary data.

If you know how the browser runs your React app, you already know most of Node's execution model.

## The pieces

| Piece | Role | Browser equivalent |
| --- | --- | --- |
| **V8** | Parses, compiles and runs JavaScript; owns the heap and the call stack | Same engine in Chrome and Edge |
| **libuv** | C library with the event loop, a thread pool and OS integration (sockets, files, timers, DNS) | The browser's own event loop and network stack |
| **Node bindings** | Built-in modules (`node:fs`, `node:http`, `node:crypto`...) that call into libuv and the OS | Web APIs (`fetch`, `localStorage`, `IndexedDB`) |
| **npm ecosystem** | Millions of packages installed into `node_modules` | The same registry your frontend uses |

## Non-blocking I/O on one thread

Your JavaScript runs on **one thread**. When code asks for I/O (read a file, query a database, call an API), Node hands the work to the operating system or libuv's thread pool and moves on. When the result is ready, a callback is queued and runs on the main thread.

```ts
import { readFile } from 'node:fs/promises';

async function main() {
  const text = await readFile('notes.txt', 'utf8');
  console.log('file length', text.length);
}

main();
console.log('main() is waiting for the disk; this line runs first');
```

While `readFile` waits, the thread is free to serve other requests. That is why one Node process can hold thousands of open connections with little memory: waiting costs nothing. The flip side: CPU work (hashing a large file, a heavy loop, parsing a huge JSON) **does** block the thread, and every request waits behind it. Node is excellent at I/O-bound work and needs extra tools (worker threads, separate services) for CPU-bound work.

## Node vs the browser

| Topic | Browser | Node.js |
| --- | --- | --- |
| Global object | `window` (and `globalThis`) | `globalThis` (legacy alias `global`) |
| Modules | ES modules only | ES modules and CommonJS (`require`) |
| Files and sockets | Sandboxed or absent | Full access with the user's permissions |
| Shared APIs | `fetch`, `URL`, `AbortController`, `TextEncoder`, `structuredClone`, Web Crypto, Web Streams | The same APIs, built in since Node 18 |
| Node-only | — | `process`, `Buffer`, `node:fs`, `node:http`, `node:child_process`... |
| Security model | Untrusted code, strict sandbox | Trusted code: a script can delete your home folder |

The last row matters most: a package you install runs with your full permissions. Supply-chain risks are covered in the package management lesson.

## Releases: LTS or Current

Node ships a new major every six months. **Even** majors (20, 22, 24) become **LTS** (Long Term Support) in October and receive fixes for about 30 months; **odd** majors (23, 25) are short-lived. Production runs an Active or Maintenance LTS line. Pin it in the project so every machine agrees:

```json
{
  "engines": { "node": ">=24" }
}
```

A `.nvmrc` file does the same for local tooling. Recent versions also run TypeScript directly (`node main.ts`) and include a test runner (`node:test`), a watcher (`node --watch`) and `.env` loading (`--env-file`).

## Alternatives: Deno and Bun

| Runtime | Engine | Strengths | Trade-offs |
| --- | --- | --- | --- |
| **Node.js** | V8 | Largest ecosystem, every host and library supports it, stable LTS | Older APIs coexist with modern ones |
| **Deno** | V8 (Rust core) | Permissions by default, TypeScript and tooling built in, web-standard APIs | Smaller ecosystem; npm compatibility is good but not total |
| **Bun** | JavaScriptCore (Zig core) | Very fast startup, installer and bundler built in | Younger; edge cases in Node compatibility |

Edge platforms (Cloudflare Workers, Vercel Edge) run V8 isolates with web-standard APIs but no `node:fs`. Frameworks such as Hono run on all of them because they only use `Request` and `Response`.

## How this runs in Dev Dojo

Lessons run on an in-browser Node 24 runtime with an in-memory file system and virtual ports. The code you write is the code you would run with `node main.ts`.

## When to choose it

Choose Node.js for I/O-heavy backends: REST and GraphQL APIs, BFFs (backend for frontend) next to a React or Angular app, real-time servers, CLIs and build tooling. Sharing TypeScript types and validation schemas between client and server is a real productivity gain. Prefer another stack (Go, Rust, Java, Python) for long CPU-bound computation, heavy numeric or ML work, or when the team's expertise lies there. Deno or Bun are reasonable for new projects that value built-in tooling, as long as your hosting and key libraries support them; Node remains the safest default.

## Working with AI

Tell the assistant the runtime and version ("Node 24, ES modules, TypeScript") or it may generate CommonJS, old callback APIs or packages for things Node now does natively. Review generated code for:

- `require` mixed into an ES module project, or `__dirname` in ESM without a replacement.
- Dependencies that duplicate built-ins: `node-fetch` (use `fetch`), `uuid` (use `crypto.randomUUID()`), `dotenv` (consider `--env-file`).
- Synchronous APIs (`readFileSync`, `execSync`) inside request handlers.
- CPU-heavy loops on the request path with no plan to move them off the main thread.
- A Node version in `engines`, Dockerfile and CI that matches the LTS you deploy.
