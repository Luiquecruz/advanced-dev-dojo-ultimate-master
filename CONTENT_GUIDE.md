# Content Guide

Dev Dojo has these tracks: `typescript`, `react`, `react-state` (runs on the React engine), `vue`, `angular`. A track declares its engine in `track.json` (`"engine": "react"`), so several tracks can share one engine. Every lesson is a folder:

```
src/content/<track>/<NN-module>/<NN-lesson-id>/
```

Number prefixes define order and are stripped from ids. Lesson ids must be **unique inside a track**. Use kebab-case.

All content is written in **English**.

## Files

| File | Required | Purpose |
| --- | --- | --- |
| `meta.json` | yes | `{ "title", "summary", "level", "tags"?, "preview"?, "entry"?, "resources"? }` |
| `theory.md` | yes | The lesson. GitHub flavored Markdown with fenced code (`ts`, `tsx`, `jsx`, `vue`, `html`, `bash`, `css`, `json`) |
| `concepts.json` | recommended | Glossary cards `[{ "term", "description" }]` (Markdown allowed) |
| `challenge.md` | for practice | The task: exact names, signatures, texts and behaviors the tests check |
| `starter.<ext>` or `starter/` | with challenge | Code the editor starts with |
| `solution.<ext>` or `solution/` | with challenge | Reference solution (same file names as starter) |
| `tests.<ext>` | with challenge | Validation (format per track below) |
| `hints.md` | with challenge | 2–4 progressive hints separated by a line containing only `---`, from gentle nudge to almost-the-answer |
| `approach.md` | with challenge | "Solution path": numbered reasoning steps, without pasting the full solution |
| `quiz.json` | optional | `[{ "question", "options": [...], "answer": <index>, "explanation" }]` (Markdown allowed) |
| `module.json` | per module | `{ "title", "description" }` |
| `track.json` | per track | `{ "engine", "order", "title", "description", "version" }` (the accent color lives in `src/shared/design/tokens.css`) |

- `level`: `beginner`, `intermediate`, `advanced` or `expert`.
- `tags`: free list. Conventions: `core`, `legacy`, `modern`, `new` (latest-version feature), `ecosystem`, `theory`, `typescript`, `performance`, `testing`.
- `preview`: `false` hides the live preview for non-visual work (composables, services, utilities). TypeScript track never shows a preview.
- `entry`: required for multi-file challenges (`starter/` + `solution/` folders). Single-file defaults: TypeScript `main.ts`; React `App.jsx`/`App.tsx`; Vue `App.vue` (or `main.ts` when the starter is `.ts`); Angular `app.ts`.
- A lesson needs a challenge, a quiz, or both. Theory-only topics (tooling, frameworks, architecture, history) use a 4–6 question quiz.
- **Write `meta.json` last**, after every other file of the lesson exists. The loader only picks up folders that have `meta.json`, so half-written lessons stay invisible to other authors running the verifier.

## Writing good lessons

- `theory.md` teaches: what it is, why it exists, how it works (small runnable examples), pitfalls, and when to use it. Show the **legacy way vs the modern way** when an API evolved. 250–900 words.
- `challenge.md` is precise: the tests are the contract. Name every export, selector, text, role and prop the tests rely on.
- Starter code compiles, fails at least one test, and marks every place to write code with comments (`// TODO: ...`, `{/* TODO: ... */}`, `<!-- TODO: ... -->`).
- Tests describe requirements as sentences ("renders the user name in an <h3>"). Prefer behavior (what users see and do). Use source checks only to require a specific API, with tolerant regexes. 3–6 tests per challenge.
- Never rely on memory for library APIs: check the type definitions in `node_modules/<package>` (versions below).

## Installed versions

React engine (tracks `react`, `react-state`): React 19.3 · react-dom 19.3 · react-router 7 · @tanstack/react-query 5 · zustand 5 (`zustand/middleware`, `zustand/middleware/immer`, `zustand/shallow`, `zustand/react/shallow`, `zustand/vanilla`) · jotai 3 (`jotai/utils`) · @reduxjs/toolkit 2 · react-redux 9 · react-hook-form 7 · @hookform/resolvers 5 · zod 4 · clsx 2 · `@reduxjs/toolkit/query(/react)` · mobx 7 · mobx-react-lite 5 · valtio 2 (`valtio/utils`) · xstate 5 · @xstate/react 6 · immer 11 · use-immer
Vue 3.5 (full build with runtime template compiler) · vue-router 5 · pinia 4 · @vueuse/core 15 · @tanstack/vue-query 5 · vee-validate 4.15 · zod 4
Angular 22 (zoneless by default, Signal Forms in `@angular/forms/signals`, `FetchBackend` default for HttpClient) · @ngrx/signals 22 · @ngrx/store 22 · rxjs 7.8 · zod 4
TypeScript engine: TypeScript 6.0 compiler API (theory may cover TypeScript 7 native compiler)

## Fake REST API (React, Vue, Angular)

