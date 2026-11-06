# ZoneJS in Legacy Applications

An existing Angular application may use a different rendering scheduler from a new Angular 22 application. ZoneJS-based scheduling is still relevant when maintaining such code. The task is to identify the application's configuration and update boundaries, rather than assuming every Angular project behaves like a newly generated one.

You need: [Zoneless Change Detection](/angular/zoneless-change-detection), [OnPush and Eager Strategies](/angular/onpush-and-eager-strategies).

## What ZoneJS observes

ZoneJS patches asynchronous browser APIs so Angular can learn that work such as an event, timer or promise callback has completed. Angular can then run change detection because some state might have changed. The patch reports activity; it does not identify the exact application value that changed or compare every field for you.

A legacy component might update an ordinary field in a timer and rely on the surrounding zone to trigger a later check. Moving that code into a zoneless application removes the implicit notification. The assignment is still valid JavaScript, but the displayed result may remain stale.

ZoneJS is not AngularJS's digest loop. AngularJS watchers and Angular's component views belong to different rendering models, even when both older codebases use plain fields heavily.

## Identify the bootstrap mode

Inspect the actual bootstrap providers and polyfills. An Angular 22 application can opt into zone-based scheduling with `provideZoneChangeDetection()`, alongside a loaded ZoneJS runtime. Do not add the provider to a zoneless application simply because an old tutorial includes it.

```ts
import { provideZoneChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';

bootstrapApplication(App, {
  providers: [provideZoneChangeDetection({ eventCoalescing: true })],
});
```

This is a maintenance example, not a prerequisite for new Angular code. Coalescing reduces redundant scheduling from related work; it is not permission to leave update ownership unclear.

Change-detection strategy is a separate choice. An application can combine zone-based scheduling with OnPush components. Conversely, an Eager component in a zoneless application does not install ZoneJS or restore patched callback notifications.

## NgZone integration boundaries

Legacy integrations often use `NgZone.runOutsideAngular()` for frequent work that should not trigger application checks, such as high-frequency library events. They re-enter with `NgZone.run()` when an application-visible result is ready. These boundaries express zone participation; they are not a replacement for signal ownership or a component's input contract.

During migration, inspect what the callback actually changes. A template-consumed signal provides a zoneless notification. A manual subscription that assigns a plain field may need `markForCheck()` or a different rendering integration. Avoid wrapping every method in `run()` as a universal repair.

## Migrate one boundary at a time

Start with a list of asynchronous boundaries: timers, manual subscriptions, browser observers, sockets and third-party callbacks. For each one, record where its result enters component state and how Angular is notified. Prefer explicit signal updates or `AsyncPipe` where the data model fits.

Run component tests under the same scheduler as production. Exercise a callback directly and await stabilization without forcing a manual check. Then check a real browser flow, because an unrelated click during manual testing can conceal a missing notification.

Only remove the ZoneJS provider and runtime after the application and its dependencies work under zoneless scheduling. Test authentication callbacks, error states and loading indicators as well as the successful path. A rendering migration is complete when every relevant update has a reliable notification path.

## Common mistakes

- Assuming an installed ZoneJS package proves that it is the active scheduler. Inspect the loaded runtime and bootstrap configuration.
- Treating OnPush as a synonym for zoneless. Strategy and scheduling solve different parts of rendering.
- Replacing notifications with arbitrary delays, which can make timing-dependent failures harder to reproduce.
- Removing ZoneJS before auditing third-party callbacks and then relying on user clicks to refresh stale views.

## In practice

Keep the scheduler decision at bootstrap and adaptation at integration boundaries. Document why any zone-based configuration remains, which dependencies require it, and the tests that protect a future migration. New components can still use clear signal and input ownership while the wider application is being modernized.

## Check yourself

1. What does ZoneJS report, and what does it not know about application state?
2. Can an OnPush component run in a zone-based application?
3. Which asynchronous boundaries should be tested before removing ZoneJS?
