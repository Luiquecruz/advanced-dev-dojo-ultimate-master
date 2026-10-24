## Two frameworks named Angular

**AngularJS** (version 1.x, 2010) popularized two-way data binding, dependency injection and declarative HTML for single-page apps. It used plain JavaScript, `$scope`, controllers and the **digest cycle**: after every event Angular re-ran all watchers until nothing changed.

```html
<div ng-app="shop" ng-controller="CartCtrl as cart">
  <li ng-repeat="item in cart.items">{{ item.name }}</li>
  <input ng-model="cart.coupon" />
</div>
```

```js
angular.module('shop', []).controller('CartCtrl', function ($http) {
  this.items = [];
  $http.get('/api/cart').then((res) => (this.items = res.data));
});
```

It scaled poorly: thousands of watchers made the digest slow, `$scope` inheritance was confusing, and there was no component model until 1.5. **Angular 2** (September 2016) was a full rewrite in **TypeScript** with components, decorators, a hierarchical injector, RxJS and zone.js. It was not backwards compatible, which is why the old version kept the "JS" suffix. AngularJS reached **end of life on December 31, 2021**.

## Migration path from AngularJS

Teams rarely rewrote everything at once. `@angular/upgrade/static` made **hybrid apps** possible: both frameworks running side by side in one page.

- `UpgradeModule` boots AngularJS inside an Angular app.
- `downgradeComponent()` / `downgradeInjectable()` expose new Angular pieces to AngularJS templates.
- `UpgradeComponent` wraps an AngularJS component for use in Angular templates.
- Teams migrated route by route, then removed AngularJS when nothing used it.

## The modern Angular timeline

| Version | Year | Milestone |
| --- | --- | --- |
| 2 | 2016 | TypeScript rewrite, components, NgModules, zone.js |
| 4 | 2017 | Version 3 skipped to align the router package with core |
| 6 | 2018 | `ng update`, `providedIn: 'root'` |
| 9 | 2020 | **Ivy** compiler and runtime become the default |
| 14 | 2022 | Typed reactive forms, standalone components (preview) |
| 15 | 2022 | Standalone APIs stable, functional guards and interceptors |
| 16 | 2023 | **Signals** (preview), required inputs, `takeUntilDestroyed` |
| 17 | 2023 | Built-in control flow (`@if`, `@for`), `@defer`, angular.dev, Vite/esbuild builder by default |
| 19 | 2024 | Standalone by default, `linkedSignal`, `resource`, incremental hydration preview |
| 20 | 2025 | Signals APIs stable, zoneless stable, incremental hydration stable, `*ngIf`/`*ngFor` deprecated, new style guide without `.component` suffixes |
| 21 | 2025 | Zoneless by default, Vitest as the default runner, Signal Forms (experimental), Angular Aria (preview) |
| 22 | 2026 | Angular Aria stable; the version used in this course |

Angular ships a **major version every six months**, each supported for 18 months (6 active + 12 LTS). Deprecated APIs are kept for at least two majors.

## How Angular modernizes without a rewrite

The lesson of AngularJS shaped the team's strategy: never again break everyone at once.

- **Opt-in first, default later**: standalone, signals, control flow and zoneless all shipped as options, then became defaults.
- **Interop**: NgModules import standalone components and vice versa; `toSignal`/`toObservable` bridge RxJS and signals; decorator and signal inputs coexist.
- **Automated migrations**: `ng update` runs schematics on version bumps, and `ng generate @angular/core:<migration>` handles opt-in moves (`standalone`, `control-flow`, `inject`, `signal-input-migration`, `signal-queries-migration`...).
- **Deprecation before removal**, with lint rules and IDE hints.

## Recognizing the era of a codebase

- `$scope`, `ng-repeat`, `angular.module(...)`: AngularJS, needs a real migration.
- `AppModule`, `*ngIf`, constructor injection, `BehaviorSubject` services, `zone.js` in polyfills: Angular 2-16 era. Migrate incrementally with the schematics.
- Standalone components, `inject()`, signals, `@if`, `provideZonelessChangeDetection` or no zone at all: modern Angular.
