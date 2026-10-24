Add `implements OnChanges, OnInit` and the methods `ngOnChanges(changes: SimpleChanges<AutoRefresh>)` and `ngOnInit()`. In `ngOnInit` the inputs already hold the parent's values.
---
Keep the id returned by `setInterval` and clear it on destroy: `this.destroyRef.onDestroy(() => clearInterval(id))`.
---
`changes.label` is a `SimpleChange` with `firstChange`, `previousValue` and `currentValue`. For focus: `afterNextRender(() => this.host.nativeElement.querySelector('input')?.focus())` inside the constructor.
