## Vitest is the default runner

Since Angular 21, `ng new` sets up **Vitest** for unit tests instead of Karma + Jasmine. The `test` target uses the `@angular/build:unit-test` builder, tests run in Node with `jsdom` (or in a real browser with `--browsers=chromiumHeadless` and Playwright), and `ng test` starts watch mode.

```bash
ng test                       # watch mode
ng test --no-watch --coverage # CI run with coverage
```

Spec files still end in `.spec.ts` and use the familiar `describe` / `it` / `expect` API. Spies are `vi.fn()` and `vi.spyOn()` instead of `jasmine.createSpy()` and `spyOn()`.

## TestBed: a mini Angular app per test

`TestBed` builds a testing environment module. You import the standalone component under test, optionally override providers, then create a **fixture**:

```ts
import { TestBed } from '@angular/core/testing';
import { Greeting } from './greeting';

describe('Greeting', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Greeting],
      providers: [{ provide: UserService, useValue: { name: () => 'Ada' } }],
    });
  });

  it('greets the user', async () => {
    const fixture = TestBed.createComponent(Greeting);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Hello, Ada');
  });
});
```

The fixture gives you:

- `fixture.nativeElement`: the host DOM element to query.
- `fixture.componentInstance`: the class instance.
- `fixture.componentRef.setInput('name', 'Ada')`: sets a signal or decorator input exactly like a parent template would.
- `fixture.debugElement.query(By.css('button'))`: Angular-aware queries, `triggerEventHandler`.
- `fixture.detectChanges()` and `fixture.whenStable()`.

`TestBed` is reset automatically between tests, so every `it` starts with a fresh injector and fresh services.

## Change detection in zoneless tests

Applications are zoneless by default, and so is TestBed. Without zone.js nothing runs change detection "magically" after a click. The recommended pattern is:

1. Act: click a button, set an input, flush an HTTP request.
2. `await fixture.whenStable()`: Angular runs change detection for the dirty views and waits for pending work (HTTP requests, `PendingTasks`).
3. Assert on the DOM.

`fixture.detectChanges()` still exists and runs a synchronous check, but `whenStable()` mirrors what really happens in the browser and also catches the classic bug of updating a plain field that never notifies Angular.

## Act like a user

Prefer assertions on what the user sees (texts, roles, attributes) over private fields. Clicking a real `<button>` element and reading its text tests the template, the bindings and the class together. Reading `componentInstance.count` only tests the class.

## Legacy: Karma, Jasmine and fakeAsync

| Karma + Jasmine | Vitest |
| --- | --- |
| `spyOn(service, 'load')` | `vi.spyOn(service, 'load')` |
| `jasmine.createSpy()` | `vi.fn()` |
| `fakeAsync` + `tick()` (needs zone.js) | `vi.useFakeTimers()` + `vi.advanceTimersByTime()` or plain `async/await` |
| Real browser per run | Node + jsdom, or Vitest browser mode |

Karma is still supported. To migrate, switch the builder to `@angular/build:unit-test`, install `vitest` and `jsdom`, and run the (experimental) refactoring schematic, reviewing its output:

```bash
ng g @schematics/angular:refactor-jasmine-vitest
```

## A test that cannot fail is worthless

A good habit is to break the code on purpose (start at 1, remove a click handler) and check that a test goes red. This is **mutation testing**, and it is exactly how your spec is graded in this lesson.

> In this sandbox there is no Vitest process, so your spec function **receives** `it`, `beforeEach` and `expect` as a parameter, plus the component to test. In a real project they are globals (or imported from `vitest`) and the component is imported directly.
