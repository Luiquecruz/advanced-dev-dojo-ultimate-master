## Why React needs tooling

Browsers do not understand JSX, and real apps import hundreds of modules, CSS files and images. A React project therefore needs a **toolchain** that:

1. **Transforms** JSX and TypeScript into plain JavaScript (esbuild, SWC, Babel or Oxc).
2. Serves a fast **dev server** with hot module replacement (HMR), so edits appear without losing state.
3. **Bundles and optimizes** for production: tree shaking, minification, code splitting, hashed file names.

## The rise and sunset of Create React App

From 2016 to the early 2020s, **Create React App (CRA)** was the official way to start: `npx create-react-app my-app` gave you webpack, Babel and Jest preconfigured behind `react-scripts`. Over time it fell behind: slow webpack builds, no server rendering, no routing or data fetching story, and almost no maintenance. In **February 2025 the React team officially deprecated CRA**. Existing CRA apps keep working, but new projects should not use it, and old ones are usually migrated to Vite or a framework.

## Option 1: a React framework

The React docs recommend starting new apps with a **framework**, because real apps eventually need routing, data loading, code splitting and server rendering, and frameworks solve these together:

| Framework | Highlights |
| --- | --- |
| **Next.js** (App Router) | Server Components, Server Functions, file-based routing, SSR/SSG, by Vercel |
| **React Router v7** (framework mode) | The successor of Remix: loaders, actions, SSR, built on Vite |
| **Expo** | React Native apps for iOS, Android and web |

Other options include TanStack Start. Frameworks can still produce a fully static site (a single-page app) if you do not need a server.

## Option 2: a build tool, from scratch

For SPAs, widgets, learning projects or when you want full control, use a build tool directly. **Vite** is the de facto standard:

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install
npm run dev
```

You get a tiny project:

```text
my-app/
  index.html          ← entry HTML, loads /src/main.tsx as a module
  vite.config.ts      ← plugins (e.g. @vitejs/plugin-react)
  src/main.tsx        ← creates the root
  src/App.tsx
```

```tsx
// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

`createRoot` (React 18+) replaced the legacy `ReactDOM.render`, which was **removed in React 19**. `StrictMode` enables extra development checks such as double-invoking renders and effects.

Alternatives to Vite include **Parcel** and **Rsbuild** (Rspack). With a plain build tool you add routing (React Router, TanStack Router) and data fetching (TanStack Query) yourself.

## The rest of the toolbox

- **TypeScript**: the default for most new React code; Vite templates ship `react-ts`.
- **ESLint** with `eslint-plugin-react-hooks`: enforces the Rules of Hooks and effect dependencies (and React Compiler diagnostics in recent versions).
- **React Compiler**: a build-time plugin that memoizes components automatically.
- **React Developer Tools**: browser extension to inspect the component tree, props, state and profile renders.
- **Vitest + React Testing Library** for unit and component tests; **Playwright** for end-to-end tests.
- **Prettier** or Biome for formatting.

## Using React without a build step

You *can* load React from a CDN with ES modules and write `createElement` calls by hand, which is fine for experiments. Babel-in-the-browser (`<script type="text/babel">`) is only for demos: it is slow and not meant for production.

## Choosing

- Content site, e-commerce, SEO or server data → a **framework**.
- Internal dashboard, embedded widget, learning → **Vite**.
- Maintaining a CRA app → keep it running, plan a migration to Vite or a framework.
