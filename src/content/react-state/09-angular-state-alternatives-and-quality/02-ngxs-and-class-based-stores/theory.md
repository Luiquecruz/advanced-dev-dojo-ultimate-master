Before starting, complete the classic NgRx Store lesson of this path.

NGXS (`@ngxs/store`) is an action-based store with the same overall idea as NgRx Store (one place for state, changes through dispatched actions) and a different style: **classes and decorators** instead of functions and reducers. Learning it by comparison to NgRx shows which ideas are essential and which are conventions.

## The pieces

```ts
export class AddTodo {
  static readonly type = '[Todos] Add';
  constructor(readonly title: string) {}
}

export interface TodosModel { items: string[] }

@State<TodosModel>({ name: 'todos', defaults: { items: [] } })
@Injectable()
export class TodosState {
  @Selector()
  static items(state: TodosModel) {
    return state.items;
  }

  @Action(AddTodo)
  add(ctx: StateContext<TodosModel>, action: AddTodo) {
    ctx.setState((state) => ({ items: [...state.items, action.title] }));
  }
}
```

- An **action** is a class with a static `type` and the payload as constructor properties.
- A **state** class declares a name and defaults with `@State`, handlers with `@Action` and memoized selectors with static `@Selector()` methods.
- The handler receives a `StateContext` with `getState`, `setState` and `patchState`; it changes state in place of a separate reducer.
- Side effects run **inside** the action handler (it can return an Observable or Promise), instead of a separate effects layer.

Register and use it:

```ts
bootstrapApplication(App, { providers: [provideStore([TodosState])] });

@Component({ /* ... */ })
class TodoList {
  private readonly store = inject(Store);
  readonly items = this.store.selectSignal(TodosState.items);

  add(title: string) {
    this.store.dispatch(new AddTodo(title));
  }
}
```

`selectSignal` returns a signal and accepts a typed selector, not an anonymous function. `dispatch` returns an observable that completes when the handlers finish, which is how a component can wait for a result.

## NgRx Store compared with NGXS

| Concept | NgRx Store | NGXS |
| --- | --- | --- |
| Action | `createAction` function | class with `type` |
| State change | pure reducer | `@Action` handler calling `setState` or `patchState` |
| Side effects | separate Effects | inside handlers or plugins |
| Selectors | `createSelector`, `createFeatureSelector` | static `@Selector()` |
| Ecosystem | Effects, Entity, Router Store, DevTools | plugins: devtools, logger, storage, router |
| Style | functional | class and decorator based |

Both give an explicit, inspectable flow of events. NGXS has less ceremony for small features; NgRx has the larger ecosystem and a stricter separation of pure and impure code. Neither is better for every team.

## When an action store is worth it

Action-based stores pay off when many parts of an application react to the same events, when you need an auditable log of what happened, or when large teams benefit from rigid conventions and DevTools time travel. For one feature's local state, they add ceremony: a signal service or SignalStore is cheaper.

## Common mistakes

- Putting API calls and state changes in the same handler without isolating the HTTP service.
- Dispatching actions that mean "set this field" instead of events or commands with intent.
- Mutating `getState()` results instead of using `setState` or `patchState`.
- Using a global store for state that belongs to one component.
- Choosing the library for style alone without checking team knowledge and tooling.

## When to choose it

Pick NGXS when the team likes class-based, decorator-driven code and the plugin set covers its needs. Pick NgRx Store when you want the largest ecosystem or functional style. Pick neither when a signal service is enough.
