1. In `go`, open a `startTransition` callback so the change is eligible for animation.
2. Tag it with `addTransitionType(direction)` so React knows which class to use.
3. Compute the next index with modulo arithmetic to wrap in both directions.
4. Wrap the heading in a keyed `<ViewTransition>`: a new key means one instance exits and another enters.
5. Map each transition type to enter and exit classes, with `default: 'none'` for unrelated Transitions.
