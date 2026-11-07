Before starting, complete [Reactive Forms](/angular/reactive-forms) in the Angular track.

This lesson settles three borderline cases that cause the most arguments: form state, filter state and normalized data. Each time the question is the same: who owns this value?

## Form state belongs to the form

A form already tracks values, validity, `dirty`, `touched` and submission. A half-edited form is **transient and local**: it should disappear when the user leaves, and it should not trigger updates anywhere else on every keystroke.

```ts
readonly form = new FormGroup({
  name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
});

async save() {
  if (this.form.invalid) return;
  await this.store.rename(this.form.getRawValue().name);   // only the committed value reaches the store
}
```

The flow is: **load** the committed value from the store into the form, **edit** inside the form, **commit** to the store on submit. Mirroring every keystroke into a global store creates two sources of truth and re-renders unrelated screens.

Centralize form state only when there is a real reason: a multi-step wizard that spans routes, or a draft that must survive navigation. Then keep the draft in a scoped service and leave validation in the form.

| Choose the form | Choose a store |
| --- | --- |
| validity, dirty and touched | a draft that spans several routes |
| single screen editing | a wizard whose steps are separate components with separate routes |
| discard on leave | survives reload (persisted) |

## Filters: component or URL

A list filter held in a component is lost on reload and not shareable. Held in the URL it is both. The cost is parsing and navigation code (see the URL lesson). If users never share or return to a filtered view, a component signal is fine; if they would, use the URL.

## Normalized or nested

Server responses often nest entities: an order with its customer and items, each item with its product. If the same product appears in many places and can change, nested copies drift. **Normalization** stores each entity once by id and references it elsewhere:

```ts
interface State {
  products: Record<number, Product>;
  orders: Record<number, { id: number; productIds: number[] }>;
}
```

A rename of product 7 is then one update. The cost is that reading requires joining ids back to entities, usually with `computed`. NgRx Entity and SignalStore's `withEntities` keep an id list and an entity map for you.

| Prefer normalized | Prefer nested |
| --- | --- |
| entities shared by several lists, edited individually | read-only data displayed once |
| frequent updates of single entities | whole-response replacement |
| large collections with lookup by id | small, short-lived lists |

## Side by side comparisons

- **Signal in a component vs signal service**: start local; move to a service when a second component needs it.
- **BehaviorSubject service vs signals**: signals for state, subjects for event streams; bridge with `toSignal`.
- **Own service vs SignalStore**: a store adds conventions (state, computed, methods, hooks, entities, devtools integrations). Own services are enough until the team keeps rewriting the same plumbing.
- **SignalStore vs NgRx Store**: SignalStore is lighter and local to a feature; NgRx Store adds actions, a global event log, effects and DevTools time travel, useful when many features react to the same events.

## Common mistakes

- Binding a global store directly to form controls.
- Normalizing tiny read-only lists.
- Nesting data that is edited in several places.
- Putting filters in a component and then asking why links do not work.
- Deriving a filtered list inside the store and again in the component.

## When to choose it

Keep forms local and commit on submit. Use the URL for shareable views. Normalize entities that are shared and edited; leave the rest nested.
