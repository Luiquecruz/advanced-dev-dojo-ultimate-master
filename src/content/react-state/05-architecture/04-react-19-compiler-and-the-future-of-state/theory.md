## React is absorbing state patterns

Several things that used to need libraries or boilerplate are now built into React 19.x. They do not replace stores or query caches, but they change **where** some state lives and **how much** code you write for it.

## Actions: async transitions with built-in pending state

An **Action** is an async function run inside a transition: `startTransition(async () => ...)` or a function passed to `<form action>`. React tracks its pending state for you.

```jsx
import { useActionState, useOptimistic } from 'react';

function LikeButton({ likes, like }) {
  const [optimisticLikes, addOptimisticLike] = useOptimistic(likes, (current) => current + 1);
  const [error, likeAction, isPending] = useActionState(async () => {
    addOptimisticLike();
    try {
      await like();
      return null;
    } catch {
      return 'Could not like';
    }
  }, null);

  return (
    <form action={likeAction}>
      <button disabled={isPending}>Like ({optimisticLikes})</button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
```

- `useActionState(action, initial)` → `[state, formAction, isPending]`: the result of the last run (errors, messages).
- `useOptimistic(value, reducer)` shows a temporary value **while an Action is pending** and falls back to the real `value` when it ends. The real value must change through the Action (refetch, revalidate, `setState`).
- `useFormStatus()` gives nested buttons the parent form's pending state without prop drilling.

What disappears: hand-written `isSubmitting` / `error` flags per form. What remains: a server cache for data that is read in many places.

## `use` and `<Context>`

- `use(promise)` reads a promise inside render and suspends until it resolves; `use(Context)` reads context and, unlike `useContext`, can be called conditionally.
- Since React 19 you render `<ThemeContext value={theme}>` directly; `<Context.Provider>` is the legacy form. In 19.3 this also works inside Server Components when the context comes from a `'use client'` module.

## Server Components change the map

Server Components run on the server, **cannot use state, effects or stores**, and pass data down as props. Consequences:

- Much read-only server state never reaches a client cache: it is fetched per request and streamed as HTML/props.
- Interactive islands (`'use client'`) still own UI state, forms and, when needed, a query cache for client-side refetching and mutations.
- Server Functions (`'use server'`) are invoked as Actions; after a write, the framework **revalidates** the affected routes instead of the client invalidating query keys.
- Module-level stores are dangerous on the server (shared across requests): create stores per request and pass them through context.

## `<Activity>` keeps hidden state alive

React 19.2 added `<Activity mode="visible" | "hidden">`. A hidden subtree keeps its state and DOM but unmounts its effects, and re-renders at low priority. Tabs, drawers and back-navigation can preserve local state (scroll position, drafts, expanded rows) **without lifting it into a store** just to survive unmounting. React 19.2 also stabilized `useEffectEvent` for reading the latest state inside effects without re-running them.

## React Compiler 1.0

The compiler (stable since October 2025, React 17+) automatically memoizes components and hooks at build time, more precisely than hand-written `useMemo`/`useCallback`/`memo`, including values computed after early returns.

What it changes for state management:

- **Fewer manual memos**: inline callbacks and objects passed as props or as Context values become stable automatically, which removes a whole class of "context value is a new object every render" re-renders.
- **It does not change subscriptions**: when a Context value really changes, every consumer still re-renders; a Zustand component without a selector still subscribes to the whole store. Selectors, splitting contexts and colocation still matter.
- **Rules of React are mandatory**: mutating props or state during render, reading refs in render or calling `setState` in render can behave differently once memoized. The `eslint-plugin-react-hooks` recommended preset reports these. `useMemo` remains an escape hatch for values used as effect dependencies.
- **Mutable stores**: libraries that rely on reading mutable objects during render should be verified against their own compiler guidance; components can opt out with the `"use no memo"` directive while migrating.

## Signals and the road ahead

Other frameworks (Solid, Vue, Angular, Svelte) adopted **signals**, and a TC39 proposal aims to standardize them. React keeps its "UI as a function of state" model and invests in the compiler, Actions and server rendering instead. Expect fewer client stores per app, not a new global primitive.

## When to use it / when not to

**Use** Actions, `useActionState` and `useOptimistic` for form submissions and single-component optimistic UI; Server Components for read-mostly data; `<Activity>` to preserve hidden UI state; the compiler on new code (and incrementally on old code) once lint rules pass.

**Keep** a query cache when data is shared and refetched on the client, a store for genuinely shared client state, and selectors for granularity: none of these features replaces them. Avoid relying on the compiler to fix architectural problems like over-globalized state.
