## Measure before you optimize

Memoization, transitions and code splitting all have a cost in complexity. Apply them where a **measurement** shows a problem. React gives you two tools: the `<Profiler>` component for programmatic measurement and **React Developer Tools** for interactive inspection.

## The `<Profiler>` component

Wrap any subtree and React calls `onRender` every time that subtree **commits**:

```jsx
import { Profiler } from 'react';

function onRender(id, phase, actualDuration, baseDuration, startTime, commitTime) {
  console.log(`${id} ${phase} took ${actualDuration.toFixed(1)}ms`);
}

<Profiler id="Feed" onRender={onRender}>
  <Feed />
</Profiler>
```

| Argument | Meaning |
| --- | --- |
| `id` | the `id` prop, to tell several profilers apart |
| `phase` | `"mount"`, `"update"` or `"nested-update"` (an update scheduled from a layout effect) |
| `actualDuration` | ms spent rendering the subtree in this commit; drops when memoization works |
| `baseDuration` | estimated ms to re-render the whole subtree without memoization (worst case) |
| `startTime` / `commitTime` | timestamps of the render start and the commit |

Key facts:

- `onRender` only fires for profilers whose subtree **actually rendered**. If `Feed` updates its own state, a sibling `<Profiler id="Sidebar">` stays silent. That makes profilers handy for spotting unnecessary renders in tests.
- Profilers can be nested and used many times.
- Profiling adds overhead, so it is **disabled in production builds** by default. To measure production, use the profiling build (`react-dom/profiling`, enabled through a bundler alias) and send aggregated numbers to your analytics, never one request per commit.

## React Developer Tools

The browser extension (Chrome, Firefox, Edge) or the standalone `react-devtools` package adds two panels:

- **Components**: the component tree with props, state, Hooks and context. You can edit values live, find which owner rendered a component, and jump to the source. Compiled components show a **Memo ✨** badge.
- **Profiler**: records commits while you interact. The **flame graph** shows each component's render time in a commit; the **ranked** view sorts by cost. Enable *"Record why each component rendered while profiling"* to see whether props, state, Hooks or a parent caused a render.

Settings worth knowing: *"Highlight updates when components render"* flashes components as they re-render, a quick way to see wasted renders while clicking around.

## Performance tracks (React 19.2)

Since React 19.2 the Chrome DevTools **Performance** panel shows React-specific tracks: a *Scheduler* track (blocking vs transition work, when updates were scheduled, rendered and committed) and a *Components* track (which components rendered and for how long). They appear automatically in development builds and connect React's work to network, layout and paint in one timeline.

## A practical workflow

1. Reproduce the slow interaction in a **production-like** build (development React is much slower and runs extra checks).
2. Record it in the DevTools Profiler. Find the commit that is slow and the components that dominate it.
3. Ask *why* each expensive component rendered. Typical fixes: move state down, pass children instead of props, `memo` with stable props, `useMemo` for expensive calculations, transitions for non-urgent updates, virtualization for long lists. Or enable React Compiler.
4. Record again and compare. Lock the win in with a test that counts renders through `<Profiler>`.

## Legacy note

Older React versions exposed `react-addons-perf` (`Perf.start()` / `Perf.printWasted()`), removed in React 16, and developers often used the community library `why-did-you-render`. The `<Profiler>` API (React 16.5) and the DevTools Profiler replaced both.