Available in previews and tests through `fetch` (and Angular `HttpClient`): `GET /api/users`, `/api/users/:id`, `/api/posts`, `/api/posts/:id`, `/api/posts?userId=`, `/api/products?q=`, `/api/search?q=`, `GET|POST /api/todos`, `GET|PATCH|PUT|DELETE /api/todos/:id`, `/api/error` (500). Also reachable as `https://api.example.com/...`.

Data: users 1 Ada Lovelace, 2 Alan Turing, 3 Grace Hopper, 4 Linus Torvalds, 5 Margaret Hamilton (`id, name, email, role`); todos 1 "Learn JSX" (completed), 2 "Master hooks", 3 "Ship a React app" (`id, title, completed`); products Keyboard 120, Mouse 45, IDE License 199, Monitor 340, Cloud Credits 50 (`id, name, price, category`); posts `id, userId, title, body` (4 posts). Data resets before each test.

## Framework tests (React, Vue, Angular)

Test file: React engine tracks (`react`, `react-state`) `tests.jsx`, Vue `tests.ts`, Angular `tests.ts`. Plain script, **no imports**, TypeScript syntax allowed (Angular tests may declare host components with decorators). React tests may use JSX.

Each `test(name, fn)` runs against a **fresh evaluation** of the learner project and a clean DOM. Test names are listed to the learner before running. Each test times out after 4 s. Keep `test()` calls at the top level.

Globals available in every framework track:

- `mod` — exports of the entry file; `modules['store.ts']` — exports of any project file
- `require(name)` — any module available to learner code (e.g. `require('pinia')`, `require('@angular/common/http/testing')`)
- `source` — entry file with comments stripped (for API-usage checks); `sources['file.ts']` for other files; `rawSource` keeps comments
- `expect` — Jest-like: `toBe`, `toEqual`, `toStrictEqual`, `toBeTruthy`, `toBeFalsy`, `toBeNull`, `toBeUndefined`, `toBeDefined`, `toBeTypeOf`, `toBeInstanceOf`, `toContain`, `toContainEqual`, `toMatch`, `toHaveLength`, `toHaveProperty`, `toBeGreaterThan(OrEqual)`, `toBeLessThan(OrEqual)`, `toThrow`, `toHaveBeenCalled`, `toHaveBeenCalledTimes`, `toHaveBeenCalledWith`, `toHaveBeenLastCalledWith`, `toBeInTheDocument`, `toHaveTextContent`, `toHaveAttribute`, `toHaveValue`, `toBeChecked`, `toBeDisabled`, `toBeEnabled`, `toHaveClass`, `toHaveStyle`, `toHaveFocus`, with `.not`, `.resolves`, `.rejects`, plus asymmetric matchers `expect.anything()`, `expect.any(Ctor)`, `expect.objectContaining()`, `expect.arrayContaining()`, `expect.stringContaining()`, `expect.stringMatching()`
- `fn(impl?)` — mock function (`mock.calls`, `mockReturnValue`, `mockReturnValueOnce`, `mockResolvedValue`, `mockRejectedValue`, `mockImplementation`, `mockClear`)
- `screen`, `within`, `waitFor`, `fireEvent` — Testing Library; `user` — `userEvent.setup()` instance; `userEvent`
- `sleep(ms)`, `mockApi(match, handlerOrValue)` (override a fake API route for this test), `jsonResponse(data, status)`

React extras: `render`, `renderHook`, `act` (React Testing Library), `React`.

Vue extras: `mount`, `shallowMount`, `flushPromises` (Vue Test Utils), `render` (Testing Library Vue), `nextTick`. Mount plugins with `mount(mod.default, { global: { plugins: [require('pinia').createPinia(), router] } })`. Mounted wrappers are unmounted automatically. For components that resolve through `<Suspense>` (async `setup`, top-level `await`), use `mount(Component, { attachTo: document.body })` instead of `render`: Testing Library's `render` unwraps the app root element, so the resolved branch is inserted into a detached node and the container ends up empty.

Angular extras (signal `input()`, `model()`, `output()`, `outputFromObservable()` and signal queries `viewChild()`/`viewChildren()`/`contentChild()`/`contentChildren()` are supported through a JIT transform equivalent to the Angular CLI one, in learner files and in test files; declare host components in tests with `const { Component } = require('@angular/core');` at the top of the test file): `render(Component, { inputs?, providers?, imports? })` → `{ fixture, component, element, setInput(name, value), stable() }` (configures TestBed, creates the component, auto-detects changes and awaits stability), `stable()` (awaits every rendered fixture; call it after user interactions or async work), `TestBed`. TestBed is reset between tests.

Previews: React renders `export default`. Vue mounts `export default` and calls an exported `configureApp(app)` first when present (install router/pinia there). Angular bootstraps the default export or the first exported standalone component with the exported `appConfig` when present.

Routers in tests: React `MemoryRouter`/`createMemoryRouter`; Vue `createMemoryHistory()`; Angular `provideRouter(routes)` + `RouterTestingHarness` or `withComponentInputBinding()`.

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
npm run verify                                                  # everything
```

The suites check structure (theory length, hints, approach, quiz indexes), that the solution passes every test and that the starter fails at least one.
