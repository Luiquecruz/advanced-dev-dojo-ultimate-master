The measuring code is fine. The problem is **when** it runs: `useEffect` runs after the browser has already painted the first placement.
---
React has an Effect Hook with the same signature that runs synchronously after DOM mutations and before paint.
---
Replace `useEffect` with `useLayoutEffect` (import it from `react`). The state update inside it is flushed before the browser paints.
