# Content Guide

Each track is a folder in `src/content/<track>/`; the current tracks and their plans are listed in [CURRICULUM.md](CURRICULUM.md). A track declares its engine in `track.json` (`"engine": "react"`), so several tracks can share one engine (`react-state` and `architecture` run on the React engine). Every lesson is a folder:

```
src/content/<track>/<NN-module>/<NN-lesson-id>/
```

Number prefixes define order and are stripped from ids. Lesson ids must be **unique inside a track**. Use kebab-case.

All content is written in **English**.

## Files

| File | Required | Purpose |
| --- | --- | --- |
| `meta.json` | yes | `{ "title", "summary", "level", "tags"?, "preview"?, "entry"?, "resources"? }` |
| `theory.md` | yes | The lesson. GitHub flavored Markdown with fenced code (`ts`, `tsx`, `jsx`, `vue`, `html`, `bash`, `css`, `json`, `sql`) |
| `concepts.json` | recommended | Glossary cards `[{ "term", "description" }]` (Markdown allowed) |
| `challenge.md` | for practice | The task: exact names, signatures, texts and behaviors the tests check |
| `starter.<ext>` or `starter/` | with challenge | Code the editor starts with |
| `solution.<ext>` or `solution/` | with challenge | Reference solution (same file names as starter) |
| `tests.<ext>` | with challenge | Validation (format per track below) |
| `hints.md` | with challenge | 2–4 progressive hints separated by a line containing only `---`, from gentle nudge to almost-the-answer |
| `approach.md` | with challenge | "Solution path": numbered reasoning steps, without pasting the full solution |
| `quiz.json` | optional | `[{ "question", "options": [...], "answer": <index>, "explanation" }]` (Markdown allowed) |
| `module.json` | per module | `{ "title", "description" }` |
| `track.json` | per track | `{ "engine", "order", "title", "monogram", "shortTitle"?, "description", "version" }`; the accent color lives in `src/shared/design/tokens.css` (rules in [ARCHITECTURE.md](ARCHITECTURE.md#track-presentation)) |

- `level`: `beginner`, `intermediate`, `advanced` or `expert`.
- `tags`: free list. Conventions: `core`, `legacy`, `modern`, `new` (latest-version feature), `ecosystem`, `theory`, `typescript`, `performance`, `testing`.
- `preview`: `false` hides the live preview for non-visual work (composables, services, utilities). The TypeScript and Node.js tracks never show a preview; they have a **Run** button that prints the console output instead.
- `entry`: required for multi-file challenges (`starter/` + `solution/` folders). Files may sit in subfolders (`features/cart/index.js`); imports resolve relative to the importing file (`./model`, `../../shared/ui/Button`), try the extensions `.ts`, `.tsx`, `.js`, `.jsx`, `.vue` and then a folder `index` file, and a leading `/` resolves from the project root. Tests reach nested files with `modules['features/cart/index.js']` and `sources['features/cart/index.js']`. Single-file defaults: TypeScript `main.ts`; React `App.jsx`/`App.tsx`; Vue `App.vue` (or `main.ts` when the starter is `.ts`); Angular `app.ts`; Node.js `main.ts`.
- A lesson needs a challenge, a quiz, or both. Theory-only topics (tooling, frameworks, architecture, history) use a 4–6 question quiz.
- **Write `meta.json` last**, after every other file of the lesson exists. The loader only picks up folders that have `meta.json`, so half-written lessons stay invisible to other authors running the verifier.

## Writing good lessons

- `theory.md` teaches: what it is, why it exists, how it works (small runnable examples), pitfalls, and when to use it. Show the **legacy way vs the modern way** when an API evolved. 250–900 words.
- `challenge.md` is precise: the tests are the contract. Name every export, selector, text, role and prop the tests rely on.
- Starter code compiles, fails at least one test, and marks every place to write code with comments (`// TODO: ...`, `{/* TODO: ... */}`, `<!-- TODO: ... -->`).
- Tests describe requirements as sentences ("renders the user name in an <h3>"). Prefer behavior (what users see and do). Use source checks only to require a specific API, with tolerant regexes. 3–6 tests per challenge.
- Never rely on memory for library APIs: check the type definitions in `node_modules/<package>` (versions below).

## Installed versions

React engine (tracks `react`, `react-state`, `architecture`): React 19.3 · react-dom 19.3 · react-router 7 · @tanstack/react-query 5 · zustand 5 (`zustand/middleware`, `zustand/middleware/immer`, `zustand/shallow`, `zustand/react/shallow`, `zustand/vanilla`) · jotai 3 (`jotai/utils`) · @reduxjs/toolkit 2 · react-redux 9 · react-hook-form 7 · @hookform/resolvers 5 · zod 4 · clsx 2 · `@reduxjs/toolkit/query(/react)` · mobx 7 · mobx-react-lite 5 · valtio 2 (`valtio/utils`) · xstate 5 · @xstate/react 6 · immer 11 · use-immer
Vue 3.5 (full build with runtime template compiler) · vue-router 5 · pinia 4 · @vueuse/core 15 · @tanstack/vue-query 5 · vee-validate 4.15 · zod 4
Angular 22 (zoneless by default, Signal Forms in `@angular/forms/signals`, `FetchBackend` default for HttpClient) · @ngrx/signals 22 · @ngrx/store 22 · rxjs 7.8 · zod 4
TypeScript engine: TypeScript 6.0 compiler API (theory may cover TypeScript 7 native compiler)
Node.js engine (track `node`): in-browser Node 24 runtime (see below) · hono 4.13 (`hono/http-exception`, `hono/validator`, `hono/cors`, `hono/logger`, `hono/request-id`, `hono/secure-headers`, `hono/bearer-auth`, `hono/basic-auth`, `hono/jwt`, `hono/factory`, `hono/streaming`, `hono/client`, `hono/timing`, `hono/body-limit`, `hono/etag`, `hono/cookie`, `hono/testing`, `hono/timeout`) · @hono/zod-validator 0.9 · zod 4

## Fake REST API (React, Vue, Angular, Node.js)

Available in previews and tests through `fetch` (and Angular `HttpClient`): `GET /api/users`, `/api/users/:id`, `/api/posts`, `/api/posts/:id`, `/api/posts?userId=`, `/api/products?q=`, `/api/products/:id`, `/api/search?q=`, `GET|POST /api/todos`, `GET|PATCH|PUT|DELETE /api/todos/:id`, `GET|POST /api/orders` (POST answers 201 with the body plus `id` and `status: 'confirmed'`), `GET /api/orders/:id`, `/api/error` (500). Also reachable as `https://api.example.com/...`.

Data: users 1 Ada Lovelace, 2 Alan Turing, 3 Grace Hopper, 4 Linus Torvalds, 5 Margaret Hamilton (`id, name, email, role`); todos 1 "Learn JSX" (completed), 2 "Master hooks", 3 "Ship a React app" (`id, title, completed`); products Keyboard 120, Mouse 45, IDE License 199, Monitor 340, Cloud Credits 50 (`id, name, price, category`); posts `id, userId, title, body` (4 posts). Orders start empty. Data resets before each test.

## Framework tests (React, Vue, Angular)

Test file: React engine tracks (`react`, `react-state`, `architecture`) `tests.jsx`, Vue `tests.ts`, Angular `tests.ts`, Node.js `tests.ts`. Plain script, **no imports**, TypeScript syntax allowed (Angular tests may declare host components with decorators). React tests may use JSX.

Each `test(name, fn)` runs against a **fresh evaluation** of the learner project and a clean DOM. Test names are listed to the learner before running. Each test times out after 4 s. Keep `test()` calls at the top level.

Globals available in every framework track:

- `mod` — exports of the entry file; `modules['store.ts']` — exports of any project file
- `require(name)` — any module available to learner code (e.g. `require('pinia')`, `require('@angular/common/http/testing')`)
- `source` — entry file with comments stripped (for API-usage checks); `sources['file.ts']` for other files; `rawSource` keeps comments
- `expect` — Jest-like: `toBe`, `toEqual`, `toStrictEqual`, `toBeTruthy`, `toBeFalsy`, `toBeNull`, `toBeUndefined`, `toBeDefined`, `toBeTypeOf`, `toBeInstanceOf`, `toContain`, `toContainEqual`, `toMatch`, `toHaveLength`, `toHaveProperty`, `toBeGreaterThan(OrEqual)`, `toBeLessThan(OrEqual)`, `toThrow` (message substring, RegExp or error class), `toHaveBeenCalled`, `toHaveBeenCalledTimes`, `toHaveBeenCalledWith`, `toHaveBeenLastCalledWith`, `toBeInTheDocument`, `toHaveTextContent`, `toHaveAttribute`, `toHaveValue`, `toBeChecked`, `toBeDisabled`, `toBeEnabled`, `toHaveClass`, `toHaveStyle`, `toHaveFocus`, with `.not`, `.resolves`, `.rejects`, plus asymmetric matchers `expect.anything()`, `expect.any(Ctor)`, `expect.objectContaining()`, `expect.arrayContaining()`, `expect.stringContaining()`, `expect.stringMatching()`
- `fn(impl?)` — mock function (`mock.calls`, `mockReturnValue`, `mockResolvedValue`, `mockRejectedValue`, `mockImplementation`, their `*Once` variants queued before the default, `mockClear`)
- `screen`, `within`, `waitFor`, `fireEvent` — Testing Library; `user` — `userEvent.setup()` instance; `userEvent`
- `sleep(ms)`, `mockApi(match, handlerOrValue)` (override a fake API route for this test), `jsonResponse(data, status)`

React extras: `render`, `renderHook`, `act` (React Testing Library), `React`.

Vue extras: `mount`, `shallowMount`, `flushPromises` (Vue Test Utils), `render` (Testing Library Vue), `nextTick`. Mount plugins with `mount(mod.default, { global: { plugins: [require('pinia').createPinia(), router] } })`. Mounted wrappers are unmounted automatically. For components that resolve through `<Suspense>` (async `setup`, top-level `await`), use `mount(Component, { attachTo: document.body })` instead of `render`: Testing Library's `render` unwraps the app root element, so the resolved branch is inserted into a detached node and the container ends up empty.

Angular extras (signal `input()`, `model()`, `output()`, `outputFromObservable()` and signal queries `viewChild()`/`viewChildren()`/`contentChild()`/`contentChildren()` are supported through a JIT transform equivalent to the Angular CLI one, in learner files and in test files; declare host components in tests with `const { Component } = require('@angular/core');` at the top of the test file): `render(Component, { inputs?, providers?, imports? })` → `{ fixture, component, element, setInput(name, value), stable() }` (configures TestBed, creates the component, auto-detects changes and awaits stability), `stable()` (awaits every rendered fixture; call it after user interactions or async work), `TestBed`. TestBed is reset between tests.

Previews: React renders `export default`. Vue mounts `export default` and calls an exported `configureApp(app)` first when present (install router/pinia there). Angular bootstraps the default export or the first exported standalone component with the exported `appConfig` when present.

Routers in tests: React `MemoryRouter`/`createMemoryRouter`; Vue `createMemoryHistory()`; Angular `provideRouter(routes)` + `RouterTestingHarness` or `withComponentInputBinding()`.

## Node.js track (`node`)

The Node.js engine is a framework-family engine without a preview: learner files (`.ts`, `.js`) are transpiled to CommonJS and evaluated in the sandbox iframe (tests) or in Vitest (`npm run verify`). Node built-ins are in-browser implementations in `src/engines/node/runtime/`, importable with or without the `node:` prefix. Write lessons in TypeScript with ES module syntax (`import { readFile } from 'node:fs/promises'`). Multi-file challenges use no `.json` files (the loader does not read JSON from lesson folders; seed data with `writeFiles` or a `.ts` module). Each test evaluates the entry again, so a demo `main()` in the entry must work on its own instances, never on exported state the tests use.

Available built-ins and their limits:

| Module | What exists |
| --- | --- |
| `events` | `EventEmitter` (npm `events` 3: `on`, `once`, `off`, `emit`, `prependListener`, `listenerCount`, `setMaxListeners`, `'error'` throws when unhandled), `once(emitter, name)` promise, `on(emitter, name)` async iterator |
| `buffer` | `Buffer` (npm `buffer` 6; no `base64url` encoding: convert from `base64`), also a global |
| `stream`, `stream/promises` | `Readable`, `Writable`, `Duplex`, `Transform`, `PassThrough`, `pipeline`, `finished`, `Readable.from`, async iteration, backpressure (npm `readable-stream` 4, Node's own code) |
| `fs`, `fs/promises` | In-memory file system, cwd `/app`, `/tmp` exists. Sync, callback and promise APIs: `readFile`, `writeFile` (flag `wx`), `appendFile`, `mkdir` (`recursive`), `readdir` (`withFileTypes`, `recursive`), `stat`, `access`, `unlink`, `rm`, `rmdir`, `rename`, `copyFile`, `existsSync`, `createReadStream` (`highWaterMark`, `start`, `end`, `encoding`), `createWriteStream` (`flags: 'a'`). Errors carry Node codes (`ENOENT`, `EEXIST`, `EISDIR`, `ENOTDIR`, `ENOTEMPTY`) and messages |
| `path` | POSIX `join`, `resolve` (against `/app`), `normalize`, `dirname`, `basename`, `extname`, `relative`, `parse`, `format`, `isAbsolute`, `sep` |
| `http` | In-memory `createServer`, `Server` (`listen`, `close` waits for in-flight requests, `address()`, `'listening'`/`'close'`/`'error'` with `EADDRINUSE`), `IncomingMessage` (readable stream, lowercase `headers`), `ServerResponse` (writable stream: `statusCode`, `setHeader`, `getHeader`, `writeHead`, `write`, `end`, `headersSent`, `ERR_HTTP_HEADERS_SENT`), `STATUS_CODES`, `METHODS`. `fetch('http://localhost:<port>/...')` reaches listening servers; a port with no server rejects with `TypeError('fetch failed')` (`cause.code === 'ECONNREFUSED'`) |
| `crypto` | `createHash` and `createHmac` (`sha256`, `sha1`; digests `hex`, `base64`, `base64url` or a Buffer), `hash()`, `pbkdf2`/`pbkdf2Sync` (pure JS: keep iterations ≤ 1000 in lessons and say production uses 600 000+ or scrypt/argon2), `randomBytes`, `randomUUID`, `randomInt`, `timingSafeEqual`, `webcrypto`/`subtle`. No `scrypt`, ciphers, sign/verify |
| `util` | `promisify` (with `promisify.custom`), `callbackify`, `inspect`, `format`, `parseArgs`, `isDeepStrictEqual`, `deprecate`, `types`, `TextEncoder`/`TextDecoder` |
| `assert`, `assert/strict` | `ok`, `equal`/`strictEqual`, `deepEqual`/`deepStrictEqual`, `notEqual`, `match`, `throws`, `rejects`, `doesNotThrow`, `fail`, `AssertionError` |
| `process` | Global and module: `env` (reset per test: `NODE_ENV=development`, `HOME`, `PATH`), `argv` (`['/usr/local/bin/node', '/app/main.js']`), `cwd()`, `exit()` (throws `ProcessExit` and sets `exitCode`), `exitCode`, `nextTick`, `hrtime`/`hrtime.bigint`, `memoryUsage`, `uptime`, `on/emit` (signals such as `'SIGTERM'` are emitted by tests with `process.emit('SIGTERM')`), `stdout.write`/`stderr.write`, `version`, `platform` |
| `timers`, `timers/promises` | Node timer handles (`ref`, `unref`, `hasRef`, `refresh`), `setImmediate`; promise `setTimeout(ms, value, { signal })`, `setImmediate`, `scheduler.wait`. `setTimeout`, `setInterval`, `setImmediate` and their `clear*` are also globals |
| `os`, `url`, `querystring` | Static `os` values (4 CPUs, linux), `fileURLToPath`, `pathToFileURL`, `URL`, `URLSearchParams` |

Not available: `child_process`, `worker_threads`, `cluster`, `net`, `dgram`, `tls`, `https` servers, `zlib`, `readline`, `async_hooks`/`AsyncLocalStorage`, `vm`, `node:test`, `node:sqlite`, real databases. Teach those in theory and quizzes. Also avoid top-level `await` (files are CommonJS: wrap in `async function main()`), `import.meta`, `require()` calls in learner code, and exact interleaving of `process.nextTick`, promises, `setImmediate` and timers (the runtime only approximates the event loop phases; test event-loop knowledge with data the learner writes, not by observing execution order).

Globals in `tests.ts` (plus the shared ones: `mod`, `modules`, `require`, `source`, `sources`, `expect`, `fn`, `sleep`, `mockApi`):

- `request(target, path, init?)` → `Promise<{ status, headers, text, body }>`. `target` is a `node:http` server, a `(req, res)` listener, a Hono app (anything with `fetch`), or a Fetch handler `(request) => Response`. `init` is `{ method?, headers?, body? }`; an object `body` is sent as JSON. `body` in the result is the parsed JSON when the response is JSON, otherwise the text. `headers` keys are lowercase.
- `writeFiles({ 'data/users.json': '...' })` seeds the in-memory file system (relative paths resolve against `/app`, parent folders are created); `fs` is the `node:fs` module.
- `captureLogs()` returns an array that collects every `console.*` call (formatted like Node) until the test ends.
- `process`, `Buffer`.

Every test starts with an empty file system, a fresh `process.env`, no listeners on `process`, no timers and no listening servers, and evaluates the learner project again. Prefer injecting time (`now: () => number`) and waiting (`sleep(ms)`) as parameters over real delays; keep any real delay under 100 ms per test (4 s timeout per test).

The **Run** button executes the entry file like `node main.ts`, prints the console output (objects formatted like `util.inspect`) and ends when no timers, fetches or busy servers remain, after 1 s with only an idle listening server, or after 5 s.

Every Node.js theory ends with two sections: **`## When to choose it`** (the decision, with the alternatives and their trade-offs) and **`## Working with AI`** (what to ask an assistant for and the checklist to review what it generates). The track teaches a frontend developer to direct and review backend code, so decisions and review criteria matter as much as syntax.

## TypeScript track tests (`tests.md`)

Learner code is a single `main.ts`. Each test is a `## <kind>: <name>` heading followed by one fenced block:

````md
## type: price accepts numbers only

```ts
price = 10;
// @ts-expect-error
price = "10";
```

## runtime: formats the total

```js
assert.equal(formatTotal([1, 2]), "$3.00");
```

## pattern: uses satisfies

```regex
satisfies\s+Record
```

## forbid: does not use any

```regex
\bany\b
flags: i
```
````

- `type`: TypeScript snippet appended after the learner code inside `{ ... }` and type checked with `strict`. Fails on any type error. Helpers: `Expect<T extends true>`, `ExpectFalse<T>`, `Equal<X, Y>`, `NotEqual<X, Y>`, `IsAny<T>`, `Extends<A, B>`, `expectType<T>(value)`. `// @ts-expect-error` proves invalid code is rejected. `typeof variable` yields the narrowed type, so test variables through assignability.
- `runtime`: JavaScript (no type annotations) run in an async function after transpiling the learner code. Every top-level declaration is in scope. Fails when it throws or returns `false`. `assert.ok`, `assert.equal` (Object.is), `assert.notEqual`, `assert.deepEqual`, `assert.throws(fn, expected?)`, `await assert.rejects(promiseOrFn, expected?)`. 2 s timeout.
- `pattern` / `forbid`: regex that must / must not match the learner code reprinted without comments by the TypeScript printer (4-space indentation, semicolons). Optional last line `flags: <flags>`.
- Environment: `strict`, target ES2022, `lib esnext` (no DOM), every file is a module, no imports. Globals: `console`, timers, `queueMicrotask`, `structuredClone`. Standard (TC39) decorators only.
- Starter code must contain `// TODO` markers.

## Verification

```bash
npx vitest run src/verify/<track>.test.ts                      # whole track
LESSON=use-effect npx vitest run src/verify/react.test.ts      # lessons whose id contains "use-effect"
LESSON=use-effect npx vitest run src/verify/content.test.ts    # structure checks
npx vitest run src/verify/curriculum.test.ts                    # CURRICULUM.md matches the written lessons
npm run verify                                                  # everything
```

The suites check structure (theory length, hints, approach, quiz indexes, track monogram), that the solution passes every test, that the starter fails at least one, that every written lesson is marked `✓` in [CURRICULUM.md](CURRICULUM.md), and that every track accent meets the contrast and hue rules.
