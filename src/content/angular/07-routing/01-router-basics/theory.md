## Client-side routing

A single-page application never asks the server for a new HTML document when the user moves around. Instead, the **Angular Router** watches the URL, finds a matching route and swaps the component rendered in a `<router-outlet>`. The browser history, the back button and deep links keep working.

### 1. Declare the routes

Routes are plain data: an array of objects that map a URL `path` to a `component`.

```ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', component: Home, title: 'Home' },
  { path: 'about', component: About, title: 'About' },
  { path: 'home', redirectTo: '', pathMatch: 'full' },
  { path: '**', component: NotFound },
];
```

- `path` has **no leading slash**. `''` is the root URL.
- `title` sets `document.title` after navigation (handled by the built-in `TitleStrategy`).
- `redirectTo` sends the user elsewhere. With an empty path, use `pathMatch: 'full'`: the default `'prefix'` strategy would make `''` match every URL.
- `'**'` is the wildcard. The router uses **first match wins**, so the wildcard must be last.

### 2. Provide the router

Standalone applications register the router through an `ApplicationConfig`:

```ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';

export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes)],
};

bootstrapApplication(App, appConfig);
```

`provideRouter()` accepts optional **features**: `withComponentInputBinding()`, `withPreloading()`, `withViewTransitions()`, `withHashLocation()`, `withInMemoryScrolling()`... Each one is tree-shakable.

### 3. Render and navigate

```ts
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <nav>
      <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Home</a>
      <a routerLink="/about" routerLinkActive="active">About</a>
    </nav>
    <router-outlet />
  `,
})
export class App {}
```

- `<router-outlet />` marks where the matched component appears.
- `routerLink` intercepts the click and navigates **without reloading** the page. A plain `href` would reload the entire app and lose all state.
- `routerLinkActive` toggles CSS classes while its link matches the current URL. Because every URL starts with `/`, the root link needs `{ exact: true }`.
- Links accept command arrays for dynamic segments: `[routerLink]="['/users', user.id]"`.

### Navigating from code

Inject the `Router` when navigation happens after some logic, such as saving a form:

```ts
private readonly router = inject(Router);

async save() {
  await this.api.save();
  this.router.navigate(['/orders', this.orderId()]);
  // or: this.router.navigateByUrl('/orders/42');
}
```

Both methods return a `Promise<boolean>` that resolves once navigation finishes (or `false` when a guard blocks it).

### Legacy vs modern

Before standalone APIs, routing lived in an `NgModule`:

```ts
@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
```

`RouterModule.forRoot()` still works, but new code uses `provideRouter()` with feature functions, and components import only the router directives they use.

### Pitfalls

- Forgetting to add `RouterOutlet` / `RouterLink` to the component `imports`: the template compiles, but `routerLink` becomes an ordinary attribute and nothing navigates.
- Writing `path: '/about'` with a leading slash: route paths are relative and must not start with `/`.
- Putting `'**'` before other routes, which hides them.
