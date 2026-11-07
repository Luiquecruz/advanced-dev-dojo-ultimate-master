Before starting, complete [signal, computed & effect](/angular/signal-computed-effect) in the Angular track and the first lessons of this path.

Some state must outlive the page: a theme, a draft, a cart. Browsers offer `localStorage` and `sessionStorage` (small, synchronous, string-only) and IndexedDB (larger, asynchronous, structured). The mechanism is easy. The discipline is hard: stored data **outlives the code that wrote it**, so a year-old value must still be readable by today's version.

## What to persist

Persist the minimum that cannot be recomputed or refetched:

- Yes: preferences, an unsent draft, an anonymous cart, onboarding progress.
- No: server data (refetch it), loading and error flags, derived values, anything secret such as tokens in plain storage.

Keep **request state apart from persisted state**. A stored `loading: true` restored after a reload leaves the app stuck.

## Choosing a store

| Storage | Capacity | Lifetime | Use |
| --- | --- | --- | --- |
| In memory (signal) | RAM | page load | everything by default |
| `sessionStorage` | about 5 MB | tab session | wizard progress |
| `localStorage` | about 5 MB | until cleared | preferences, small cart |
| IndexedDB | large | until cleared | offline data, big drafts |

Storage is shared by all scripts of the origin, readable by any XSS, and unavailable or failing in private modes and on the server. Always wrap access in `try/catch` and have a working default.

## Versioned envelopes

Store a version with the data, and write a migration for each old version:

```ts
interface Envelope { version: number; data: unknown }

function load(storage: Storage): Preferences {
  try {
    const envelope = JSON.parse(storage.getItem('prefs') ?? 'null') as Envelope | null;
    if (!envelope) return DEFAULTS;
    if (envelope.version === 1) return migrateV1(envelope.data);
    if (envelope.version === 2) return parseV2(envelope.data);
  } catch {
    // corrupt JSON falls through to the defaults
  }
  return DEFAULTS;
}
```

Never trust stored data: validate its shape (a hand-written guard or a schema library) before it enters the store. A corrupt or foreign value must reset to defaults, not crash startup.

## Writing

Write when the state changes, from the store method that changed it, or with an `effect` that reads the persisted slice. Debounce frequent writes. Write only the persisted fields:

```ts
setTheme(theme: Theme) {
  this.state.update((state) => ({ ...state, theme }));
  this.persist();
}
```

## Injecting storage

Do not reach for the global `localStorage` in a service. Inject a token that defaults to it (`memoryStorage()` is a tiny `Map`-backed object with the same methods), so tests use an in-memory fake and the server a harmless fallback:

```ts
export const STORAGE = new InjectionToken<Storage>('STORAGE', {
  providedIn: 'root',
  factory: () => {
    try {
      return inject(DOCUMENT).defaultView?.localStorage ?? memoryStorage();
    } catch {
      return memoryStorage();   // access can throw when storage is blocked
    }
  },
});
```

## Common mistakes

- Persisting everything, including loading flags and server data.
- Reading `localStorage` in a constructor that also runs on the server.
- No version, so a changed shape breaks every returning user.
- `JSON.parse` without a `try/catch`.
- Storing tokens or personal data without thinking about XSS and shared computers.

## When to choose it

Persist rarely and deliberately, each field with a reason and a version. If the server can hold the value (a user's saved preferences), prefer that to browser storage.
