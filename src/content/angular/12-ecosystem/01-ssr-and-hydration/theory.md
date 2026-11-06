## Why render on the server?

A plain client-side app ships an almost empty `index.html`; users see nothing until JavaScript downloads and runs. **Server-side rendering (SSR)** produces real HTML on the server, so content appears immediately, search engines and link previews read it, and Largest Contentful Paint improves.

```bash
ng new my-app --ssr     # new project with SSR
ng add @angular/ssr     # add SSR to an existing project
```

## Choosing a render mode per route

Angular lets every route pick its strategy in `app.routes.server.ts`:

```ts
import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },        // SSG: HTML generated at build time
  { path: 'dashboard', renderMode: RenderMode.Client },  // CSR: classic SPA
  {
    path: 'post/:id',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      const ids = await inject(PostService).getIds();
      return ids.map((id) => ({ id }));
    },
  },
  { path: '**', renderMode: RenderMode.Server },          // SSR on each request
];
```

They are registered with `provideServerRendering(withRoutes(serverRoutes))` in `app.config.server.ts`.

## Hydration

After the server HTML arrives, the browser boots Angular. Without hydration (before v16), Angular **destroyed** the server DOM and re-rendered everything, causing a flicker. **Hydration** reuses the existing DOM nodes: Angular walks the server HTML, attaches listeners and connects it to component state.

```ts
bootstrapApplication(App, {
  providers: [provideClientHydration()],
});
```

The CLI adds this for you. Constraints:

- **Server and client must produce the same DOM.** Direct DOM manipulation (`document.createElement`, `innerHTML`) and invalid HTML (`<div>` inside `<p>`, `<table>` without `<tbody>`) cause mismatch errors.
- `ngSkipHydration` on a component host opts that subtree out, as a last resort.
- `withI18nSupport()` enables hydration for i18n blocks.

## Event replay

Between "HTML visible" and "JavaScript ready" users can already click. **Event replay** records those early events with a tiny inline script and replays them once the app hydrates, so the click on "Add to cart" is not lost. It is enabled automatically together with incremental hydration; if you opt out of incremental hydration you can still add `withEventReplay()`.

## Incremental hydration

Full hydration still downloads and runs the JavaScript for the whole page. **Incremental hydration** (stable since Angular 20) keeps parts of the page as static, dehydrated HTML until a trigger fires, using `@defer` blocks with **hydrate triggers**:

```html
@defer (hydrate on viewport) {
  <app-comments />
}

@defer (hydrate on interaction) {
  <app-product-reviews />
}

@defer (on viewport; hydrate never) {
  <app-footer-links />
}
```

- The server renders the block's **main content** (not the `@placeholder`) so users see real content.
- The block's code is lazily loaded and hydrated only when the trigger fires: `on viewport`, `on interaction`, `on hover`, `on idle`, `on immediate`, `on timer(ms)`, `when condition`, or `never`.
- Events on a dehydrated block are replayed after it hydrates.

In current versions incremental hydration is on by default with `provideClientHydration()`; `withNoIncrementalHydration()` opts out.

## Writing SSR-safe code

- Browser globals (`window`, `localStorage`, `document` layout APIs) do not exist on the server. Put that code in `afterNextRender(() => ...)`, which only runs in the browser.
- Prefer injectable abstractions (`DOCUMENT`, platform-specific providers) over `isPlatformBrowser` checks, and never use them to render different templates (mismatch!).
- `HttpClient` requests made during SSR are cached into the page (**HTTP transfer cache**) and reused during hydration, so the browser does not fetch the same data twice. Tune it with `withHttpTransferCacheOptions()`.

## Legacy way

Before Angular 17, SSR was **Angular Universal** (`@nguniversal/express-engine`), with a separate `server.ts`, `ServerModule`, and destructive hydration. `@angular/ssr` replaced it with CLI-integrated SSR, prerendering, non-destructive hydration and per-route render modes.
