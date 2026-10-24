## What is Angular?

Angular is a **batteries-included framework** for building web applications with TypeScript. Where React or Vue give you a view layer and let you pick the rest, Angular ships a coherent toolbox maintained by one team at Google:

- a component model with HTML templates compiled ahead of time,
- **signals** for fine-grained reactive state,
- a hierarchical **dependency injection** system,
- a router, forms (template-driven, reactive and the new Signal Forms), an HTTP client, animations, i18n and testing utilities,
- the **Angular CLI** that generates, builds, serves and tests projects.

Because everything is designed together, large teams get consistent code and predictable upgrades: every major version ships with automated `ng update` migrations.

## The Angular CLI

```bash
npm install -g @angular/cli
ng new shop            # create a workspace + application
cd shop
ng serve               # dev server with hot reload (Vite + esbuild under the hood)
ng generate component product-card   # or: ng g c product-card
ng test                # unit tests (Vitest is the default runner for new projects)
ng build               # optimized production build
```

`ng generate component product-card` creates `product-card.ts`, `product-card.html`, `product-card.css` and `product-card.spec.ts`. Since **Angular 20** the official style guide dropped the `.component` / `.service` suffixes: the file is `product-card.ts` and the class is `ProductCard`.

## A minimal application

```ts
// main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';

bootstrapApplication(App, appConfig);
```

```ts
// app/app.config.ts
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners(), provideRouter(routes)],
};
```

```ts
// app/app.ts
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `<h1>Hello, {{ title() }}</h1>`,
})
export class App {
  protected readonly title = signal('shop');
}
```

No `NgModule` anywhere: the root component is bootstrapped directly and application-wide services are registered as **providers** in `appConfig`.

## From AngularJS to the signals era

| Era | Highlights |
| --- | --- |
| AngularJS 1.x (2010) | JavaScript MVC, `$scope`, dirty checking. End of life in 2021. Not the same framework. |
| Angular 2–13 (2016–2021) | Rewritten in TypeScript. `NgModule`s, decorators (`@Input`, `@Output`), RxJS everywhere, change detection through **zone.js**. |
| Angular 14–17 | Standalone components, typed forms, `inject()`, **signals** (v16), built-in control flow `@if`/`@for` and `@defer` (v17), esbuild + Vite builder, angular.dev. |
| Angular 18–20 | Signal-based `input()`, `model()`, `output()` and queries, `linkedSignal`, `resource`, standalone by default (v19), new file naming (v20). |
| Angular 21–22 | **Zoneless** change detection by default, Signal Forms, Vitest by default, `OnPush` as the default change detection strategy (the old `Default` strategy is renamed `Eager`), stable `resource()` and `httpResource()`. |

## Legacy vs modern at a glance

| Concern | Legacy Angular | Modern Angular |
| --- | --- | --- |
| Organizing code | `@NgModule({ declarations, imports })` | standalone components with `imports: [...]` |
| Component inputs | `@Input() name!: string` | `name = input.required<string>()` |
| Events | `@Output() saved = new EventEmitter()` | `saved = output<Item>()` |
| Template logic | `*ngIf`, `*ngFor`, `[ngSwitch]` | `@if`, `@for (...; track ...)`, `@switch` |
| Reactivity | zone.js patches every async API | signals notify Angular exactly what changed |
| DI | constructor parameters | `inject(Service)` |

You will still meet the legacy column in real projects, so this track covers both. A dedicated **Legacy Angular** module at the end explains NgModules, decorator inputs and structural directives in depth.

## How this track runs your code

Every challenge compiles your TypeScript in the browser with Angular's JIT compiler and renders it with `TestBed`, zoneless, exactly like a modern Angular unit test. Templates are always **inline** (`template:`), because the playground has no separate HTML files.

## When to choose Angular

Angular shines for long-lived, large applications built by teams: enterprise dashboards, back-office tools, banking and insurance portals, admin consoles. Its opinions (DI, TypeScript, CLI, strict structure) cost a little more up front and pay back in consistency. For a tiny static site, a lighter tool may be enough.
