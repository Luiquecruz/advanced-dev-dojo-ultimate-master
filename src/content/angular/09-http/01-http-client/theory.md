## HttpClient

`HttpClient` is Angular's HTTP API. It wraps the browser's networking (`fetch` by default in modern versions, `XMLHttpRequest` before), parses JSON, supports interceptors and is easy to fake in tests.

### Setup

```ts
export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient()],
};
```

Legacy apps imported `HttpClientModule` in an NgModule. It is deprecated: use `provideHttpClient()` with feature functions such as `withInterceptors()` and `withFetch()`.

### Requests return cold Observables

```ts
@Injectable({ providedIn: 'root' })
export class TodoService {
  private readonly http = inject(HttpClient);

  getAll() {
    return this.http.get<Todo[]>('/api/todos');
  }

  add(title: string) {
    return this.http.post<Todo>('/api/todos', { title });
  }

  remove(id: number) {
    return this.http.delete<void>(`/api/todos/${id}`);
  }
}
```

- The generic (`<Todo[]>`) types the parsed JSON. It is **not** runtime validation.
- Bodies are serialized to JSON with the right `Content-Type`.
- Nothing happens until someone **subscribes**, and every subscription sends a new request. Two `async` pipes on the same observable mean two requests.
- The observable emits once and completes, so a simple `subscribe` does not leak. Unsubscribing early **cancels** the request.

### Options

```ts
this.http.get<Post[]>('/api/posts', {
  params: { userId: 2 },                 // → /api/posts?userId=2
  headers: { Accept: 'application/json' },
  observe: 'response',                   // HttpResponse with status and headers
});
```

`responseType: 'text' | 'blob' | 'arraybuffer'` handles non-JSON payloads. `reportProgress` plus `observe: 'events'` exposes upload/download progress.

### Consuming the data in components

Keep HTTP in services and expose simple methods. In the component, push results into signals:

```ts
protected readonly todos = signal<Todo[]>([]);

constructor() {
  this.todoService.getAll().subscribe((todos) => this.todos.set(todos));
}
```

Alternatives:

- `toSignal(this.todoService.getAll(), { initialValue: [] })` for read-only data;
- `httpResource<Todo[]>(() => '/api/todos')` (Angular 19.2+), a signal-based resource with `value()`, `isLoading()`, `error()` and `reload()`, that refetches when signals it reads change. Ideal for reads; mutations (POST/PATCH/DELETE) stay with `HttpClient`.

After a mutation, prefer the **server response** (with its generated id) over guessing the new state locally.

### Testing

```ts
TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
const http = TestBed.inject(HttpTestingController);

service.getAll().subscribe(spy);
http.expectOne('/api/todos').flush([{ id: 1, title: 'Test', completed: false }]);
http.verify();
```

`provideHttpClientTesting()` must come **after** `provideHttpClient()`.

### Pitfalls

- Calling an HTTP method without subscribing (common with "fire and forget" saves).
- Subscribing in a template-bound getter: a new request on every change detection.
- Nesting subscribes for dependent requests. Compose with RxJS operators (`switchMap`, `forkJoin`) instead.
