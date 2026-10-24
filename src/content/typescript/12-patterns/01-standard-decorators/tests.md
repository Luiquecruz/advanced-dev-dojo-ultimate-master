## type: memoize only accepts single-argument methods

```ts
class Wrong {
  // @ts-expect-error
  @memoize
  add(a: number, b: number): number {
    return a + b;
  }
}
```

## runtime: memoize caches results per argument

```js
const kitchen = new Thermostat('Kitchen');
assert.equal(kitchen.toFahrenheit(100), 212);
assert.equal(kitchen.toFahrenheit(100), 212);
assert.equal(kitchen.toFahrenheit(0), 32);
assert.equal(kitchen.computations, 2);
```

## runtime: memoize keeps a separate cache per instance

```js
const kitchen = new Thermostat('Kitchen');
const office = new Thermostat('Office');
kitchen.toFahrenheit(20);
office.toFahrenheit(20);
assert.equal(kitchen.computations, 1);
assert.equal(office.computations, 1);
```

## runtime: bound methods keep this when detached

```js
const { describe } = new Thermostat('Garage');
assert.equal(describe(), 'Garage: 20°C');
```

## runtime: clamp keeps target between 10 and 30

```js
const bedroom = new Thermostat('Bedroom');
bedroom.target = 50;
assert.equal(bedroom.target, 30);
bedroom.target = -5;
assert.equal(bedroom.target, 10);
bedroom.target = 22;
assert.equal(bedroom.target, 22);
```

## pattern: Uses addInitializer for bound

```regex
\.addInitializer\(
```
