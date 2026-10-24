## When `useEffect` runs too late

React updates the screen in phases:

1. **Render**: call components, compute the new tree.
2. **Commit**: apply changes to the DOM.
3. **Layout effects**: run `useLayoutEffect` callbacks, synchronously.
4. **Paint**: the browser draws the frame.
5. **Passive effects**: run `useEffect` callbacks, usually after paint.

Most Effects belong in step 5: they do not block the browser from showing the update. But some code must **measure the DOM and adjust it before the user sees anything**. Tooltips, popovers and menus that need to flip when there is no room are the classic case:

```jsx
function Tooltip({ anchorTop, text }) {
  const ref = useRef(null);
  const [placement, setPlacement] = useState('top');

  useEffect(() => {
    const { height } = ref.current.getBoundingClientRect();
    setPlacement(anchorTop >= height ? 'top' : 'bottom');
  }, [anchorTop, text]);

  return <div ref={ref} data-placement={placement}>{text}</div>;
}
```

With `useEffect` the browser paints the tooltip on **top**, then the Effect measures, sets state and React paints it again at the **bottom**. Users see a flicker.

## `useLayoutEffect` blocks paint

Same signature as `useEffect`, different timing:

```jsx
useLayoutEffect(() => {
  const { height } = ref.current.getBoundingClientRect();
  setPlacement(anchorTop >= height ? 'top' : 'bottom');
}, [anchorTop, text]);
```

React runs it right after the DOM is updated and **before** the browser paints. A state update inside it is processed synchronously, so the browser only ever paints the final placement. The React Profiler reports that second pass with the phase `"nested-update"`, a sign that an update happened inside the commit.

## The cost

Layout effects and the re-render they trigger block the browser from painting. Heavy work there makes every update feel slow. Rules of thumb:

| Need | Hook |
| --- | --- |
| Data fetching, subscriptions, logging | `useEffect` |
| Read layout (size, position, scroll) and synchronously adjust the UI | `useLayoutEffect` |
| Inject `<style>` tags before layout (CSS-in-JS libraries only) | `useInsertionEffect` |

Start with `useEffect`; switch only when you can see a flicker.

## Measuring the DOM

- `element.getBoundingClientRect()` gives size and position relative to the viewport.
- `offsetHeight`, `scrollHeight`, `clientWidth` give box metrics.
- Reading layout right after changing styles forces the browser to compute layout synchronously ("layout thrashing"). Read first, then write.
- For sizes that change over time, subscribe with `ResizeObserver` in an Effect.

## Server rendering

`useLayoutEffect` does nothing on the server, since there is no layout. Components that render a measurement-dependent UI should render a sensible default on the server (or render the measured part only on the client). Older React versions printed a warning when `useLayoutEffect` ran during SSR; React 19 removed that warning.

## Alternatives

- **CSS first**: anchor positioning (`position-anchor`, `position-try-fallbacks`) can flip popovers without JavaScript in modern browsers.
- Libraries like Floating UI handle collision detection, scrolling containers and virtual elements, and use layout effects internally.

## Legacy vs modern

In class components, `componentDidMount` and `componentDidUpdate` ran at the same time as `useLayoutEffect` (before paint), which is why a mechanical class-to-Hooks migration sometimes reaches for it. `getSnapshotBeforeUpdate` captured layout (like scroll position) just before the DOM changed; there is no Hook equivalent yet, so that rare case still uses a class.
