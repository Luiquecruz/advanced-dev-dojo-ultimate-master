## Every request has three states

A component that loads data must render something for each moment of the request: **loading**, **error** and **success**. Forgetting one gives blank screens or crashes on `undefined`.

```jsx
if (isLoading) return <p>Loading...</p>;
if (error) return <p role="alert">{error.message}</p>;
return <UserList users={data} />;
```

## `fetch` does not reject on HTTP errors

`fetch` only rejects on network failures. A `404` or `500` resolves normally with `response.ok === false`. Check it yourself and throw, so error handling has a single path:

```js
async function getJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
}
```

Axios rejects on non-2xx statuses by default, which is one reason it was popular; with this small helper `fetch` behaves the same.

## Fetching in an effect, correctly

```jsx
useEffect(() => {
  const controller = new AbortController();
  setIsLoading(true);
  setError(null);
  getJson(url, { signal: controller.signal })
    .then((json) => {
      setData(json);
      setIsLoading(false);
    })
    .catch((error) => {
      if (error.name === 'AbortError') return;
      setError(error);
      setIsLoading(false);
    });
  return () => controller.abort();
}, [url]);
```

Key points:

- **The URL is a dependency.** When it changes the effect re-runs.
- **Abort in the cleanup.** Without it, a slow response for an old URL can arrive after the new one and overwrite fresh data: a **race condition**. Aborting also stops wasted work on unmount.
- **Ignore `AbortError`.** It is expected, not a failure.
- **Reset state when the URL changes** so the UI does not show stale data with a new label.
- In development **StrictMode runs effects twice** (setup, cleanup, setup). With the abort cleanup the first request is cancelled, which is exactly what proves your cleanup works.

## Extract a custom hook

Repeating that effect in every component is error-prone. Wrap it in a hook that returns the three states:

```jsx
export function useFetch(url) {
  const [state, setState] = useState({ data: null, error: null, isLoading: true });
  useEffect(() => {
    /* fetch, abort and set state */
  }, [url]);
  return state;
}

function PostList() {
  const { data, error, isLoading } = useFetch('/api/posts');
}
```

Custom hooks share **logic**, not state: each component calling `useFetch` gets its own state and its own request.

## The legacy way

Class components fetched in `componentDidMount`, re-fetched in `componentDidUpdate` after comparing props, and used an `_isMounted` flag to avoid "setState on an unmounted component" warnings:

```jsx
componentDidMount() {
  this._isMounted = true;
  fetch(`/api/users/${this.props.id}`)
    .then((r) => r.json())
    .then((user) => this._isMounted && this.setState({ user }));
}
componentWillUnmount() {
  this._isMounted = false;
}
```

`AbortController` replaced the flag, and hooks grouped the logic in one place.

## Fetch-on-render and waterfalls

Effects start fetching only **after** the component renders. If a child fetches only after its parent's data arrives, requests run one after another: a **waterfall**.

```
Profile renders → fetch user → Posts renders → fetch posts → Comments renders → fetch comments
```

Fixes: start independent requests in parallel higher up (`Promise.all`), fetch at the route level (loaders), or use a library that prefetches.

## Why libraries exist

A hand-written `useFetch` lacks features real apps need:

- **Caching**: navigating back refetches everything.
- **Deduplication**: two components with the same URL make two requests.
- **Revalidation**: no refetch on window focus or reconnect.
- **Mutations and invalidation**: no way to tell other components the data changed.
- **Pagination, retries, SSR hydration.**

That is why the React team recommends TanStack Query, SWR, RTK Query or your framework's data APIs for production. Understanding the manual version, though, explains what those libraries automate, and it is still fine for small apps and one-off widgets.
