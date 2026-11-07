This lesson follows the Angular path in State Management. Before starting, complete [signal, computed & effect](/angular/signal-computed-effect) and [Services and inject()](/angular/services-and-inject) in the Angular track.

"State management" is not one problem. An Angular app holds several kinds of state, and each kind has a natural home. Most pain comes from putting a kind of state in the wrong place, not from choosing the wrong library.

## The kinds of state

| Kind | Examples | Natural home |
| --- | --- | --- |
| Component state | open menu, selected row, expanded field | a `signal()` in the component |
| Feature state | the filters, rows and selection that several components of one feature share | a service or store provided at the route or feature |
| Global state | session, permissions, theme, cart | a root-provided service or store |
| Server state | remote data, its loading and error status, its freshness | `httpResource`, `resource`, or a query library, not a hand-written copy |
| Form state | values, validity, `dirty`, `touched`, submission | the form model (Reactive Forms or Signal Forms) |
| URL state | route, params, search text, page, sort | the router: the address bar is the store |
| Derived state | totals, filtered lists, "can submit" | `computed()`, never a stored copy |

Two more questions cut across the table. Is the value **transient** (gone after navigation) or **persisted** (it must survive a reload, so it goes to storage)? And who is allowed to **write** it?

## Single source of truth

Every piece of state needs exactly one owner: one place that holds the value and the only code allowed to change it. Everyone else reads it. The classic bug is two copies that drift apart:

```ts
// Two sources of truth: `selectedUser` can disagree with `users`.
users = signal<User[]>([]);
selectedUser = signal<User | null>(null);
```

If the user is renamed in `users`, `selectedUser` still holds the old object. Store the **id** and derive the object:

```ts
users = signal<User[]>([]);
selectedId = signal<number | null>(null);
selected = computed(() => this.users().find((user) => user.id === this.selectedId()) ?? null);
```

Now there is one list, one id, and the selected user can never be stale.

## Derive, don't store

Anything you can calculate from other state should be a `computed()`. A stored copy needs synchronization code, and that code is where bugs live. A good test: if a value can be recomputed from other values without losing information, it is derived.

## Ownership and direction

Pick the lowest owner that covers every reader:

1. Only one component reads and writes it: keep it local.
2. A parent and children share it: lift it to the parent and pass it down with `input()` and `output()`, or `model()`.
3. Unrelated components of one feature need it: a service provided at the feature (route or component providers).
4. The whole app needs it: a root service or store.

Moving state up is cheap; moving it down later is harder because every reader has already attached to the shared owner. Start local and lift only when a second reader appears.

## Transient or persisted

A filter panel's open/closed flag is transient. A theme choice or a draft the user would hate to lose is persisted. Persisting widens the contract: stored data outlives the code that wrote it, so it needs a version. A later lesson covers that.

## Common mistakes

- Copying server data into a store "so the component can use it", then forgetting to refresh the copy.
- Keeping a filter in a component when users need to share the link, so the URL loses the filter.
- Storing derived values such as `total` and updating them by hand.
- Making everything global because one screen needed to share a field.
- Treating the form as global state, so a half-edited form leaks into unrelated screens.

## When to choose it

Ask in order: Is it derived? Is it in the URL? Is it server data? Is it form data? Does it need more than one reader? Only the leftovers are "client state" that needs a store. For most Angular apps that is a small amount, and a signal service is enough for it.
