# Calling the API with HttpClient and httpResource

A Spring back end speaks JSON over HTTP, and an Angular front end turns that JSON into screens. This lesson shows the two ways Angular 22 reads from an API, the typed `HttpClient` service and the signal-based `httpResource`, after a short tour of the Angular pieces the rest of the module relies on. Every lesson here ends in a graded challenge that runs against a fake `/api/*` server inside the browser, so no real server is needed.

You need: Interfaces and Generics, Exceptions in Depth.

## The Angular pieces you need

Angular code is TypeScript, where a type follows the name: `name: string`. A **component** is a class with a template. A **signal** is a value that tells Angular when it changes; templates read it by calling it. A **computed** is a signal derived from others. `inject()` asks Angular for a service.

```ts
import { Component, computed, inject, Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class Greeter {
  greet(name: string): string {
    return `Hello, ${name}`;
  }
}

@Component({
  selector: 'app-hello',
  template: `<p>{{ message() }}</p>`,
})
export class Hello {
  private readonly greeter = inject(Greeter);
  protected readonly name = signal('Ada');
  protected readonly message = computed(() => this.greeter.greet(this.name()));
}
```

Applications are zoneless by default since Angular 21, so signals are how the screen learns that something changed. `providedIn: 'root'` makes one shared instance of the service for the whole application.

## The JSON contract

The server decides the shape of the response. On the Spring side a Java record is a natural response type, and Jackson turns it into a JSON object whose keys are the component names:

```java
import java.math.BigDecimal;

public record ProductResponse(long id, String name, BigDecimal price, String category) { }
```

The Angular side mirrors it as an `interface`. An interface exists only at compile time, so it documents the contract but checks nothing at run time:

```ts
export interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
}
```

Module 04 covers the controllers that return such records. Here the contract is the meeting point: when the record changes, the interface must change with it.

## HttpClient: typed requests

`HttpClient` is injectable by default. `provideHttpClient()` in the application providers is where you add features such as interceptors, and the default backend uses the browser `fetch` API. Every method takes a type argument that describes the expected body:

```ts
@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);

  getById(id: number): Observable<Product> {
    return this.http.get<Product>(`/api/products/${id}`);
  }
}
```

The generic is a promise you make to the compiler. If the server sends a different shape, the code still compiles and the error surfaces later, wherever a missing field is read.

The result is an `Observable`, and it is **cold**: nothing is sent until someone subscribes. A request that is built and never subscribed to is silently skipped. Failures arrive on the error channel as an `HttpErrorResponse` with a numeric `status`; status `0` means no HTTP answer arrived at all.

## httpResource: requests as signals

For reads that feed a template, `httpResource` is shorter. It takes a function that returns the request, runs it eagerly, tracks every signal the function reads, and sends a new request when one of them changes. A request that is still pending is cancelled first.

```ts
protected readonly query = signal('');

protected readonly products = httpResource<Product[]>(
  () => ({ url: '/api/products', params: { q: this.query() } }),
  { defaultValue: [] },
);
```

The resource exposes signals: `isLoading()`, `error()`, `hasValue()`, `value()` and the method `reload()`. `defaultValue` removes `undefined` from the type of `value()`. Reading `value()` while the resource is in its error state throws, so a template checks loading first, then the error, and only then the data:

```html
@if (products.isLoading()) {
  <p role="status">Loading products…</p>
} @else if (products.error()) {
  <p role="alert">Could not load products</p>
  <button type="button" (click)="products.reload()">Retry</button>
} @else {
  @for (product of products.value(); track product.id) {
    <li>{{ product.name }}</li>
  }
}
```

Use `httpResource` for reads. A POST, PATCH or DELETE is an action, not a value, so it stays with `HttpClient`.

## Common mistakes

- Calling `this.http.get(...)` and never subscribing. The observable is cold, so no request leaves the browser and nothing in the console says why.
- Reading `value()` before checking `error()`. In the error state the read throws and the whole template fails instead of showing a message.
- Trusting the generic as validation. `get<Product>` does not check the body, so a renamed field on the server shows up as a blank screen or `undefined`, not as a compile error.
- Building the query by hand with `?q=${text}` instead of `params`. A value such as `a&b` then breaks the URL.

## In practice

Teams usually put each resource behind a small service that owns the URLs and types, and let components use `httpResource` for reads and the service for writes. Keeping the TypeScript interface next to a note about the Java record it mirrors makes contract drift easy to spot in code review, and lesson 05 shows how to generate those types from the server's own description.

## Check yourself

1. Why does a call to `http.post(...)` with no `subscribe` never reach the server?
2. What does `httpResource` do when a signal read inside its request function changes while a request is pending?
3. In what order should a template check `isLoading()`, `error()` and `value()`, and why?
