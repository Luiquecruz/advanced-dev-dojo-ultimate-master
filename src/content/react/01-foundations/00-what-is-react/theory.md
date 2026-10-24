## A library for building user interfaces

React is a JavaScript **library** for building user interfaces out of small, reusable pieces called **components**. It was created at Facebook (Jordan Walke, 2011), open sourced in 2013, and is now maintained by Meta together with a large community. React itself only cares about one thing: turning your data into UI and keeping that UI up to date when the data changes.

## Declarative instead of imperative

Before React, most interactive pages were built **imperatively**: you found DOM nodes and told the browser, step by step, what to change.

```js
// Imperative (vanilla DOM / jQuery era)
const button = document.querySelector('#like');
const label = document.querySelector('#likes');
let likes = 0;
button.addEventListener('click', () => {
  likes++;
  label.textContent = `${likes} likes`;
  if (likes > 10) label.classList.add('popular');
});
```

Every new feature adds another "when X happens, patch Y" rule, and it becomes easy to forget one. React is **declarative**: you describe what the UI should look like *for a given state*, and React figures out the DOM operations.

```jsx
function LikeButton() {
  const [likes, setLikes] = useState(0);
  return (
    <button className={likes > 10 ? 'popular' : ''} onClick={() => setLikes(likes + 1)}>
      {likes} likes
    </button>
  );
}
```

A good mental model is **UI = f(state)**: a component is a function from data to a description of the screen.

## Components all the way down

A React app is a **tree of components**. Each component is a JavaScript function that returns JSX. Components can be nested, reused and shared as packages:

```jsx
function App() {
  return (
    <Layout>
      <Header />
      <ProductList category="hardware" />
      <Footer />
    </Layout>
  );
}
```

Data flows **one way**, from parents to children through **props**. When a child needs to change something, the parent passes it a function to call. This one-way data flow makes it easy to trace where a value comes from.

## How React updates the screen

1. **Render**: React calls your components to get a tree of React elements (plain objects describing the UI).
2. **Reconcile**: it compares the new tree with the previous one to find what changed (the classic "virtual DOM" diffing; internally the *Fiber* architecture since React 16).
3. **Commit**: it applies the minimal set of changes to the real DOM.

Rendering is just calling functions, so it must be **pure**: same inputs, same output, no side effects during render.

## React is not tied to the browser

The core `react` package knows nothing about the DOM. **Renderers** connect it to a platform: `react-dom` for the web, `react-native` for iOS and Android, plus renderers for terminals (Ink), 3D (react-three-fiber) and PDFs.

## Library vs framework

React gives you components, state and rendering. It does **not** ship a router, data fetching layer or build setup. You either pick libraries yourself (React Router, TanStack Query, Zustand) or use a **React framework** such as Next.js or React Router's framework mode, which bundle routing, data loading and server rendering.

## Where React is today

- **Hooks** (React 16.8, 2019) replaced class components as the default way to write stateful logic.
- **Concurrent rendering** (React 18) lets React interrupt and prioritize work (`useTransition`, Suspense).
- **React 19** added Actions, `useActionState`, `useOptimistic`, the `use` API, ref as a prop and stable Server Components.
- The **React Compiler** automatically memoizes components, reducing the need for manual `useMemo` and `useCallback`.

You will meet all of these in this track, plus the legacy class APIs you still find in older codebases.
