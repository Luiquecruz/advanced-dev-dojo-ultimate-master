# Dev Dojo

A freeCodeCamp-style learning platform for **TypeScript**, **React**, **Vue** and **Angular**: theory, hands-on challenges validated by automated tests, progressive hints, a solution path, reference solutions and quizzes. Everything runs in the browser.

| Track | Versions |
| --- | --- |
| TypeScript | TypeScript 6.0 compiler in the browser (theory covers TypeScript 7) |
| React | React 19.3, React Router 7, TanStack Query 5, Zustand 5, Redux Toolkit 2, Jotai 3, React Hook Form 7, Zod 4 |
| Vue | Vue 3.5, Vue Router 5, Pinia 4, VueUse 15, TanStack Vue Query 5, VeeValidate 4 |
| Angular | Angular 22 (zoneless, signals, Signal Forms), NgRx Signals 22, NgRx Store 22, RxJS 7.8 |

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run test       # unit and architecture tests
npm run verify     # validates every lesson (solution passes, starter fails, structure)
```

## How it works

- **Lesson page**: theory, key concepts and links on the left (Learn tab); the task, live test list, hints, solution path and reference solution (Challenge tab); multiple choice quiz (Quiz tab). Monaco editor, live preview, test output and console on the right. `⌘/Ctrl + Enter` runs the tests.
- **TypeScript engine** (`src/engines/typescript`): type tests, runtime tests and pattern tests, compiled with the TypeScript compiler API inside Web Workers.
- **Framework engines** (`src/engines/react|vue|angular`): learner code (single or multi-file) is transpiled with TypeScript (`transpileModule`) into CommonJS and evaluated inside a sandbox iframe (`sandbox.html`). Vue SFCs are compiled with `@vue/compiler-sfc`; Angular runs in JIT mode with a transform equivalent to the Angular CLI one for signal inputs, models, outputs and queries. Tests use Testing Library, Vue Test Utils and TestBed with a Jest-like `expect`. Loops are guarded against infinite execution and a fake REST API (`/api/*`) is available.
- **Progress** (completed challenges and quizzes, code per lesson) is saved in `localStorage`.

## Content

Lessons live in `src/content/<track>/<NN-module>/<NN-lesson>/` as plain Markdown, JSON and code files. See [CONTENT_GUIDE.md](CONTENT_GUIDE.md) for the format and [CURRICULUM.md](CURRICULUM.md) for the full plan. To add a new track or a new part of the UI, follow [ARCHITECTURE.md](ARCHITECTURE.md).
