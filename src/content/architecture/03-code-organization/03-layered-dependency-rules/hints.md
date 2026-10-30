Describe both ends of every import with `describeFile`. The layer rank is just `LAYERS.indexOf(layer)`: a smaller index means a higher layer.
---
Order matters in `ruleFor(from, to)`: first compare ranks (`target < source` is upward), then return `null` when the target has no slice (`app` or `shared` at the same or a lower layer), then compare layers and slices for siblings, and only then look at `target.rest` with `PUBLIC_API_FILE`.
---
In `checkDependencies`, `Object.entries(graph).flatMap(([from, imports]) => imports.map((to) => ({ from, to, rule: ruleFor(from, to) })))`, filter out `null` rules, then sort with a comparator that compares `from` and falls back to `to` using `<`.
