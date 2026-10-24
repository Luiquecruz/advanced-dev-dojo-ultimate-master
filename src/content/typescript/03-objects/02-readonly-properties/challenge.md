The starter code mutates its inputs. Make the types immutable and fix the functions:

1. `Coordinates` — `latitude` and `longitude` are `readonly number`.
2. `Route` — `name` is a `readonly string` and `stops` is a `readonly` property holding a
   **readonly array** of `Coordinates`.
3. `moveNorth(point: Coordinates, degrees: number): Coordinates` returns a **new** point with
   `latitude + degrees`, leaving the input untouched.
4. `addStop(route: Route, stop: Coordinates): Route` returns a **new** route with the stop appended,
   leaving the input untouched.

```ts
moveNorth({ latitude: 10, longitude: 20 }, 5); // { latitude: 15, longitude: 20 }
```
