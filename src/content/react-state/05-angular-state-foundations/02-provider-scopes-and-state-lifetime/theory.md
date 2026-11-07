Before starting, complete [Hierarchical injectors](/angular/hierarchical-injectors) in the Angular track. The next module builds signal services on these scopes.

A state service is only as shared as its **provider scope**. The same class can be one application-wide instance, one instance per route, or one per component, and the choice decides how long the state lives and who sees it.

## Three scopes

```ts
// 1. Root: one instance for the whole app, created on first inject.
@Injectable({ providedIn: 'root' })
export class SessionStore {}

// 2. Route: one instance for a route subtree, created when the route is first activated.
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
| Route | when the route is first activated | not on navigation: the route injector is cached with the route configuration and lives as long as the application | a feature's shared list, selection and services that should exist only for that feature |
| Component | with the component | with the component | an editor's draft, a wizard's steps, widget-level state |

The difference matters on navigation. Root state survives it. Component state is rebuilt whenever the component is created again. Route state is created once, on the first activation, and then **survives leaving and returning to the route**: Angular keeps the route's injector with the route configuration, so it is shared by every visit and is not destroyed on navigation. Route providers therefore scope a service to a feature, not to a visit. If a filter should be remembered after the user leaves, root, route or the URL can own it; if it must reset on every visit, give it a component provider, or reset it explicitly when the feature activates.

## Lazy routes and accidental globals

A service provided in a lazy route's `providers` is created in that route's injector, not the root one, and only once the route is first activated. That keeps feature services out of the initial bundle's startup work, but it does **not** make them short-lived: after the first visit the instance stays for the rest of the session. The common mistake is the opposite: marking everything `providedIn: 'root'` "so it just works". Then a wizard's half-finished state leaks into the next wizard because the instance never dies, and a component provider is the scope that gives each wizard a fresh one.

## Cleanup

Component-scoped services can use `DestroyRef`, or `ngOnDestroy`, to stop their own work when the component is destroyed. Route and root services are not destroyed during normal use, so they must not hold subscriptions or listeners that grow forever.

## Common mistakes

- Providing the same store in both `providedIn: 'root'` and a component's `providers`, then wondering which instance a child gets. The nearest provider wins.
- Expecting component-scoped state to survive a route change, or route-scoped state to reset on every visit.
- Putting a service in `providers` of a component and injecting it from a **sibling** or parent, which does not see that instance.
- Making state global to avoid passing an input one level down.

## When to choose it

Default to the narrowest scope that covers every reader. Choose root only for state that is truly application-wide, and route providers for services that belong to one feature but may live for the whole session. For per-instance editors, dialogs and wizards, a component provider gives isolation without any reset code.
