## Lazy loading routes

Every component you import statically ends up in the **initial bundle**, even pages most users never open. Lazy loading tells the build tool to split a route into its own chunk and download it only when the user navigates there. The initial download gets smaller and the app becomes interactive sooner.

### loadComponent: one lazy page

```ts
export const routes: Routes = [
  { path: '', component: Home },
  {
    path: 'reports',
    loadComponent: () => import('./reports/reports').then((m) => m.Reports),
  },
];
```

The dynamic `import()` is the split point. esbuild (the Angular CLI builder) emits `reports-[hash].js`, fetched on first visit.

If the file has a **default export**, the `.then()` is optional:

```ts
// reports.ts
@Component({ ... })
export default class Reports {}

// routes
{ path: 'reports', loadComponent: () => import('./reports/reports') }
```

### loadChildren: a lazy feature area

A whole section with its own child routes is lazy loaded with `loadChildren`, which resolves to a `Routes` array:

```ts
// admin/admin.routes.ts
export default [
  { path: '', component: AdminHome },
  { path: 'users', component: AdminUsers },
] satisfies Routes;

// app.routes.ts
{
  path: 'admin',
  canMatch: [adminGuard],
  providers: [AdminApi],
  loadChildren: () => import('./admin/admin.routes'),
}
```

- `providers` on a route creates an **environment injector** for that subtree: services scoped to the feature.
- `canMatch` runs **before** loading. A user without permission never downloads the admin chunk. `canActivate` would download first and then refuse.

### Legacy: lazy NgModules

```ts
{ path: 'admin', loadChildren: () => import('./admin/admin.module').then((m) => m.AdminModule) }
```

The feature module imported `RouterModule.forChild(routes)`. Even older versions used a magic string: `loadChildren: './admin/admin.module#AdminModule'`, removed in Angular 10. Standalone apps lazy load components and route arrays directly.

### Preloading

Lazy chunks are loaded on demand, which can make the first click on a lazy route feel slow. A **preloading strategy** downloads lazy chunks in the background after the app starts:

```ts
provideRouter(routes, withPreloading(PreloadAllModules));
```

- `NoPreloading` (default): load on navigation only.
- `PreloadAllModules`: load every lazy route once the app is idle.
- Custom strategies implement `PreloadingStrategy`, for example preloading only routes with `data: { preload: true }`, or using a library like `ngx-quicklink` that preloads routes whose links are visible.

Routes protected by `canMatch` are never preloaded, because the guard needs to pass first.

### Lazy routes vs @defer

`@defer` (covered in the templates module) lazy loads **parts of a template** inside a page: a heavy chart below the fold, a comments widget. Lazy routes split **pages**. Use both: lazy routes for navigation boundaries, `@defer` for expensive content within a page.

### Pitfalls

- A static `import { Reports } from './reports'` anywhere in an eager file pulls the component back into the main bundle and silently defeats lazy loading.
- Chunk loading can fail (deploy replaced old files, offline user). Handle `NavigationError` with `withNavigationErrorHandler()` and offer a reload.
- Do not over-split tiny pages: each chunk adds a network round trip. Split by feature area.
