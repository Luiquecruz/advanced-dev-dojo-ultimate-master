## What NgModules were for

From Angular 2 (2016) until Angular 14, every component, directive and pipe had to be **declared in exactly one `NgModule`**. The module defined the *compilation context*: which selectors and pipes a template could use, and which providers the injector had.

```ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

@NgModule({
  declarations: [ProductListComponent, PriceTagComponent, DiscountPipe], // owned by this module
  imports: [CommonModule, SharedModule],                                  // what the templates may use
  exports: [ProductListComponent],                                        // what importers may use
  providers: [ProductService],                                            // services (legacy style)
})
export class ProductsModule {}
```

- **`declarations`**: components, directives and pipes that *belong* to the module. Their templates can use each other plus everything that the `imports` export.
- **`imports`**: other modules (or standalone components) whose **exported** declarables become available.
- **`exports`**: the public API. Anything not exported stays private to the module.
- **`providers`**: services registered in the module injector. Today `providedIn: 'root'` is preferred.
- **`bootstrap`**: only in the root module, the component to start with.

A classic app booted like this:

```ts
@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, HttpClientModule, AppRoutingModule],
  bootstrap: [AppComponent],
})
export class AppModule {}

platformBrowserDynamic().bootstrapModule(AppModule);
```

## Non-standalone components today

Since Angular 19, components are **standalone by default**. To declare one in an NgModule you must opt out explicitly:

```ts
@Component({
  selector: 'app-price-tag',
  standalone: false,
  template: `{{ price | currency }}`,
})
export class PriceTagComponent {
  @Input() price = 0;
}
```

A standalone component inside `declarations` is an error, and a non-standalone component cannot be used without a module that declares it.

## Typical patterns you will meet

- **SharedModule**: declares and re-exports common UI pieces plus `CommonModule` and `FormsModule`, imported by every feature module.
- **Feature modules** with their own `RoutingModule` and lazy loading: `loadChildren: () => import('./admin/admin.module').then((m) => m.AdminModule)`.
- **`forRoot()` / `forChild()`**: static methods returning `ModuleWithProviders` so providers are registered once (`RouterModule.forRoot(routes)`).
- **`CoreModule`** guarded against double import, holding singleton services.

## Interop: both worlds together

Migration is incremental because the two models interoperate:

- A **standalone component can import an NgModule** (`imports: [UsersModule]`) and use whatever it exports.
- An **NgModule can import a standalone component** in its `imports` array.
- Most `XxxModule`s have functional replacements: `HttpClientModule` -> `provideHttpClient()`, `RouterModule.forRoot(routes)` -> `provideRouter(routes)`, `StoreModule.forRoot` -> `provideStore()`.

## Migrating

The Angular CLI ships an automated migration that converts declarations to standalone, removes unnecessary modules and switches to `bootstrapApplication`:

```bash
ng g @angular/core:standalone
```

It runs in three passes (convert components, remove modules, bootstrap with standalone APIs), and you review and test after each one.

## Pitfalls

- **Forgetting `exports`**: the importer gets `NG0304: 'x' is not a known element` because private declarations are invisible outside the module.
- **Declaring the same component in two modules** is an error; move it to a shared module and export it.
- **Providers in lazy modules** create a *child injector*: a service listed there is a different instance from the root one.
- `CommonModule` is not inherited: each module whose templates use `*ngIf`, pipes like `uppercase` and so on must import it (or the standalone directives).
