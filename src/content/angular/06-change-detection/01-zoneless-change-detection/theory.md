# Zoneless Change Detection

Changing a JavaScript value and updating the DOM are different operations. Angular must know that a view may have changed before it can evaluate bindings and write the new result. In Angular 22, zoneless scheduling is the default: Angular receives notifications from its own APIs rather than asking ZoneJS to report broad asynchronous activity.

You need: [signal, computed & effect](/angular/signal-computed-effect), [Event Binding](/angular/event-binding), [Services and inject()](/angular/services-and-inject).

## State, notification and rendering

A useful sequence has three steps: application code changes state, Angular receives a notification, and a scheduled render checks the affected views. A signal read by a template provides the connection between the first two steps:

```ts
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-status',
  template: '<p>{{ status() }}</p>',
})
export class Status {
  readonly status = signal('Waiting');

  receive(message: string) {
    this.status.set(message);
  }
}
```

The template reads `status()`. Updating that signal notifies Angular that the consuming view needs attention. A callback from an external library can call `receive()` without needing a global patch around the library. The notification schedules work; it does not make every DOM binding update synchronously inside `set()`.

By contrast, assigning `this.status = 'Ready'` to an ordinary field inside an unrelated timer callback supplies no zoneless notification. The value can change while the rendered text remains stale. A later click may happen to refresh the view, which makes this bug look intermittent.

## APIs that notify Angular

Angular recognizes several explicit notifications:

- Updating a signal that a template reads.
- Running a bound template or host listener.
- Setting an input with `ComponentRef.setInput()`.
- Calling `ChangeDetectorRef.markForCheck()`; `AsyncPipe` does this when it receives a value.

These are alternatives, not a checklist to apply on every update. Prefer a signal for component state and `AsyncPipe` for an observable rendered in a template. Use `markForCheck()` when adapting code that must keep ordinary fields.

```ts
import { ChangeDetectorRef, inject } from '@angular/core';

export class LegacyStatus {
  private readonly changeDetector = inject(ChangeDetectorRef);
  status = 'Waiting';

  receive(message: string) {
    this.status = message;
    this.changeDetector.markForCheck();
  }
}
```

`markForCheck()` asks Angular to schedule and check the view; it is not the same as manually invoking `detectChanges()` after every assignment.

## Bootstrap and library compatibility

Angular 22 applications are zoneless by default. `provideZonelessChangeDetection()` is available when an explicit provider makes a test or bootstrap configuration clearer. Ensure the application does not instead opt into `provideZoneChangeDetection()`.

Removing ZoneJS is not a substitute for reviewing notification paths. Check callbacks from chart libraries, sockets and manual subscriptions. A library that only assigns a plain field after asynchronous work may depend on the old scheduler. Adapt that boundary rather than adding arbitrary timers or unrelated clicks.

## Test the notification path

In a component test, call the asynchronous boundary or public callback, then await `fixture.whenStable()` and inspect the DOM. Calling `fixture.detectChanges()` immediately after every update can hide a missing production notification. The platform's Angular `render()` helper enables automatic detection and provides `stable()` for waiting.

## Common mistakes

- Assuming that a timer callback or fulfilled promise automatically announces a plain-field change in a zoneless application.
- Treating a signal write as a synchronous DOM operation. Test the visible result after Angular becomes stable.
- Copying old bootstrap providers without noticing that they restore ZoneJS-based scheduling.
- Manually checking every view to make a test pass instead of fixing the missing notification at its source.

## In practice

Trace an external update from its callback to the state used by the template. Keep the notification close to that update. A signal or `AsyncPipe` often makes the path explicit and testable without coupling the component to a particular timing mechanism.

## Check yourself

1. Which part is missing when a callback changes a plain field but the DOM stays stale?
2. Why can a test that always calls `detectChanges()` conceal a zoneless bug?
3. Which APIs can notify Angular without ZoneJS?
