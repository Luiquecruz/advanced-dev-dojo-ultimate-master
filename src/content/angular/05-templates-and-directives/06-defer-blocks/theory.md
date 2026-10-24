## Deferrable views: `@defer`

`@defer` lazily loads a part of a template. The components, directives and pipes used **only** inside the block are split into a separate JavaScript chunk by the build, downloaded when a **trigger** fires, and then rendered. It is the simplest way to shrink the initial bundle and speed up the first paint.

```html
@defer (on viewport) {
  <app-comments [postId]="post().id" />
} @placeholder (minimum 300ms) {
  <p>Comments</p>
} @loading (after 100ms; minimum 500ms) {
  <app-spinner />
} @error {
  <p>Comments failed to load.</p>
}
```

### The four blocks

| Block | Shown when | Notes |
| --- | --- | --- |
| `@defer` | The trigger fired and dependencies loaded | Main content |
| `@placeholder` | Before the trigger fires | Eagerly loaded; required for `on viewport/interaction/hover` without a reference |
| `@loading` | While dependencies download | `after` avoids flicker on fast networks, `minimum` avoids flashes |
| `@error` | Loading failed | Optional |

### Triggers

| Trigger | Fires |
| --- | --- |
| `on idle` (default) | When the browser is idle (`requestIdleCallback`) |
| `on viewport` | When the placeholder (or a referenced element) enters the viewport |
| `on interaction` | On click/keydown on the placeholder or a referenced element |
| `on hover` | On mouseenter/focusin |
| `on immediate` | Right after the non-deferred content renders |
| `on timer(2s)` | After a delay |
| `when condition` | When the expression becomes truthy (one-way: it never reverts) |

Reference an element elsewhere in the template with a template variable:

```html
<button #trigger>Show details</button>
@defer (on interaction(trigger)) { <app-details /> }
```

Combine triggers (`on viewport; on timer(5s)`: whichever comes first) and **prefetch** the code earlier than rendering it:

```html
@defer (on interaction(trigger); prefetch on idle) { <app-details /> }
```

### What actually gets deferred

- Dependencies must be **standalone** and **not referenced elsewhere** in the same file (no other template usage, no `viewChild(TheComponent)`), otherwise they are eagerly bundled.
- Everything inside the block is still part of the parent's template: inputs, outputs and signals work as usual.
- In this browser playground components are compiled JIT and never split into chunks, but the block states and triggers behave the same.

### SSR and hydration

On the server, `@defer` renders the `@placeholder` (or nothing). With **incremental hydration** (`hydrate on viewport`, `hydrate on interaction`, `hydrate never`), server-rendered content stays on screen as static HTML and its JavaScript is loaded and hydrated only when needed.

### Testing

`TestBed` renders defer blocks with `DeferBlockBehavior.Playthrough` by default: triggers work like in the browser. Switch to `Manual` to step through states yourself:

```ts
TestBed.configureTestingModule({ deferBlockBehavior: DeferBlockBehavior.Manual });
const fixture = TestBed.createComponent(Page);
const [block] = await fixture.getDeferBlocks();
await block.render(DeferBlockState.Loading);
await block.render(DeferBlockState.Complete);
```

### Legacy alternatives

Before Angular 17, lazy loading inside a template required router-level `loadChildren`/`loadComponent`, or manually calling `import('./widget').then(m => vcr.createComponent(m.Widget))`. `@defer` makes that declarative, including loading and error states.

### Pitfalls

- Deferring above-the-fold content: it causes layout shift. Defer what is below the fold or behind interaction.
- Nested `@defer` blocks with the same trigger cause cascading requests. Use different triggers.
- `when` is one-way: once loaded, the content stays even if the condition becomes false. Wrap it in `@if` for toggling.
- `on viewport` / `on interaction` without a reference need a `@placeholder` with a single root element.
