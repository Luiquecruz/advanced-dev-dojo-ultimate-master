## Async UI needs async tests

Data arrives later than the first render. A test that asserts immediately sees the loading state and fails, or worse, passes while the real bug happens after it ends. Testing Library gives you three tools to **wait for the UI**, never for arbitrary timeouts.

```jsx
// findBy* = getBy* + waitFor: returns a Promise
expect(await screen.findByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument();

// waitFor retries the callback until it stops throwing (default timeout 1000 ms)
await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));

// waits until an element disappears
await waitForElementToBeRemoved(() => screen.queryByText('Loading...'));
```

Rules of thumb:

- Use `findBy*` to wait for something to **appear**.
- Use `waitFor` for assertions that are not a query (a mock was called, a value changed). Put **one** assertion inside, and never side effects like clicks.
- Never `await sleep(500)`: slow on fast machines, flaky on slow ones.

## The `act(...)` warning

React batches updates and runs effects asynchronously. `act()` flushes them so the DOM is up to date before you assert. Testing Library already wraps `render`, `user-event` and its async utilities in `act`. If you see *"An update to X inside a test was not wrapped in act(...)"*, an update happened **after** your test stopped waiting: add a `findBy`/`waitFor` for the final state rather than wrapping things in `act` by hand.

## Test doubles

A **mock function** records calls and can return canned values:

```js
const onSelect = vi.fn();                    // jest.fn() in Jest
render(<UserList onSelect={onSelect} />);
await user.click(await screen.findByRole('button', { name: 'Ada Lovelace' }));
expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));

const fetchUser = vi.fn().mockResolvedValue({ id: 1, name: 'Ada' });
```

Ways to control dependencies, from most to least realistic:

| Technique | Example | Notes |
| --- | --- | --- |
| Network mock | MSW `http.get('/api/users', () => HttpResponse.json([...]))` | Component code untouched; best default |
| Spy on a global | `vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(...))` | Quick, but couples tests to `fetch` |
| Module mock | `vi.mock('./api', () => ({ getUsers: vi.fn() }))` | Hoisted to the top; replaces a whole module |
| Dependency injection | `<UserList loadUsers={fakeLoad} />` | Explicit, no magic; changes the component API |

In the Dojo, `mockApi(path, handler)` plays the role of MSW: it overrides one route of the fake API for the current test, and `fn()` is the mock function.

## Test the unhappy paths

`fetch` only rejects on **network** failures. A `404` or `500` response resolves normally, so this code silently renders an error object as if it were data:

```js
const users = await fetch('/api/users').then((response) => response.json());
```

Check `response.ok` and throw, then cover the error state, a retry, and empty results in your tests:

```js
export async function fetchUsers() {
  const response = await fetch('/api/users');
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}
```

## Timers

For debounces and timeouts use fake timers: `vi.useFakeTimers()`, then `vi.advanceTimersByTime(300)`. With user-event, pass the clock in: `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`, and restore real timers after each test.

## Pitfalls

- Forgetting `await` on `user.click`, `findBy*` or `waitFor`: the assertion runs too early.
- Empty `waitFor(() => {})` callbacks or several assertions inside one `waitFor`: slower and harder to debug.
- Mocks leaking between tests: reset them (`vi.restoreAllMocks()`, `server.resetHandlers()` in MSW) in `afterEach`.
- Swallowing errors with `.catch(() => {})`: the UI hangs on "Loading..." forever and no test can see why.
- Asserting on how many times a component rendered: test what the user sees instead.
