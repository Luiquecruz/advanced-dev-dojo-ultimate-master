Before starting, complete [Server-side rendering](/angular/ssr-and-hydration) in the Angular track.

With server-side rendering (SSR) the same Angular code runs twice: on a server to produce HTML, and in the browser to take over that HTML (hydration). State creates three new problems: state must not leak between requests, data fetched on the server should not be fetched again, and the first browser render must match what the server produced.

## One server, many users

A server process handles many requests. Any value stored in a **module-level variable** or a `providedIn: 'root'` service that is shared across requests would be visible to different users. Angular avoids this for you in one way: each server render creates a **new application instance**, so root-provided services are created per request. The danger is code that bypasses it:

```ts
// Shared by every request on the server: a data leak between users.
let currentUser: User | null = null;

@Injectable({ providedIn: 'root' })        // per request: safe
export class SessionStore { /* ... */ }
```

Rules: keep state in injectable services, never in module-level mutable variables, and never store request data in a static field.

## Browser-only APIs

`window`, `document` (directly), `localStorage` and `IndexedDB` do not exist on the server. Inject `DOCUMENT` and use a storage token (see the persistence lesson), or run browser-only code in `afterNextRender`, which executes only in the browser. Check the platform with `isPlatformBrowser(inject(PLATFORM_ID))` when you must branch.

## Transferring data to the browser

Without help, the browser would fetch the same data again after hydration and flash a loading state. `TransferState` carries serializable values from the server to the client:

```ts
const KEY = makeStateKey<Product[]>('products');

load() {
  const cached = this.transferState.get(KEY, null);
  if (cached) return of(cached);
  return this.http.get<Product[]>('/api/products').pipe(
    tap((products) => { if (isPlatformServer(this.platformId)) this.transferState.set(KEY, products); }),
  );
}
```

`HttpClient` does most of this automatically once client hydration is enabled: it records GET responses made on the server and replays them in the browser. A `resource` accepts an `id` option for the same purpose: use an identical id on both sides. `TransferState` stores **serialized** values, so only JSON-compatible data fits: no functions, class instances, `Map`, `Set` or `Date` objects. Watch the payload size, since everything is embedded in the HTML.

## Hydration and initial state

Hydration reuses the server DOM. The first browser render must produce the same DOM, so the initial state must be identical on both sides. A signal initialized from `Math.random()`, the current time or `localStorage` produces a **mismatch**. Start with a deterministic value on both sides and apply browser-only values after hydration in `afterNextRender`.

```ts
theme = signal<'light' | 'dark'>('light');            // same on server and client

constructor() {
  afterNextRender(() => this.theme.set(readStoredTheme()));
}
```

## State libraries under SSR

A store provided in root is per request on the server and rehydrated per browser. If the store holds data fetched on the server, transfer it: NgRx Store can be seeded from `TransferState` in a meta reducer, and a SignalStore can read from it in its init hook. Avoid persisting plugins that touch `localStorage` during server rendering.

## Common mistakes

- Module-level mutable state on the server.
- Reading `localStorage` or `window` in a constructor or field initializer.
- Starting from time or random values, causing a hydration mismatch.
- Putting non-serializable values or very large payloads into `TransferState`.
- Fetching the same data twice because nothing was transferred.

## When to choose it

Enable SSR when first-load speed and indexable content matter. Design state as if two executions will share nothing: deterministic initial values, data transferred explicitly, browser APIs behind injection.
