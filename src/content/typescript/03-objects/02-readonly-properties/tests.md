## type: Coordinates properties cannot be reassigned

```ts
const point: Coordinates = { latitude: 1, longitude: 2 };
// @ts-expect-error
point.latitude = 3;
// @ts-expect-error
point.longitude = 4;
```

## type: Route name cannot be reassigned and stops cannot be mutated

```ts
const route: Route = { name: 'Coast', stops: [] };
// @ts-expect-error
route.name = 'Hills';
// @ts-expect-error
route.stops.push({ latitude: 0, longitude: 0 });
// @ts-expect-error
route.stops = [];
```

## runtime: moveNorth returns a new point without mutating the input

```js
const start = { latitude: 10, longitude: 20 };
const moved = moveNorth(start, 5);
assert.deepEqual(moved, { latitude: 15, longitude: 20 });
assert.deepEqual(start, { latitude: 10, longitude: 20 });
assert.notEqual(moved, start);
```

## runtime: addStop returns a new route without mutating the input

```js
const route = { name: 'Coast', stops: [{ latitude: 1, longitude: 1 }] };
const updated = addStop(route, { latitude: 2, longitude: 2 });
assert.deepEqual(updated, { name: 'Coast', stops: [{ latitude: 1, longitude: 1 }, { latitude: 2, longitude: 2 }] });
assert.equal(route.stops.length, 1);
assert.notEqual(updated, route);
```
