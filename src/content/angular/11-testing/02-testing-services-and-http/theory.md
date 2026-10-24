## Testing a service

Services are plain classes, so testing them is mostly about **controlling their dependencies**. `TestBed.inject()` creates the service through the real injector, with any providers you override:

```ts
beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [{ provide: Clock, useValue: { now: () => new Date('2026-01-01') } }],
  });
});

it('formats today', () => {
  const service = TestBed.inject(ReportService);
  expect(service.title()).toBe('Report 2026-01-01');
});
```

Typical replacements: `useValue` with an object of `vi.fn()` mocks, `useClass` with a fake implementation, or `useFactory`. Signal-based services are even simpler: call a method, then read the signal synchronously.

## Testing HTTP without a server

Unit tests must not hit the network. Angular ships a **testing backend** that records requests instead of sending them:

```ts
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

TestBed.configureTestingModule({
  providers: [provideHttpClient(), provideHttpClientTesting()],
});
const http = TestBed.inject(HttpTestingController);
```

Order matters: `provideHttpClient()` first, then `provideHttpClientTesting()` replaces its backend.

The flow of every HTTP test is **call, expect, flush, assert**:

```ts
it('loads a product', async () => {
  const product = firstValueFrom(service.getProduct(3));        // 1. call (subscribe!)
  const request = http.expectOne('/api/products/3');            // 2. exactly one matching request
  expect(request.request.method).toBe('GET');                   //    inspect method, body, headers, params
  request.flush({ id: 3, name: 'IDE License' });                // 3. answer it
  expect(await product).toEqual({ id: 3, name: 'IDE License' }); // 4. assert the result
});

afterEach(() => http.verify()); // fails if a request was not handled
```

Useful APIs:

- `expectOne(url | { method, url } | predicate)`: fails unless exactly one request matches.
- `expectNone(...)`: asserts no matching request was made (great for caches).
- `match(...)`: returns all matching requests.
- `request.request`: the `HttpRequest` (`method`, `body`, `headers`, `params`, `urlWithParams`).
- `request.flush(body, { status, statusText })`: responds; a 4xx/5xx status makes the observable **error** with an `HttpErrorResponse`.
- `request.error(new ProgressEvent('error'))`: simulates a network failure.
- `http.verify()`: in `afterEach`, catches unexpected extra requests.

## Pitfalls

- **Observables are lazy.** No subscription, no request: `expectOne` fails with "found none". `firstValueFrom()` or `.subscribe()` before expecting.
- **Exact URLs.** `expectOne('/api/users')` does not match `/api/users?page=2`; use a predicate or `{ url }` with `urlWithParams` in mind.
- **Forgetting `verify()`** lets duplicate or stray requests slip through.
- **Async results**: after `flush`, the value is delivered synchronously for simple pipes, but awaiting the promise is the safest pattern.

## Components that use HTTP

For a component, provide the same two functions and drive it through the DOM: render, `expectOne(...).flush(...)`, then `await fixture.whenStable()` before asserting. In zoneless apps `HttpClient` registers pending tasks, so `whenStable()` also waits for in-flight requests made with the real backend.

## Legacy way

| Before | Now |
| --- | --- |
| `imports: [HttpClientTestingModule]` (deprecated) | `providers: [provideHttpClient(), provideHttpClientTesting()]` |
| `HttpClientModule` | `provideHttpClient()` |
| Jasmine `done` callbacks inside `subscribe` | `firstValueFrom` + `async/await` |

> As in the previous lesson, your spec function receives `it`, `beforeEach`, `afterEach` and `expect`, plus the service class to test, so the grader can run it against broken versions.
