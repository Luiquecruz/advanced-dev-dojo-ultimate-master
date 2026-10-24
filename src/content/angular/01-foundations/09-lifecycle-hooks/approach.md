1. Register `afterNextRender` in the constructor to focus the filter input (render hooks must be created in an injection context).
2. Implement `ngOnInit`: create the interval using `this.intervalMs()`, which now contains the parent's value.
3. Register the cleanup with `destroyRef.onDestroy` (or implement `ngOnDestroy`) to call `clearInterval`.
4. Implement `ngOnChanges`: read `changes.label`, skip it when `firstChange` is true, otherwise append the formatted transition to `changes` immutably.
