## Hierarchical injectors

Angular does not have one injector, it has a **tree** of them. When a class calls `inject(X)`, Angular walks up that tree until some injector has a provider for `X`.

```
Platform injector
  └── Root environment injector      (providedIn: 'root', appConfig.providers)
        └── Route / lazy environment injectors   (route providers)
              
Element injectors (one per component/directive that declares providers)
  <app-root>
    └── <app-panel providers: [PanelStore]>
          └── <app-panel-button>   inject(PanelStore) → the panel's instance
```

The lookup has two phases:

1. **Element injectors**: starting at the requesting element, then its parent element, and so on up the component tree.
2. **Environment injectors**: if no element provides the token, Angular continues with the route/root/platform injectors.

If nothing is found, `inject()` throws `NG0201` (or returns `null` with `{ optional: true }`).

### Component-scoped services

Providing a service on a component creates **one instance per component instance**. It is destroyed together with the component (its `ngOnDestroy` / `DestroyRef` callbacks run), which makes it perfect for state that belongs to one widget.

```ts
@Injectable()
export class PanelStore {
  readonly open = signal(false);
  toggle() { this.open.update((value) => !value); }
}

@Component({
  selector: 'app-panel',
  providers: [PanelStore],
  imports: [PanelButton],
  template: `<app-panel-button /> @if (store.open()) { <ng-content /> }`,
})
export class Panel {
  protected readonly store = inject(PanelStore);
}

@Component({ selector: 'app-panel-button', template: `<button (click)="store.toggle()">Toggle</button>` })
export class PanelButton {
  protected readonly store = inject(PanelStore); // the nearest Panel's instance
}
```

Two `<app-panel>` elements now have two independent `PanelStore`s. Note the plain `@Injectable()`: it is **not** in root on purpose, so it can only be used under a component that provides it.

### `providers` vs `viewProviders`

- `providers`: visible to the component's own template **and** to content projected into it.
- `viewProviders`: visible only to the component's own view, not to projected content. Useful for libraries that do not want to leak internals.

### Resolution modifiers

`inject()` accepts options that change the walk:

| Option | Meaning |
| --- | --- |
| `optional: true` | Return `null` instead of throwing |
| `self: true` | Only look in the current element injector |
| `skipSelf: true` | Start from the parent (useful for nested trees: "find my parent menu") |
| `host: true` | Stop at the host component's injector |

```ts
private readonly parentMenu = inject(Menu, { skipSelf: true, optional: true });
```

Legacy code expresses the same with parameter decorators: `constructor(@Optional() @SkipSelf() parent: Menu)`.

### Environment injectors

Route `providers` and `createEnvironmentInjector()` create **environment** injectors: they hold app-level services (HTTP, router features) for a part of the app. Element injectors hold component-level state. The next lesson explores environment injectors further.

### Pitfalls

- Expecting a component-provided service to be a singleton: each component instance gets its own.
- Providing a stateful service in a *child* component when siblings should share it: provide it in the closest common ancestor.
- Using `providedIn: 'root'` for widget state: every widget would share the same state.
