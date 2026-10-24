`shallowRef<Point[]>([])` only reacts to `points.value = ...`. A `push` would be invisible, so `addPoint` must build a new array: `[...points.value, point]`.
---
In `movePoint`, change `x` and `y` on `points.value[index]` directly, then call `triggerRef(points)` to tell Vue the ref changed.
---
`markRaw(new ChartEngine())` inside the `reactive({...})` call keeps the instance raw. For the snapshot, `structuredClone(toRaw(settings))` clones the original object instead of the Proxy.
