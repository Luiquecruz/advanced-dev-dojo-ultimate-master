1. Prefer the template: import `AsyncPipe` in `AsyncTicker` and interpolate `ticks$ | async`. The pipe owns the subscription.
2. In `ManualTicker`, keep the side-effect subscription but make it finite.
3. Add `takeUntilDestroyed()` as the last operator, called from the constructor so it picks up the component's `DestroyRef`.
4. Verify mentally: destroying either component should leave the source with no observers.
