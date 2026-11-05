# Content Guide

Each track is a folder in `src/content/<track>/`; the current tracks and their plans are listed in [CURRICULUM.md](CURRICULUM.md). A track declares its engine in `track.json` (`"engine": "react"`), so several tracks can share one engine (`react-state` and `architecture` run on the React engine). Every lesson is a folder:

```
src/content/<track>/<NN-module>/<NN-lesson-id>/
```

Number prefixes define order and are stripped from ids. A module folder must have one: its prefix is also the module number the app shows (`Module.number`; `07-…` is shown as module 07, `00-…` as module 00), so lesson text that cites "module 07" names the folder `07-…`. Lesson ids must be **unique inside a track**. Use kebab-case.

All content is written in **English**.

## Files

| File | Required | Purpose |
| --- | --- | --- |
| `meta.json` | yes | `{ "title", "summary", "level", "tags"?, "preview"?, "entry"?, "resources"? }`; `run` names the file the **Run** button executes instead of the entry (a demo that scripts the fake model); in multi-language tracks `entry` and `run` may be `{ "<language>": "<file>" }` |
| `theory.md` | yes | The lesson. GitHub flavored Markdown with fenced code (`ts`, `tsx`, `jsx`, `vue`, `html`, `bash`, `css`, `json`, `sql`, `csharp`/`cs`); other fences render without highlighting |
| `concepts.json` | recommended | Glossary cards `[{ "term", "description" }]` (Markdown allowed) |
| `challenge.md` | for practice | The task: exact names, signatures, texts and behaviors the tests check |
| `starter.<ext>` or `starter/` | with challenge | Code the editor starts with |
| `solution.<ext>` or `solution/` | with challenge | Reference solution (same file names as starter) |
| `tests.<ext>` | with challenge | Validation (format per track below) |
| `hints.md` | with challenge | 2–4 progressive hints separated by a line containing only `---`, from gentle nudge to almost-the-answer |
| `approach.md` | with challenge | "Solution path": numbered reasoning steps, without pasting the full solution |
| `variants/<language>/` | multi-language tracks | One challenge per language: `starter`, `solution`, `tests` and optional `challenge.md`/`hints.md`/`approach.md` overrides (see below) |
| `quiz.json` | optional | `[{ "question", "options": [...], "answer": <index>, "explanation" }]` (Markdown allowed) |
| `module.json` | per module | `{ "title", "description", "optional"? }`; `"optional": true` marks a module learners may skip (a module zero for people who have never programmed): it counts toward track progress as a whole once the learner has started it, which means completing a lesson between its first and its last (or all of them); its first lesson (the one that states the skip rule: the Python map, or C# 00/01 `first-program`), its last (the skip test) and visits do not start it, so completing the first lesson alone does not start the module and a learner who skips the module still reaches 100%. Only a module numbered `00` may be optional, and it needs at least 3 lessons with a challenge in the last one. Module folder numbers are unique in a track, and a shown track numbers its required modules 1 to N without gaps (`src/verify/content.test.ts`) |
| `track.json` | per track | `{ "engine", "order", "title", "monogram", "shortTitle"?, "description", "version" }`, or `"languages": [...]` instead of `"engine"` for a multi-language track; the accent color lives in `src/shared/design/tokens.css` (rules in [ARCHITECTURE.md](ARCHITECTURE.md#track-presentation)) |

- `level`: `beginner`, `intermediate`, `advanced` or `expert`.
- `tags`: free list. Conventions: `core`, `legacy`, `modern`, `new` (latest-version feature), `ecosystem`, `theory`, `typescript`, `performance`, `testing`.
- `preview`: `false` hides the live preview for non-visual work (composables, services, utilities). The TypeScript and Node.js tracks never show a preview; they have a **Run** button that prints the console output instead.
- `entry`: required for multi-file challenges (`starter/` + `solution/` folders). Files may sit in subfolders (`features/cart/index.js`); imports resolve relative to the importing file (`./model`, `../../shared/ui/Button`), try the extensions `.ts`, `.tsx`, `.js`, `.jsx`, `.vue` and then a folder `index` file, and a leading `/` resolves from the project root. Tests reach nested files with `modules['features/cart/index.js']` and `sources['features/cart/index.js']`. Single-file defaults: TypeScript `main.ts`; React `App.jsx`/`App.tsx`; Vue `App.vue` (or `main.ts` when the starter is `.ts`); Angular `app.ts`; Node.js `main.ts`.
- A lesson needs a challenge, a quiz, or both. Theory-only topics (tooling, frameworks, architecture, history) use a 4–6 question quiz.
- **Multi-language tracks** (`"languages"` in `track.json`, ids from `src/content/languages.ts`): the learner picks the challenge language in the editor toolbar. Theory, concepts and quiz are shared; `challenge.md`, `hints.md` and `approach.md` at the lesson root are shared defaults, and a variant overrides them only when names or steps differ per language (`summarizeTrace` vs `summarize_trace`). Each language's code lives in `variants/<language>/` (`starter`, `solution`, `tests` in that engine's format); files outside `variants/` are ignored for the challenge. A lesson offers only the languages it ships, and every shipped variant must pass verification. Write the challenge contract so it reads naturally in every language the lesson ships. Mechanism and progress rules: [ARCHITECTURE.md](ARCHITECTURE.md#multi-language-challenges).
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
Node.js engine (track `node`): in-browser Node 24 runtime (see below) · hono 4.13 (`hono/http-exception`, `hono/validator`, `hono/cors`, `hono/logger`, `hono/request-id`, `hono/secure-headers`, `hono/bearer-auth`, `hono/basic-auth`, `hono/jwt`, `hono/factory`, `hono/streaming`, `hono/client`, `hono/timing`, `hono/body-limit`, `hono/etag`, `hono/cookie`, `hono/testing`, `hono/timeout`) · @hono/zod-validator 0.9 · zod 4 · `@dojo/ai` and `@dojo/ai/testing` (the built-in fake model, see below)

## Fake REST API (React, Vue, Angular, Node.js)

Available in previews and tests through `fetch` (and Angular `HttpClient`): `GET /api/users`, `/api/users/:id`, `/api/posts`, `/api/posts/:id`, `/api/posts?userId=`, `/api/products?q=`, `/api/products/:id`, `/api/search?q=`, `GET|POST /api/todos`, `GET|PATCH|PUT|DELETE /api/todos/:id`, `GET|POST /api/orders` (POST answers 201 with the body plus `id` and `status: 'confirmed'`), `GET /api/orders/:id`, `/api/error` (500). Also reachable as `https://api.example.com/...`.

Data: users 1 Ada Lovelace, 2 Alan Turing, 3 Grace Hopper, 4 Linus Torvalds, 5 Margaret Hamilton (`id, name, email, role`); todos 1 "Learn JSX" (completed), 2 "Master hooks", 3 "Ship a React app" (`id, title, completed`); products Keyboard 120, Mouse 45, IDE License 199, Monitor 340, Cloud Credits 50 (`id, name, price, category`); posts `id, userId, title, body` (4 posts). Orders start empty. Data resets before each test.

## Framework tests (React, Vue, Angular)

Test file: React engine tracks (`react`, `react-state`, `architecture`) `tests.jsx`, Vue `tests.ts`, Angular `tests.ts`, Node.js `tests.ts`. Plain script, **no imports**, TypeScript syntax allowed (Angular tests may declare host components with decorators). React tests may use JSX.

Each `test(name, fn)` runs against a **fresh evaluation** of the learner project and a clean DOM. Test names are listed to the learner before running. Each test times out after 4 s. Keep `test()` calls at the top level.

Globals available in every framework track:

- `mod` — exports of the entry file; `modules['store.ts']` — exports of any project file (files the entry does not import are evaluated only when a test reads them through `modules`, so a Run demo never executes during tests)
- `require(name)` — any module available to learner code (e.g. `require('pinia')`, `require('@angular/common/http/testing')`)
- `source` — entry file with comments stripped (for API-usage checks); `sources['file.ts']` for other files; `rawSource` keeps comments
- `expect` — Jest-like: `toBe`, `toEqual`, `toStrictEqual`, `toMatchObject`, `toBeTruthy`, `toBeFalsy`, `toBeNull`, `toBeUndefined`, `toBeDefined`, `toBeTypeOf`, `toBeInstanceOf`, `toContain`, `toContainEqual`, `toMatch`, `toHaveLength`, `toHaveProperty`, `toBeGreaterThan(OrEqual)`, `toBeLessThan(OrEqual)`, `toBeCloseTo(number, digits = 2)`, `toThrow` (message substring, RegExp or error class), `toHaveBeenCalled`, `toHaveBeenCalledTimes`, `toHaveBeenCalledWith`, `toHaveBeenLastCalledWith`, `toBeInTheDocument`, `toHaveTextContent`, `toHaveAttribute`, `toHaveValue`, `toBeChecked`, `toBeDisabled`, `toBeEnabled`, `toHaveClass`, `toHaveStyle`, `toHaveFocus`, with `.not`, `.resolves`, `.rejects`, plus asymmetric matchers `expect.anything()`, `expect.any(Ctor)`, `expect.objectContaining()`, `expect.arrayContaining()`, `expect.stringContaining()`, `expect.stringMatching()`
- `captureError(promiseOrFunction)` — awaits an action that must fail and returns what it threw or rejected with (`const error = await captureError(mod.load())`), failing the test when nothing was thrown
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
| `crypto` | `createHash` and `createHmac` (`sha256`, `sha1`; digests `hex`, `base64`, `base64url` or a Buffer), `hash()`, `pbkdf2`/`pbkdf2Sync` (pure JS: keep iterations ≤ 1000 in lessons and say production uses 600 000+ or scrypt/argon2), `randomBytes`, `randomUUID`, `randomInt` (uniform by rejection sampling, `[min, max)`, range below 2^48, safe integers only, like Node), `timingSafeEqual`, `webcrypto`/`subtle`. No `scrypt`, ciphers, sign/verify |
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

## Fake model (`@dojo/ai`, Node.js engine)

Dev Dojo never calls a real model: no keys, no cost, no flaky grading. Lessons about models, agents, RAG or evals use a fake provider that runs in the browser. It does **not** imitate any real model. It reproduces the classes of behavior every model generation shows (text, JSON, tool calls, malformed output, refusals, truncation, latency, rate limits and server errors, varying wording), so challenges grade how the learner's code handles models in general and keep passing when the market moves.

Learner code imports the provider-agnostic client:

```ts
import { createModel, embed, cosineSimilarity, countTokens, ModelError } from '@dojo/ai';

const model = createModel(); // name 'dojo-fake-1', contextWindow 32000
const response = await model.generate({
  messages: [{ role: 'system', content: '...' }, { role: 'user', content: '...' }],
  tools: [{ name: 'search', description: '...', parameters: { type: 'object', properties: { query: { type: 'string' } } } }],
  responseFormat: { type: 'json' }, // optional
  maxTokens: 200, // optional: longer replies are cut with finishReason 'length'
  signal, // optional AbortSignal
});
// response: { id, model, text, toolCalls: [{ id, name, arguments /* raw JSON string */ }], finishReason: 'stop' | 'length' | 'tool_calls' | 'refusal' | 'content_filter', usage: { inputTokens, outputTokens, totalTokens, cost } }
for await (const chunk of model.stream(request)) {} // { type: 'text', delta } | { type: 'tool-call', toolCall } | { type: 'finish', finishReason, usage }
```

- Messages have `role` (`system`, `user`, `assistant`, `tool`), `content`, and `toolCalls` (assistant) or `toolCallId` (tool results).
- Errors are `ModelError` with `status`, `code` (`rate_limit` 429, `server_error` 500, `overloaded` 503, `timeout` 504, `context_length` 400 when the input exceeds the context window) and `retryAfterMs` when given.
- `countTokens(textOrMessages)` approximates one token per four characters plus 4 per message; cost uses `$1` per million input tokens and `$4` per million output tokens unless a test configures other prices.
- `embed(text | texts, { dimensions = 64 })` is a deterministic bag-of-words embedding (lowercase words, stopwords removed, light stemming, hashed into a unit vector): texts that share words are more similar. `cosineSimilarity(a, b)` compares two vectors. Lessons may ask learners to write their own similarity instead.
- Types (`Message`, `ToolCall`, `ToolDefinition`, `GenerateRequest`, `GenerateResponse`, `StreamChunk`, `Usage`, `FinishReason`, `ModelErrorCode`) are exported for `import type { ... } from '@dojo/ai'`; type-only imports are erased at runtime, so lessons never redeclare them. The editor knows both modules (`engines/shared/fakeModelDeclaration.ts`, kept in sync with the runtime by `fakeModel.test.ts`), so learners get autocomplete. When the provider gains a behavior or field, update the declaration in the same change.
- With nothing scripted, the model answers `(dojo-fake-1) No scripted reply for this request. Last user message: "..."` (or `{}` when `responseFormat` is JSON).

Tests script the model through the `fakeModel`, `respond` and `forEachSeed` globals (also importable from `@dojo/ai/testing`, so a lesson's demo `main.ts` can script a scenario for the **Run** button). The model resets before every test.

```ts
test('retries after a rate limit and returns the answer', async () => {
  fakeModel.reply(respond.error(429, { retryAfterMs: 10 }), respond.text('Paris'));
  expect(await mod.answerWithRetry('Capital of France?')).toBe('Paris');
  expect(fakeModel.requests).toHaveLength(2);
});

test('handles every malformed JSON shape', async () => {
  await forEachSeed(20, async () => {
    fakeModel.reply(respond.malformedJson({ total: 3 }), respond.json({ total: 3 }));
    expect(await mod.extractTotal('...')).toBe(3);
  });
});
```

| `fakeModel.` | Effect |
| --- | --- |
| `reply(...behaviors)` | queue replies, consumed in order |
| `forModel(name).reply(...behaviors)` | queue replies for one model name (routing and fallback tests); checked before the shared queue |
| `handle((request, context) => behavior)` | dynamic replies when the queue is empty (agent loops: answer by the last message or tool result) |
| `seed(n)` | seed the generator used by varying behaviors |
| `configure({ model, contextWindow, latencyMs, pricing: { inputPerMillion, outputPerMillion }, tokenizerDrift })` | change limits, default latency, prices, and how far the provider's reported token counts drift above `countTokens` (`0.15` = 15% more, like a real tokenizer differing from an estimate) |
| `replay({ model, recordedAt, replies })` | queue replies recorded from a real model (cassette); assert structure and handling, never exact wording |
| `requests` | every request received, for asserting prompts, tools and message history |
| `responses` | every successful response returned, in order |
| `reset()` | clears queues, handler, logs, seed and configuration (to run several scenarios in one test) |
| `pending` | replies still queued |

| `respond.` | Behavior |
| --- | --- |
| `text(text \| variants[])` | a text reply (a variant picked by seed) |
| `json(value)` | valid JSON text |
| `malformedJson(value)` | broken JSON, shape picked by seed: truncated, trailing comma, wrapped in prose and a fence, single quotes |
| `toolCall(name, args)`, `toolCalls([...])` | tool calls with generated ids |
| `invalidToolArguments(name)`, `unknownTool(name?)` | arguments that are not JSON, a tool that was never offered |
| `refusal(text?)`, `contentFilter(text?)`, `truncated(text, keepRatio?)` | `finishReason` `refusal` / `content_filter` / `length` |
| `error(400 \| 401 \| 429 \| 500 \| 503 \| 504 \| 529, { retryAfterMs?, message? })` | throws `ModelError` with codes `invalid_request`, `authentication`, `rate_limit`, `server_error`, `overloaded`, `timeout`, `overloaded` |
| `contextLength()` | throws the 400 `context_length` error a provider returns for an oversized input |
| `failMidStream(text, { afterChunks = 3, status = 500 })` | `stream` yields some deltas then throws; `generate` throws |
| `slow(ms, behavior)` | delays a reply (abortable with the request `signal`) |
| `oneOf([...])`, `sometimes(probability, behavior, otherwise)` | seeded choice between behaviors |

`forEachSeed(count, run)` resets the model, seeds it and runs the body once per seed (1..count), naming the failing seed; script the model inside the body. Use it to prove the learner's code survives every variation, not one lucky script. Keep model-specific facts (names, prices, limits of real models) in theory "Status as of" boxes and quizzes, never in assertions.

## Python engine (`python`, multi-language tracks)

Python challenges run on [Pyodide](https://pyodide.org) (CPython 3.14 compiled to WebAssembly, pinned in `package.json`). In the app, Pyodide runs in a Web Worker (`engines/python/python.worker.ts`), started when a Python challenge opens; the first start downloads about 12 MB, served from the app's own origin by `plugins/pyodidePlugin.ts`. `npm run verify` runs the same engine in Node. Python is offered in two ways: as a language of multi-language tracks (`"languages": ["node", "python"]`, files under `variants/python/`) and as the engine of the single-language **Python track** (`"engine": "python"`, files at the lesson root: `starter/`, `solution/`, `tests.py`; every challenge sets `"entry": "main.py"` in `meta.json` because the loader cannot infer it from a folder, and `"run": "demo.py"` for the Run button). The plan, the standards and the lesson specs of the Python track live in [python-track/](python-track/README.md). Its lessons assume no prior programming language: `src/verify/pythonConventions.test.ts` enforces the theory template (`## Common mistakes` in practice lessons, no `## Coming from` section), one `# beginner mistake:` test per practice lesson and no comparison with another language in any lesson file ([02-content-standards.md](python-track/02-content-standards.md)); every lesson and the track and module texts follow these rules, so both lists in `src/verify/pythonPendingRewrite.ts` are empty and a stale entry fails the suite. The track opens with the optional module `00-foundations` (Python from zero: a map and 8 practice lessons, the last one the skip test; [14-module-00-foundations.md](python-track/14-module-00-foundations.md)).

### Files

```
<lesson>/variants/python/
├── starter/main.py, starter/demo.py      starter code (TODO comments allowed, like the Node.js starters)
├── solution/main.py, solution/demo.py
├── tests.py
└── challenge.md, hints.md, approach.md   override the lesson-level text when names differ (they usually do)
```

`meta.json` names the Python entry and demo next to the Node.js ones: `"entry": { "node": "main.ts", "python": "main.py" }`, `"run": { "node": "demo.ts", "python": "demo.py" }`. Learner modules import each other by module name (`from orders import load_orders` for `orders.py`).

### Naming

Functions, parameters and attributes use Python names (`complete_stream`, `on_delta`, `retry_after_ms`); data that mirrors `@dojo/ai` or a JSON contract keeps its camelCase keys (`response["finishReason"]`, `usage["inputTokens"]`, `request["maxTokens"]`). Requests, responses and results are plain dicts. Write a Python `challenge.md` (and `hints.md`/`approach.md` when they name functions) in `variants/python/` instead of mixing both languages in the shared text.

### Fake model in Python (`dojo_ai`)

`dojo_ai` is a thin wrapper over the same fake provider as `@dojo/ai` (`engines/python/runtime/dojo_ai/`), so both languages see identical behaviors, token counts and costs.

| Node.js | Python |
| --- | --- |
| `createModel({ model })` | `create_model(model=None)`; `model.name`, `model.context_window` |
| `await model.generate(request)` | `await model.generate(request)` → dict |
| `for await (const chunk of model.stream(request))` | `async for chunk in model.stream(request)` → dicts |
| `ModelError` (`status`, `code`, `retryAfterMs`) | `ModelError` (`status`, `code`, `retry_after_ms`) |
| `countTokens`, `embed(text, { dimensions })`, `cosineSimilarity` | `count_tokens`, `embed(text, dimensions=64)`, `cosine_similarity` |
| `fakeModel.reply / forModel(name).reply / handle / seed / replay / reset` | `fake_model.reply / for_model(name).reply / handle / seed / replay / reset` |
| `fakeModel.configure({ latencyMs, contextWindow, pricing, tokenizerDrift })` | `fake_model.configure(latency_ms=…, context_window=…, pricing={"inputPerMillion": …}, tokenizer_drift=…)` |
| `fakeModel.requests / responses / pending` | `fake_model.requests / responses / pending` (requests drop unset keys) |
| `respond.malformedJson`, `toolCall(name, args)`, `failMidStream(text, { afterChunks, status })`, `error(429, { retryAfterMs })` … | `respond.malformed_json`, `tool_call(name, arguments)`, `fail_mid_stream(text, after_chunks=…, status=…)`, `error(429, retry_after_ms=…)` … (every builder, snake_case) |
| `forEachSeed(count, async (seed) => …)` | `await for_each_seed(count, scenario)` (`scenario()` or `scenario(seed)`, sync or async) |

`respond.json`, `malformed_json`, `tool_call` and `tool_calls` keep nested `None` as JSON `null`; in requests, a key set to `None` counts as unset and is dropped. `fake_model.handle(lambda request, context: …)` receives the request as a dict and a context with `call_index`, `random()` and `pick(items)`; return a `respond` builder, a reply dict (`{"text": …}`) or `None`.

### Tests (`tests.py`)

Each test is a function decorated with `@test("name")`, sync or `async`, with plain `assert` statements. The name is what the learner sees; the function name does not matter (`_` is fine):

```python
from dojo_ai import ModelError, create_model


@test("retries after a rate limit and returns the answer")
async def _():
    fake_model.reply(respond.error(429, retry_after_ms=10), respond.text("Paris"))
    assert await mod.answer_with_retry(create_model(), "Capital of France?") == "Paris"
    assert len(fake_model.requests) == 2
```

A failing `assert` reports its source line and, for a comparison of simple expressions, both values (`left:` / `right:`); an error raised in learner code reports the learner file and line; `for_each_seed` adds the failing seed. Keep asserts free of calls with side effects so values can be shown.

Globals in `tests.py`: `test`, `mod` (the entry module, imported fresh for every test), `modules` (`modules["orders.py"]`, imported on first access), `source`, `sources`, `fake_model`, `respond`, `for_each_seed`, `capture_error` (`error = await capture_error(coroutine_or_function)` returns the raised exception, fails when nothing is raised), `capture_output()` (a list that collects printed lines until the test ends) and `approx(expected, rel=1e-6, abs=1e-12)` (`assert cost == approx(0.000132, abs=1e-9)`). An `await` that never finishes fails its test after 4 s; the fake model resets before every test.

Isolation between tests (`dojo_harness.InterpreterState`, captured before any learner code runs and restored after every test and every Run): `sys.modules`, `builtins`, `sys.path`/`meta_path`/`path_hooks`/`path_importer_cache`, `sys.stdout`/`stderr`/`stdin` and the other `sys` hooks, `settrace`/`setprofile` and `sys.monitoring` tools, the recursion limit and `int` digit limit, `os.environ`, the working directory, `random` state, the `decimal` context, logging (new loggers removed, handlers/levels of existing ones put back), the namespaces of the harness, `dojo_ai`, `asyncio`, `os`, `time`, `json`, `logging`, `copyreg` and the preloaded stdlib modules, the class attributes of `json.JSONEncoder`/`JSONDecoder`, the logging classes, `dataclasses.Field` and `decimal.Context`, the `copy`/`copyreg` dispatch tables, `gc.enable()`, new files in `/tmp` and `~`, and tasks a test left running (cancelled). Tests still must not rely on state from an earlier test. Every Pyodide instance starts with `PYTHONHASHSEED=0` (`PYTHON_ENV` in `engines/python/engine.ts`), so set order is the same in the app and in verification; still compare sets as sets and sort before printing.

A coroutine that is created and never awaited fails the test that created it (`RuntimeWarning: coroutine 'fetch' was never awaited`), whether a sync test wrote `assert mod.fetch()` or learner code forgot an `await`. A test that calls async code is `async def` and awaits it; a test that inspects a coroutine on purpose calls `coroutine.close()` when done.

### Demos

A demo is a normal script: `async def main()` plus `if __name__ == "__main__": asyncio.run(main())`. The engine runs it as `__main__`, waits for what `asyncio.run` scheduled, prints `Process exited with code 0` (or 1 with a traceback of learner frames) and verification checks it like the Node.js demos.

### Limits

Standard library only, except the vendored packages below: no `pip` packages (no NumPy or LangChain: mention the libraries in theory), no network, threads, subprocesses or real files outside the project. A synchronous infinite loop or a blocking call (`time.sleep`) cannot be interrupted inside Pyodide, so the worker is terminated instead. In the app (`engines/python/browserClient.ts`) every grading run and every Run uses a **fresh worker**, booted in about 0.2 s from a Pyodide memory snapshot made once per page (a cold boot takes about 1.2 s); one worker is kept warm. Each test has the same 6 s wall-clock limit as verification: the worker is terminated, only that test fails (`did not finish within 6000ms and was stopped`) and the remaining tests run in another fresh worker. A Run has 15 s. A JavaScript-side failure is reported at once.

**Vendored packages (Pydantic).** `pydantic` 2.12.5 with `pydantic_core` 2.41.5, `annotated_types` 0.7.0, `typing_extensions` 4.15.0 and `typing_inspection` 0.4.2 are the only third-party packages, for module 13 (validation). `npm install` runs `npm run python:vendor` as `postinstall`: it downloads the wheels from the official Pyodide CDN at the pinned version, verifies each against the sha256 in `node_modules/pyodide/pyodide-lock.json` and stores them, their license files and Pyodide's MPL-2.0 license in `vendor/pyodide-packages/`. That directory is git-ignored like `node_modules`; only `manifest.json` (what was vendored, plus the pinned license hashes) is committed. When every file is present and matches, the script uses no network; `--check` verifies without downloading. A build without the wheels fails (`Missing Pyodide package …`). `plugins/pyodidePlugin.ts` serves and copies them next to the runtime (`pyodide/<wheel>`, `pyodide/licenses/`), and writes a short hash of every file it serves into `index.html` (`<meta name="dojo-pyodide">`): no hashed asset names these files, so the deploy smoke test needs the marker to tell a new Pyodide or wheel version from the previous deploy. A lesson gets them only when its files or `tests.py` import them (`engines/python/packages.ts`, `requiredPackages`): that run boots its own interpreter and calls `loadPackage` **by name** with `checkIntegrity` before the lock-down, so the wheels come from the app's origin under the worker CSP (`connect-src 'self'`) and other lessons never load them. Verification does the same in the sandbox child (`packageBaseUrl` = the vendor directory, read-only grant). Nothing is fetched from a CDN at runtime. Integrity: in the browser `loadPackage` checks each wheel against the lock (`checkIntegrity`); in Node Pyodide does not, so `PythonSandbox` re-hashes every vendored wheel against `pyodide-lock.json` before the first fork and before every fork that loads packages, and refuses to start on a mismatch (`Vendored Pyodide packages failed the integrity check`); `npm run verify` also starts with `npm run python:vendor -- --check`. A package that does not load (failed check, missing wheel) fails the boot with `Could not load the vendored package …` instead of surfacing as `ModuleNotFoundError`. Licenses shipped at `pyodide/licenses/`: each wheel's license, Pyodide (MPL-2.0) and CPython (PSF, for `python_stdlib.zip`); their sha256 are pinned in `manifest.json` and checked by `--check`. Adding a package means adding it to `LESSON_PACKAGES`, running `npm run python:vendor` and passing `src/verify/pythonPackages.test.ts`.

Learner code has no network and cannot generate JavaScript, in the app and in verification (`engines/python/lockdown.ts`, built on `engines/shared/workerLockdown.ts` like the C# lock-down, applied after Pyodide has loaded from the app's origin and before any lesson code): `import js` exposes only an allow-list of plain ECMAScript globals and timers; `fetch`, `XMLHttpRequest`, `WebSocket`, `WebSocketStream`, `WebTransport`, `EventSource`, `importScripts`, `Worker`, `SharedWorker`, `FontFace`, `fonts`, `caches`, `BroadcastChannel` and `indexedDB` are removed from the worker scope and its prototype chain; `Function`, `eval` and every function constructor (`fn.constructor`, async and generator ones) are replaced by throwing stand-ins, Pyodide's own reference to the original `Function` (`pyodide._api.tests`) is deleted, and `setTimeout`/`setInterval` refuse strings; the storage file systems (`IDBFS`, `NODEFS`, `NODERAWFS`, `NATIVEFS_ASYNC`) and `mountNativeFS`/`mountNodeFS` are removed; `pyodide.loadPackage` and `loadPackagesFromImports` refuse (micropip is not served). `pyodide.http.pyfetch` and `open_url` therefore fail. `src/verify/pythonEscapeScan.py` walks every object reachable from `js` and `pyodide_js` and must find no original code generator (`pythonSandbox.test.ts`).

**Worker CSP.** The durable control is a Content-Security-Policy on the **worker script response** (a dedicated worker uses the policy delivered with its own script; the page's policy does not apply): `default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'`. Without `'unsafe-eval'` the browser refuses every string compilation, so even a missed reference to the original `Function` cannot reach `import("https://…")` or a `blob:` module. Pyodide boots under it (verified in Chromium; its boot needs only `'wasm-unsafe-eval'`). `plugins/pythonWorkerCspPlugin.ts` sends it from the Vite dev and preview servers for the worker URL (`/src/engines/python/python.worker.ts?worker_file…` in dev, `/assets/python.worker-<hash>.js` in a build). **A production host must send the same header for `assets/python.worker-*.js`**, and must not add `'unsafe-eval'`; the Pyodide files under `pyodide/` and the snapshot worker are served from the same origin, which `'self'` covers.

**What the production host must serve** (checked by `npm run smoke:worker-csp`, which builds the app, serves it with `vite preview` and fails on any difference):

| Path | Requirement |
| --- | --- |
| `assets/python.worker-<hash>.js` | `Content-Security-Policy: default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'`, exactly, on this response only |
| `index.html` and every other asset | no worker CSP (a `script-src` without `'unsafe-eval'` breaks nothing in the worker but would apply to the page and Monaco) |
| Path routes (`/python`, `/python/<lesson>`, `/<track>/<lesson>`, …) | SPA fallback: serve `index.html` with status 200 for any path that is not a file (for example `/* /index.html 200` on Netlify, `try_files $uri /index.html` on nginx) |
| `pyodide/` (runtime, `pyodide-lock.json`, the vendored wheels, `licenses/`) | served as files from the same origin, never rewritten to `index.html`; `.wasm` as `application/wasm` |
| `sandbox.html` | served as a file (the JavaScript engines' iframe) |

### Verification sandbox

`npm run verify` grades Python in `verify/pythonSandbox.ts`. Each interpreter is a child process (`child_process.fork` of `verify/pythonSandbox.child.ts`, bundled once with Vite into `node_modules/.cache/dojo-python-sandbox/` and importing Pyodide by absolute path) under the Node permission model: `--permission` with read access to `node_modules/pyodide` and the child script only, so no file writes, no child processes, no workers and no network, and an empty environment (`PYTHONHASHSEED=0` reaches Python through Pyodide's `env`, not the host's). Inside the child, as defence in depth, Python's `import js` sees only plain ECMAScript globals and timers (`jsglobals`); after Pyodide loads, every further module import is blocked (`module.registerHooks`), the global `process` is replaced by a frozen allow-list (`argv` empty, `env` empty, `version`, `versions`, `platform`, `arch`, `release.name`; the IPC code keeps a private reference), so `_debugProcess`, `_kill`, `kill`, `abort`, `reallyExit`, `dlopen`, `binding`, `report`, `loadEnvFile` and the rest are unreachable, children start with `--disable-sigusr1`, `--max-old-space-size=256` and `--wasm-max-mem-pages=16384` (a 1 GB Python heap: a larger allocation raises `MemoryError` or kills only that interpreter, and the next test runs in a fresh one), NODEFS/NODERAWFS and `mountNodeFS` are deleted, and the same network and code-generation lockdown as the app applies. **Every test run and every Run demo gets a fresh interpreter** (the solution, the demo and the starter of one lesson each get their own), so in-place stdlib mutations (`json.JSONEncoder.default = …`, `Mapping.register(list)`) cannot reach another run; within a run `InterpreterState` isolates tests. Interpreters boot in about 0.1 s from a Pyodide memory snapshot made once per run by a child that executes no lesson code, and a few are kept warm (`DOJO_PYTHON_PREWARM`, default 1–3 by CPU count). Each test has a hard 6 s wall-clock limit (`pythonGrader({ testTimeoutMs })`): a test that exceeds it, sync or async, fails with `did not finish within 6000ms and was stopped`, the process is killed and a fresh one runs the remaining tests. A Run demo has 15 s. Native extension modules (`__spec__.origin` ending in `.so`, or built-in) are never purged from `sys.modules`, so PyO3 extensions such as `pydantic_core` survive between tests. `src/verify/pythonSandbox.test.ts` covers the limits, the permission model, the removed capabilities, the state restore and the per-lesson isolation. Run CI without secrets in the environment anyway.

## C# engine (`csharp`)

The C# track (`src/content/csharp`) runs on it (`"engine": "csharp"`); lessons with a graded C# challenge (marked **(challenge)** in CURRICULUM.md) download the engine, the others are theory + quiz and download nothing, and `src/engines/csharp/fixtures/basic/` is the reference challenge. A track gets C# challenges by declaring `"engine": "csharp"` in `track.json` (C# is not a `variants/` language) and grading them with `defineChallengeSuite('<track>', csharpGrader())`; the steps, status and open items are in [csharp-engine.md](csharp-engine.md). Engine internals are in ARCHITECTURE.md "The C# engine".

- **Files.** A single-file challenge is `starter.cs`/`solution.cs`, renamed to `Program.cs`; multi-file challenges use `starter/` and `solution/` with `entry` in `meta.json`. Every `.cs` file of the project is compiled, together with `tests.cs`, into one assembly (C# `latest`, nullable enabled, `unsafe` refused). Global usings: `System`, `System.Collections.Generic`, `System.Linq`, `System.Threading.Tasks`; anything else needs a `using` (for example `System.IO`, `System.Text.Json`).
- **Tests (`tests.cs`).** `using Dojo;`, then static or instance methods with no parameters marked `[Test("name")]` (the name a string literal, not `nameof` or a constant: the editor lists names without compiling, and a report whose names differ is discarded), returning `void` or `Task`; only methods declared in `tests.cs` run, in source order. `Assert.Equal` (with a tolerance overload for `double`), `NotEqual`, `SequenceEqual`, `True`, `False`, `Null`, `NotNull`, `Contains` (string and collection), `Throws<TException>`, `ThrowsAsync<TException>` (`await Assert.ThrowsAsync<OperationCanceledException>(() => worker.RunAsync(token))`; it also catches an exception thrown before the first `await`; always `await` it in an `async Task` test, because a `void` test that drops the returned task passes even when nothing is thrown, and `csharp.test.ts` rejects an `Assert.ThrowsAsync` without `await`) and `Fail`; `Throws` and `ThrowsAsync` accept the type or a type derived from it (a `TaskCanceledException` satisfies `ThrowsAsync<OperationCanceledException>`) and return the exception; any other exception fails the test with its type and message. A compile error fails the whole run, so **starters must compile**; the report shows `file(line,column): error CSxxxx: message`.
- **Demos.** The **Run** button compiles the project as a console program and calls its entry point (`Main` or top-level statements, async included); console output streams to the panel and the exit code is printed. A `Program.cs` with top-level statements may sit next to the graded files: the tests ignore its entry point.
- **Limits.** Reference assemblies: `System.Runtime`, `Console`, `Collections`, `Collections.Concurrent`, `Collections.Immutable`, `Linq`, `Memory`, `ObjectModel`, `Runtime.Numerics`, `Text.Json`, `Text.RegularExpressions`, `Threading`, `Threading.Tasks`; no `System.Net.Http`, no `System.Runtime.InteropServices.JavaScript`, no threads (single-threaded runtime: `Task.Run` runs on the same thread, blocking on an unfinished task throws `PlatformNotSupportedException`, use `await`). Each test has 6 s; a busy loop stops only that test. No network and no JavaScript code generation (lock-down, worker CSP). Files written under `/tmp` exist for the current run only. Console output stops after 1,000,000 characters per run. Globalization is invariant (no ICU), so culture-sensitive string comparison behaves as ordinal and culture-dependent formatting uses the invariant culture: a challenge cannot grade a culture-dependent result, so state such a rule as advice (`StringComparer.Ordinal`) and test only the order or text it produces. `///` documentation comments are allowed (not processed). A string literal naming `System.Reflection.Emit` or `System.Runtime.InteropServices.JavaScript` is a compile error (DOJO001).
- **Host requirements.** A browser with WebAssembly and module workers, and a host that serves `dotnet/<version>/` from the app's origin (`.wasm` as `application/wasm`, compressed `.js`/`.wasm`, immutable caching) and sends the worker CSP on `assets/csharp.worker-*.js` (`netlify.toml`, CONTRIBUTING.md "Netlify"). The engine downloads only for a lesson with a C# challenge (theory and quiz lessons download nothing), once the page is idle and never with Save-Data or on a 2G/3G connection (then the first run downloads it): 54 files, no `.dll` (assemblies are Webcil `.wasm`), 25.41 MiB raw, 8.22 MiB with Brotli (8.5 MiB budget). On a 50 Mbit/s link it takes about 1.6 s to download and start plus about 1.2–2.5 s to warm Roslyn, which the prefetch does while the learner reads; a further grade or Run takes about 0.3–0.5 s, since each uses a fresh worker pre-warmed from the HTTP cache. Checked in Chromium and Firefox; Safari is not checked yet.
- **Verification.** `npx vitest run src/verify/csharp.test.ts` grades every C# challenge in a Node child (`csharpGrader()`, same engine, limits and lock-down as the browser; ARCHITECTURE.md "The C# engine"); `LESSON=<id>` narrows it as for the other tracks. It also runs the fixture challenge in `csharpSandbox.test.ts`.

## AI Engineering track (`ai-engineering`)

Conventions settled by the pilot module (`01-models`). The plan and module rules are in [CURRICULUM.md](CURRICULUM.md); the content source is `.claude/specs/AI Engineering Track.md`.

- **Layout:** multi-language: `variants/node/` and `variants/python/` (see "Python engine"). The shared `challenge.md` describes the Node.js contract; each Python variant overrides it with Python names and dict keys. Every challenge ships both variants; a new challenge adds its Python variant in the same change (a lesson without one only offers Node.js).
- **Fake model only:** learner code imports `@dojo/ai`; tests use `fakeModel`, `respond`, `forEachSeed`. Assert handling and properties, never exact wording; use `forEachSeed` wherever a behavior varies.
- **Run demo:** verification runs every declared `run` file with the solution and fails on console errors, empty output or a non-zero exit. Each challenge ships a `demo.ts` in starter and solution and sets `"run": { "node": "demo.ts" }` in `meta.json`. The demo imports the learner's functions, scripts a realistic scenario with `fakeModel`/`respond` from `@dojo/ai/testing` and prints results. It never executes during tests (it is outside the entry's import graph), so it cannot consume scripted replies.
- **Theory:** 300–1000 words, provider-agnostic, ending with `## When to choose it`; no `## Working with AI` section (the whole track is about it). Volatile facts (model names, prices, context sizes, benchmark scores, laws, framework versions) go in one blockquote that starts with `**Status as of <Month YYYY>:**`.
- **Tags:** maturity first (`established`, `emerging` or `hype-watch`), then `core`, then `theory` (quiz lessons) or `practice` (challenges).
- **Map lessons:** lesson ids are unique across the track, so each map takes its module's prefix (`01-track-map` in module 01 maps the whole track; `01-prompts-map`, `01-rag-map` and the rest, named like the module's ADR, map only their module: question it answers, layer, prerequisites, path, ADR at the end).
- **ADR checkpoints:** the last lesson of each module, following the React Architecture pattern: a briefing, an exported `adr` plus a module-specific plan object, tests for structure and coherence with the briefing.
- **Tests:** use `captureError` to inspect errors and `toBeCloseTo` for costs instead of local helpers. Verify one lesson exactly with `LESSON=ai-engineering/<lesson-id>`.
- **Resources:** canonical URLs that return 200 to `curl`; a few canonical domains block bots with 403 (openai.com, platform.openai.com, lmarena.ai): open those in a browser before citing them.

## C# track (`csharp`)

The track runs on the C# engine (`"engine": "csharp"`, see "C# engine" above). Every lesson has theory + quiz (`theory.md`, `concepts.json`, `quiz.json`, `meta.json`), and some add a graded C# challenge (**(challenge)** in CURRICULUM.md; 3–6 tests, one marked `// beginner mistake:`, [06-content-standards.md](csharp-track/06-content-standards.md)); practice projects are described in the closing lesson of a module and built locally with the .NET 10 SDK, and a lesson that adds a C# challenge follows csharp-engine.md "Giving a lesson a C# challenge". A lesson without a challenge renders no workspace and downloads nothing. `src/verify/csharp.test.ts` checks the engine, grades every challenge with `csharpGrader()` and enforces the track's standards: tags (status, tier, kind), the theory headings (a `You need:` line after the opening paragraph, concept sections first, then `## Common mistakes` with 2–4 bullets in 60–180 words, `## In practice` and `## Check yourself`; no `## Coming from` section) and 500–1,300 words of theory (more than the general 250–900, because the theory and the quiz carry the whole lesson), 5–6 quiz questions, official resources (at least one learn.microsoft.com page), no comparison with PHP or Magento (names from their ecosystem included, such as PHPUnit, PSR-3 or `bin/magento`) in any lesson file, challenge files included, or in `track.json` and `module.json`, and, in a challenge, 3–6 tests, exactly one marked `// beginner mistake:` on the line above its `[Test]`, and an `await` before every `Assert.ThrowsAsync`. The lessons are written for a learner with no prior programming language. Every lesson and the track and module texts follow this template, so both lists in `src/verify/csharpPendingRewrite.ts` (`CSHARP_PENDING_REWRITE` for lessons, `CSHARP_PENDING_HEADERS` for track and module texts) are empty; an entry that no longer matches a broken rule fails the suite, so they stay empty. The track opens with the optional module `00-fundamentals` (programming from zero, every lesson with a challenge); a challenge's `Program.cs` may begin with top-level statements, which **Run** executes and the tests ignore. Spec and standards: `.claude/docs/csharp-track/` (`06-content-standards.md`); the engine's feasibility study is `04-engine-spike.md`.

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
npx vitest run src/verify/<track>.test.ts                      # whole track (every language of a multi-language track)
LESSON=use-effect npx vitest run src/verify/react.test.ts      # lessons whose id contains "use-effect"
LESSON=react/use-effect npx vitest run src/verify/react.test.ts # exactly one lesson (track/id)
DEMO_OUTPUT=1 LESSON=ai-engineering/calling-a-model npx vitest run src/verify/ai-engineering.test.ts --silent=false # also print each demo's output
LESSON=use-effect npx vitest run src/verify/content.test.ts    # structure checks
npx vitest run src/verify/curriculum.test.ts                    # CURRICULUM.md matches the written lessons
npm run verify                                                  # everything
.venv/bin/python -m pytest                                      # Python challenges on CPython 3.14 (setup in CONTRIBUTING.md)
```

The suites check structure (theory length, hints, approach, quiz indexes, track monogram), that the solution passes every test, that the starter fails at least one, that every written lesson is marked `✓` in [CURRICULUM.md](CURRICULUM.md), and that every track accent meets the contrast and hue rules. `tests/python` (pytest, CPython 3.14, run in CI) grades every Python challenge again with the same harness outside Pyodide, with the same contract (solution passes, starter fails); lessons that use the fake model are skipped. A Python lesson that passes under Pyodide but not CPython teaches a Pyodide quirk: fix the lesson. The harness reads `DOJO_APP_DIRECTORY` and `DOJO_SCRATCH_DIRECTORIES` only for that suite (Pyodide gets an explicit environment without them).

Time budgets under load (`src/verify/timeBudget.ts`): verification multiplies every engine limit by `DOJO_VERIFY_TIME_SCALE` (default 3, minimum 1): the 4 s per JavaScript test, the 1.5 s loop guard, the Testing Library `waitFor` default, the 2 s TypeScript runtime test, the 6 s per Python test and 15 s per Python Run demo, and Vitest's 60 s per-test ceiling. A **solution** run whose only failures are timeouts or the loop guard is graded once more (logged as `[verify] … retrying once`); any other failure, or a second timeout, fails. A real hang therefore still fails, only later. The learner's limits in the browser are unchanged: the engines keep their defaults and only `src/verify` passes larger ones. Use `DOJO_VERIFY_TIME_SCALE=1` to check a lesson against the exact browser budgets, a larger value when the machine runs several verify processes in parallel.
