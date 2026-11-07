Before starting, complete the previous lessons of this module.

State code is the easiest code in an application to test well, because it has no DOM: inputs go in through methods, outputs come out through signals. A small set of habits gives fast tests that catch most state bugs.

## What to test, by layer

| Unit | Test |
| --- | --- |
| Reducer or updater | given state and action, the exact next state; pure, no TestBed |
| Selector or `computed` | given state, the derived value; also the memoized projector |
| Signal service or SignalStore | methods change signals; derived values follow |
| Facade | use cases: loading, success, error paths, with faked API |
| Effect or `rxMethod` | the stream: cancellation, retry, ordering |
| Integration | API fake → store → component text |

Test **behavior through the public API**, not private fields. A test that reads `store.items()` after `store.add()` survives a refactor; one that checks an internal array does not.

## Services and stores

Use `TestBed.inject` with fakes provided for the tokens the store injects:

```ts
TestBed.configureTestingModule({
  providers: [{ provide: TODO_API, useValue: { list: vi.fn().mockResolvedValue(items) } }],
});
const store = TestBed.inject(TodosStore);
await store.load();
expect(store.items()).toEqual(items);
```

Inject collaborators through **tokens** so tests (and the server) can replace them: HTTP, storage, clocks, id generators.

## Async, cancellation and concurrency

Control timing instead of sleeping: return a promise you resolve by hand, or an Observable driven by a `Subject`. Then write the awkward tests deliberately:

- an older response arrives after a newer one (the newer must win);
- a second submit during a pending save (ignored or queued as designed);
- a failure after an optimistic change (the rollback restores only that item);
- a retry that succeeds on the third attempt.

For HTTP use `provideHttpClientTesting` and `HttpTestingController`, and call `verify()` to assert nothing unexpected happened.

## Signals in tests

Reading a signal is synchronous. Anything driven by an `effect` or a `resource` needs the Angular scheduler to flush: use `TestBed.tick()` or wait for stability before asserting. Prefer asserting on derived `computed` values over effects, since `computed` needs no flushing.

## Persistence, URL and hydration

- Persistence: provide an in-memory storage, assert the written envelope, then create a new store from that storage to prove the round trip, including old versions and corrupt text.
- URL state: `provideRouter` and `Router.navigateByUrl`, then assert the parsed signal and `router.url`.
- Hydration and SSR: assert initial state is deterministic and that browser-only reads sit behind injection.

## Component tests

Render the component with a **fake facade or store** and assert on what the user sees: text, roles, disabled buttons. Keep one integration test per feature that uses the real store and a fake API.

## Common mistakes

- Testing internals: private fields, call order of unrelated methods.
- `setTimeout` waits that make tests slow and flaky.
- One giant test for a whole feature.
- Mocking the store inside its own tests.
- Never testing the failure path.

## When to choose it

Write the unit tests of reducers, selectors and stores first; they are cheap and pin the behavior. Add integration tests for the flows where several layers must agree.
