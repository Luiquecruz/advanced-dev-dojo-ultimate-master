## A development-only bug detector

`<StrictMode>` renders nothing visible. It turns on extra checks for everything inside it, **only in development**. Production builds ignore it completely.

```jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

Vite, Next.js and most templates enable it by default. You can also wrap only part of the tree while migrating a legacy app.

## Check 1: double rendering

React calls your component functions **twice** (and class `constructor`, `render`, `shouldComponentUpdate`), plus the functions you pass to `useState`, `useMemo` and `useReducer`, and state updater functions. Then it discards one result.

Why? Rendering must be **pure**: same inputs, same output, no side effects. A pure function called twice behaves the same. An impure one reveals itself:

```jsx
let guests = 0;

function Cup() {
  guests = guests + 1;
  return <h2>Tea cup for guest #{guests}</h2>;
}
```

In StrictMode the numbers jump by two, exposing the mutation of an outer variable. The same happens when you `push` into a prop array during render or mutate state in an updater.

Since React 18, the console logs of the second call are shown dimmed (React DevTools can hide them). In React 19, `useMemo` and `useCallback` reuse the result of the first call during the double render.

## Check 2: double effects

On mount, React runs every effect's **setup → cleanup → setup** once more. It simulates the component being unmounted and remounted, which really happens with features such as `<Activity>` (hide and restore UI) and Fast Refresh.

```jsx
useEffect(() => {
  const connection = createConnection(roomId);
  connection.connect();
}, [roomId]);
```

Without a cleanup, StrictMode leaves **two** open connections and the bug is visible immediately. Return `() => connection.disconnect()` and the dev behavior equals production: one connection.

Classes get the same treatment: `componentDidMount` → `componentWillUnmount` → `componentDidMount`.

The usual complaint "my fetch runs twice" is StrictMode doing its job. Fix it with an abort or ignore flag in the cleanup, or use a data library. Do **not** "fix" it with a `didRun` ref that skips the second call: that hides real remount bugs.

## Check 3: double ref callbacks (React 19)

React 19 also runs ref callbacks setup → cleanup → setup on mount, to verify that refs returning a cleanup function undo their work.

## Check 4: deprecated API warnings

StrictMode warns about APIs that break with concurrent rendering, such as the `UNSAFE_componentWillMount`, `UNSAFE_componentWillReceiveProps` and `UNSAFE_componentWillUpdate` lifecycles. Historically it also flagged string refs, `findDOMNode` and the legacy context API, all removed in React 19.

## Legacy notes

- StrictMode arrived in React 16.3 to prepare apps for async (concurrent) rendering.
- React 17 silenced console logs during the second render, which confused people because effects looked like they ran once. React 18 changed it to dimmed logs.
- React 18 added the effect double-invocation ("strict effects").

## Pitfalls

- Treating double logs as a performance problem: it is development only.
- Removing StrictMode to make a bug "go away": the bug is still there, users will hit it on remounts.
- Side effects in render (analytics calls, mutations) that run twice: move them to event handlers or effects.
