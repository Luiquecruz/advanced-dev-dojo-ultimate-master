The input must stay urgent, so `useTransition` around `setQuery` is not an option. Instead, give the slow part a lagging copy of the value.
---
Add `const deferredQuery = useDeferredValue(query);` and render `<SearchResults query={deferredQuery} />`. When the deferred render suspends, React keeps the previous results instead of showing the fallback.
---
`const isStale = query !== deferredQuery;` then `<div aria-busy={isStale} style={{ opacity: isStale ? 0.5 : 1 }}>`.
