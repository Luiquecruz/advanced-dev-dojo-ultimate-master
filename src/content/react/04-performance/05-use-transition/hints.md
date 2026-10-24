A plain `setTab('posts')` is urgent: when `PostsTab` suspends, React must show the fallback because it has nothing else to render. A transition lets React keep the current UI instead.
---
Call `const [isPending, startTransition] = useTransition();` at the top of `TabsApp` and change `selectTab` to `startTransition(() => { setTab(nextTab); })`.
---
Render the indicator with a conditional: `{isPending && <p role="status">Switching...</p>}`. Place it outside the `<Suspense>` boundary so it is not hidden by the fallback.
