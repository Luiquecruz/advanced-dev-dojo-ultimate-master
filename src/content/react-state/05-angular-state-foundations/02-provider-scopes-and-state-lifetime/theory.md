Before starting, complete [Hierarchical injectors](/angular/hierarchical-injectors) in the Angular track. The next module builds signal services on these scopes.

A state service is only as shared as its **provider scope**. The same class can be one application-wide instance, one instance per route, or one per component, and the choice decides how long the state lives and who sees it.

## Three scopes

```ts
// 1. Root: one instance for the whole app, created on first inject.
@Injectable({ providedIn: 'root' })
export class SessionStore {}

// 2. Route: one instance for a route subtree, destroyed when the route is removed.
export const routes: Routes = [
  { path: 'orders', providers: [OrdersStore], loadChildren: () => import('./orders.routes') },
];

// 3. Component: one instance per component instance, destroyed with it.
@Component({ selector: 'app-editor', providers: [EditorState], template: '' })
export class Editor {}
```

A service **without** `providedIn` can only be injected where something lists it in `providers`. That is the clue the scope is deliberate.

## How lookup works

`inject(Token)` walks up from the requesting component: its own `providers`, then its parents' element injectors, then the environment injector chain (route, then root). The nearest provider wins. Two sibling components that each list `providers: [EditorState]` get two separate instances; their children share the instance of the nearest ancestor that lists it.

## Lifetime follows the scope

| Scope | Created | Destroyed | Good for |
| --- | --- | --- | --- |
| Root | first `inject` | when the app is destroyed | session, theme, permissions, cart |
| Route | when the route is activated | when the route is deactivated for good | a feature's list, filters and selection |
| Component | with the component | with the component | an editor's draft, a wizard's steps, widget-level state |

The difference matters on navigation. Root state survives it; route state is rebuilt when a user leaves and returns; component state is rebuilt whenever the component is created again. If a filter should be remembered after the user leaves the page, root or the URL owns it. If it should reset, route or component scope gives you that for free.

## Lazy routes and accidental globals

A service provided in a lazy route's `providers` is created in that route's injector, not the root one, and it exists only while the route is loaded. The common mistake is the opposite: marking everything `providedIn: 'root'` "so it just works". Then a wizard's half-finished state leaks into the next wizard because the instance never dies.

## Cleanup

Component and route scoped services can use `DestroyRef`, or `ngOnDestroy`, to stop their own work. Root services never get destroyed during normal use, so they must not hold subscriptions that grow forever.

## Common mistakes

- Providing the same store in both `providedIn: 'root'` and a component's `providers`, then wondering which instance a child gets. The nearest provider wins.
- Expecting component-scoped state to survive a route change.
- Putting a service in `providers` of a component and injecting it from a **sibling** or parent, which does not see that instance.
- Making state global to avoid passing an input one level down.

## When to choose it

Default to the narrowest scope that covers every reader. Choose root only for state that is truly application-wide and must outlive every screen. For per-instance editors, dialogs and wizards, a component provider gives isolation without any reset code.
