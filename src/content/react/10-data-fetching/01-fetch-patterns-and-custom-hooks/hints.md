Inside the effect: `const controller = new AbortController();` then `fetch(url, { signal: controller.signal })`, and finally `return () => controller.abort();`.
---
Check the status before parsing: `.then((response) => { if (!response.ok) throw new Error(...); return response.json(); })`. Throwing inside `.then` sends you to `.catch`.
---
In `.catch((error) => ...)`, return early when `error.name === 'AbortError'`; otherwise `setState({ data: null, error, isLoading: false })`.
---
In `UserList`, use early returns: `if (isLoading) return <p>Loading users...</p>;`, then the error branch, then `data.map((user) => <li key={user.id}>{user.name}</li>)`.
