## State in a service

Not every app needs a state library. For most features, a **service that owns signals** is enough: one place holds the data, components read it, and only the service changes it.

```ts
import { Injectable, computed, signal } from '@angular/core';

export interface Todo {
  id: number;
  title: string;
  done: boolean;
}

@Injectable({ providedIn: 'root' })
export class TodoStore {
  private readonly state = signal<Todo[]>([]);

  readonly todos = this.state.asReadonly();
  readonly remaining = computed(() => this.todos().filter((todo) => !todo.done).length);

  add(title: string) {
    this.state.update((todos) => [...todos, { id: Date.now(), title, done: false }]);
  }

  toggle(id: number) {
    this.state.update((todos) => todos.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo)));
  }
}
```

A component injects the service and reads its signals in the template. Because the template calls `store.todos()`, Angular knows exactly which views depend on that signal and refreshes them when it changes, with no zone.js involved.

```ts
@Component({
  selector: 'app-todos',
  template: `
    <p>{{ store.remaining() }} left</p>
    @for (todo of store.todos(); track todo.id) {
      <li (click)="store.toggle(todo.id)">{{ todo.title }}</li>
    }
  `,
})
export class Todos {
  protected readonly store = inject(TodoStore);
}
```

## The three building blocks

- **Private writable signal**: the single source of truth. Nobody outside the service can call `set` or `update` on it.
- **Public read-only view**: `asReadonly()` returns a `Signal` without `set`/`update`. Consumers can read and react, never write.
- **Derived state with `computed()`**: counts, totals, filtered lists. They are memoized and recompute only when a dependency changes.
- **Methods as the only write path**: `add`, `toggle`, `remove`. Every state transition has a name, which makes the code easy to search and debug.

## Immutability matters

Signals compare values with `Object.is`. If you mutate an array in place and set the same reference, nothing downstream updates:

```ts
// Wrong: same array reference, computed() and the view do not refresh
this.state().push(todo);

// Right: produce a new array
this.state.update((todos) => [...todos, todo]);
```

The same applies to nested objects: copy with spread (`{ ...todo, done: true }`) instead of assigning a property.

## Scope: who shares the instance?

`providedIn: 'root'` creates **one instance for the whole app**, so every component sees the same cart, the same user, the same todos. If you need a separate copy per feature or per component, list the service in a component's `providers` array instead; each instance of that component (and its children) then gets its own store.

## Legacy way: BehaviorSubject services

Before signals, the same pattern was written with RxJS:

```ts
private readonly subject = new BehaviorSubject<Todo[]>([]);
readonly todos$ = this.subject.asObservable();

add(title: string) {
  this.subject.next([...this.subject.value, { id: Date.now(), title, done: false }]);
}
```

Templates needed the `async` pipe and derived values needed `map`/`combineLatest`. It still works and is the right tool for event streams, but for synchronous state signals are simpler: no subscriptions, no leaks, glitch-free derived values.

## When to reach for more

A signal service scales surprisingly far. Consider the NgRx SignalStore when you want a standard shape across many features (state, computed, methods, hooks, entity helpers), or the classic NgRx Store when you need an event log, devtools time travel and strict separation between "what happened" and "how state changes".
