## Memoization without the boilerplate

The previous lessons used `memo`, `useMemo` and `useCallback` to skip work. They work, but they are easy to get wrong: a missing dependency gives stale values, an inline object breaks `memo`, and the code becomes noisy. **React Compiler** is a build-time tool that adds this memoization **automatically**. Version **1.0** became stable in October 2025 after running in production at Meta.

You write plain components:

```jsx
function TodoList({ todos, filter }) {
  const visible = todos.filter((todo) => matches(todo, filter));
  const handleToggle = (id) => toggle(id);
  return <List items={visible} onToggle={handleToggle} />;
}
```

The compiler analyzes data flow and emits code that caches `visible`, `handleToggle` and the JSX, recomputing each one only when its inputs (`todos`, `filter`) change. Conceptually it is like this, using an internal cache Hook from `react/compiler-runtime`:

```jsx
function TodoList({ todos, filter }) {
  const $ = _c(4);
  let visible;
  if ($[0] !== todos || $[1] !== filter) {
    visible = todos.filter((todo) => matches(todo, filter));
    $[0] = todos;
    $[1] = filter;
    $[2] = visible;
  } else {
    visible = $[2];
  }
}
```

It can memoize things manual APIs cannot, such as values **after** an early return or individual JSX elements.

## Setup

The compiler is a Babel plugin (`babel-plugin-react-compiler`) with first-party integrations:

- **Vite** with `@vitejs/plugin-react` 6: Babel via `@rolldown/plugin-babel` and the exported `reactCompilerPreset()`, or the experimental Rust port with `react({ compiler: true })`.

```js
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';

export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
});
```

- **Next.js**: `reactCompiler: true` in `next.config`. **Expo**: enabled in new projects.
- **React 17 and 18**: set `target: '17'` or `'18'` and install `react-compiler-runtime`. React 19 ships the runtime itself.

## Rules of React are now load-bearing

The compiler assumes your code follows the **Rules of React**: components and Hooks are pure during render, props and state are immutable, Hooks follow call-order rules, refs are not read during render. When it detects a violation in a component, it **skips** that component (leaving it unoptimized) instead of breaking it. Code that breaks the rules in ways it cannot detect may behave differently once memoized.

The compiler-powered diagnostics ship in `eslint-plugin-react-hooks` (recommended preset): purity, `set-state-in-render`, refs during render, immutability and more. Fixing those warnings is the first step of adoption.

## Directives and incremental adoption

| Directive / option | Effect |
| --- | --- |
| `'use no memo'` at the top of a function | opt that component or Hook **out** (temporary escape hatch) |
| `compilationMode: 'annotation'` | compile **only** functions marked `'use memo'` |
| `'use memo'` | opt a function in when using annotation mode |

Roll out per directory or with annotation mode, measure with the Profiler, then widen.

## What happens to `useMemo` and `useCallback`?

- New code: write plain code and let the compiler memoize.
- Existing code: **keep** manual memoization. Removing it can change what effects depend on; the compiler preserves it and validates it.
- Still useful as an explicit **contract**: a value used as an effect dependency that must stay stable, or a library that compares references.

## Limits

- It memoizes; it does not make an expensive calculation cheaper on the first render, virtualize long lists or split code.
- It only works on code it compiles: `node_modules` dependencies ship pre-compiled or not at all.
- Debugging: React DevTools shows a **Memo ✨** badge on compiled components.

## Legacy note

Before the compiler, React performance work meant manual `memo` / `useMemo` / `useCallback`, class `shouldComponentUpdate` and `PureComponent`. All still work, but in a compiled codebase most of them become unnecessary.
