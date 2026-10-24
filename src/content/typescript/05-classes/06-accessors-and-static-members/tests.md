## type: The constructor is private and fahrenheit is read-only

```ts
// @ts-expect-error the constructor is private
new Temperature(20);
const room = Temperature.fromCelsius(21);
room.celsius = 22;
// @ts-expect-error fahrenheit has no setter
room.fahrenheit = 70;
// @ts-expect-error created has no setter
Temperature.created = 5;
type _ = Expect<Equal<typeof Temperature.ABSOLUTE_ZERO, -273.15>>;
```

## runtime: Factories convert between scales

```js
assert.equal(Temperature.fromFahrenheit(212).celsius, 100);
assert.equal(Temperature.fromFahrenheit(-40).celsius, -40);
assert.equal(Temperature.fromCelsius(100).fahrenheit, 212);
```

## runtime: The celsius setter updates the derived fahrenheit value

```js
const temperature = Temperature.fromCelsius(100);
temperature.celsius = 0;
assert.equal(temperature.celsius, 0);
assert.equal(temperature.fahrenheit, 32);
```

## runtime: Values below absolute zero are rejected

```js
assert.equal(Temperature.ABSOLUTE_ZERO, -273.15);
assert.throws(() => Temperature.fromCelsius(-300), RangeError);
assert.throws(() => Temperature.fromFahrenheit(-500), RangeError);
const temperature = Temperature.fromCelsius(10);
assert.throws(() => { temperature.celsius = -274; }, RangeError);
assert.equal(temperature.celsius, 10);
```

## runtime: created counts every instance

```js
assert.equal(Temperature.created, 0);
Temperature.fromCelsius(1);
Temperature.fromFahrenheit(50);
assert.equal(Temperature.created, 2);
```
