## Animating between UI states

The browser's **View Transition API** (`document.startViewTransition`) snapshots the page, lets you mutate the DOM, then animates from the old snapshot to the new one with CSS. Using it by hand in React is awkward: you must run the DOM update synchronously inside the callback (`flushSync`), assign unique `view-transition-name`s, and coordinate with Suspense.

React 19.3 made `<ViewTransition>` stable. You declare **what** can animate; React decides **when**, assigns names, and calls the browser API for you.

```jsx
import { ViewTransition } from 'react';

{isOpen && (
  <ViewTransition>
    <Panel />
  </ViewTransition>
)}
```

## Only Transitions animate

`<ViewTransition>` animates only updates that are **Transitions**: `startTransition`, `useTransition`, `useDeferredValue`, Actions, or a Suspense boundary revealing content. A regular `setState` in a click handler is urgent and updates instantly, without animation.

```jsx
// ❌ no animation: urgent update
setIndex(index + 1);

// ✅ animates
startTransition(() => setIndex(index + 1));
```

## What triggers which animation

| Trigger | When |
| --- | --- |
| `enter` | a `<ViewTransition>` is inserted |
| `exit` | a `<ViewTransition>` is removed |
| `update` | its DOM content or size changes |
| `share` | a named `<ViewTransition>` unmounts in one place and a same-named one mounts elsewhere (shared element) |

Each prop accepts a **View Transition Class** (`'slide-in'`, `'auto'` for the default cross-fade, `'none'` to disable). React sets it as `view-transition-class` so CSS can target it:

```css
::view-transition-old(.slide-to-left) { animation: 300ms ease-out both slide-out-left; }
::view-transition-new(.slide-from-right) { animation: 300ms ease-out both slide-in-right; }
```

Changing the `key` of a `<ViewTransition>` swaps it for a new instance, producing an `exit` for the old one and an `enter` for the new one: perfect for slides and route content.

## `addTransitionType`: animate by cause

The same state change can mean different things. "Next" should slide left, "Previous" should slide right. Tag the Transition with `addTransitionType` and map types to classes:

```jsx
function next() {
  startTransition(() => {
    addTransitionType('next');
    setIndex((current) => current + 1);
  });
}

<ViewTransition
  key={index}
  enter={{ next: 'slide-from-right', previous: 'slide-from-left', default: 'none' }}
  exit={{ next: 'slide-to-left', previous: 'slide-to-right', default: 'none' }}
>
  <Slide index={index} />
</ViewTransition>
```

`default` applies when no listed type matches. React also passes the types to the browser, so CSS can use `:active-view-transition-type(next)`.

## Animating Suspense

Wrap a Suspense boundary to cross-fade from the fallback to the content:

```jsx
<ViewTransition update="auto" default="none">
  <Suspense fallback={<Skeleton />}>
    <Profile />
  </Suspense>
</ViewTransition>
```

`default="none"` avoids animating cached content that appears immediately.

## Pitfalls

- **Placement**: enter/exit only fire when the `<ViewTransition>` is the first thing rendered in the changing subtree, before any DOM node. `<div><ViewTransition>` inside a component that mounts misses the enter.
- **Unique names**: a `name` used for shared transitions must be unique in the app at any moment.
- **Graceful fallback**: in browsers without the API (and in this sandbox's test environment) React simply applies the update without animating. Never put logic in animations.
- `onEnter`, `onExit`, `onUpdate` and `onShare` callbacks give you the instance for imperative Web Animations.
- Respect `prefers-reduced-motion` in your CSS.
