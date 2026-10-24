Put `readonly` before each property name: `readonly latitude: number`.
---
For the stops, both the property and the array need protection: `readonly stops: readonly Coordinates[]`.
---
Return fresh objects with spread: `{ ...point, latitude: point.latitude + degrees }` and `{ ...route, stops: [...route.stops, stop] }`.
