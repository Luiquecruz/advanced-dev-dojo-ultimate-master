Animate a slideshow with `<ViewTransition>` and `addTransitionType`.

The default export `Slideshow({ slides })` (default slides: `Actions`, `Activity`, `View Transitions`) renders the current slide title in an `<h2>`, a counter `Slide {n} of {total}` in a `<p>`, and the buttons `Previous` and `Next`.

1. Implement `go(direction)` where `direction` is `'next'` or `'previous'`:
   - Run the update inside `startTransition`.
   - Call `addTransitionType(direction)` inside the same `startTransition` callback.
   - Move forward or backward, **wrapping around** (Previous on the first slide shows the last one).
2. Wrap the `<h2>` in `<ViewTransition key={index}>` with:
   - `enter={{ next: 'slide-from-right', previous: 'slide-from-left', default: 'none' }}`
   - `exit={{ next: 'slide-to-left', previous: 'slide-to-right', default: 'none' }}`

The tests replace `document.startViewTransition` with a recorder, because the test environment has no View Transition API. Without it, React just updates the DOM.
