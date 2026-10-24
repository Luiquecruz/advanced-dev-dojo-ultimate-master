Call `useEffect(() => { ... }, [userId])` so the effect re-runs whenever the prop changes.
---
`fetch` returns a Promise: chain `.then((response) => response.json()).then(setUser)`.
---
Create an `AbortController` inside the effect, pass `{ signal: controller.signal }` to `fetch`, and `return () => controller.abort()` as cleanup. Catch the `AbortError` so it does not surface as an error.
