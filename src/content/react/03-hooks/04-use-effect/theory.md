## Effects synchronize with the outside world

`useEffect(setup, dependencies?)` runs **after** React commits the render to the screen. Use it to sync with systems React does not control: network, timers, subscriptions, browser APIs.

```jsx
useEffect(() => {
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
}, []);
```

| Dependencies | When setup runs |
| --- | --- |
| omitted | after every render |
| `[]` | once after mount (twice in dev StrictMode) |
| `[a, b]` | after mount and whenever `a` or `b` changes (`Object.is`) |

The **cleanup** function runs before the next setup and on unmount.

## Fetching data safely

Responses can arrive out of order. Ignore stale results with a flag or abort the request:

```jsx
useEffect(() => {
  const controller = new AbortController();
  fetch(`/api/users/${id}`, { signal: controller.signal })
    .then((response) => response.json())
    .then(setUser)
    .catch((error) => {
      if (error.name !== 'AbortError') setError(error);
    });
  return () => controller.abort();
}, [id]);
```

> In real apps prefer a data library (TanStack Query, SWR) or your framework's loaders. Effects are the low-level primitive.

## Old way: lifecycle methods

Class components split this logic across `componentDidMount`, `componentDidUpdate` and `componentWillUnmount`. Effects group it by *concern* instead of by *lifecycle moment*.
