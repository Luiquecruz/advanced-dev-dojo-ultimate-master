# Angular release audit

Angular is enabled independently from the hidden Java and Spring Boot track. The published path contains 52 lessons across twelve consecutive stages: 45 coding challenges and seven theory-and-quiz lessons. State Management owns the four shared-state and NgRx lessons moved out of Angular; their Angular engine and lesson content remain available there.

## Scope of the public path

| Stages | Coverage |
| --- | --- |
| 01–05 | Standalone components, templates, signals, dependency injection, RxJS and directives |
| 06 | Zoneless rendering, OnPush/Eager strategies and ZoneJS maintenance |
| 07–09 | Routing, forms and HTTP |
| 10–12 | Testing, legacy Angular and SSR/hydration |

Stage 06 supplies the previously missing numbering slot with actual lessons. Stages formerly numbered 11–13 become 10–12 after shared state moves to State Management. The loader strips numeric prefixes, so the existing testing, legacy and ecosystem module ids and Angular lesson keys remain stable. State exercises use their new State Management destinations; do not link to their former Angular routes.

The new OnPush challenge tests external updates without a manual `detectChanges()` call. Its solution passes every test and its starter fails meaningful update cases. This verifies the notification boundary being taught rather than merely checking that a strategy name appears in source code. The signal-input comparison also makes clear that decorator inputs can notify zoneless Angular through bound updates and `ComponentRef.setInput()`.

## Remaining planned lessons

These six lessons are backlog, not shipping claims. Their unchecked rows remain in CURRICULUM.md.

| Stage | Planned lesson | What remains |
| --- | --- | --- |
| 02 Signals | resource | Request parameters, cancellation, resource status, reload and error handling |
| 02 Signals | httpResource | HTTP-resource parameters, typed values, status and retry/reload behavior |
| 02 Signals | RxJS interop | toSignal/toObservable lifecycle, initial values, subscriptions and timing |
| 12 Ecosystem | Angular CLI and builders | Project setup, build configuration, migrations and the development server |
| 12 Ecosystem | Accessibility and Angular Aria | Keyboard interaction, focus management and headless accessibility primitives |
| 12 Ecosystem | Performance | Rendering boundaries, @defer, stable tracking, images and measurement |

SSR/hydration, lazy-loading and harness lessons are theory-and-quiz content. They explain APIs that need an application build or external browser environment; the in-browser sandbox does not pretend to run an SSR server. Browser exercises use the registered Angular 22 APIs and fake HTTP data.

## Presentation and release boundaries

The Angular flag is enabled; Java and Vue remain hidden. Existing public hues had no free gap large enough to insert another accent with 30-degree separation. Angular first used `#f2f466` and Architecture shifted slightly to `#ffad63`; when Java and Spring Boot was published, the accents were respaced and Angular now uses the red `#ff6179` of its framework logo. Every glyph path is retained. The presentation suite verifies synchronized RGB values, AA contrast on every surface and public hue distances.

Release verification includes the complete Angular solution/starter suite, content/curriculum/date checks, application unit tests, lint, TypeScript, production build, docs sync and real-browser desktop/mobile checks. The State Management React and Angular routes are included in the integrated browser checks. Evidence and CI completion are recorded in the PR; this file does not replace current-commit checks.
