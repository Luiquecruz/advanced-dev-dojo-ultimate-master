## pattern: Declares Thermostat as an interface

```regex
\binterface\s+Thermostat\b
```

## type: Thermostat has the expected members

```ts
type _ = [
  Expect<Equal<Thermostat['room'], string>>,
  Expect<Equal<Thermostat['targetCelsius'], number>>,
  Expect<Equal<Thermostat['setTarget'], (celsius: number) => void>>,
  Expect<Equal<Thermostat['describe'], () => string>>,
];
```

## type: createThermostat returns a Thermostat

```ts
type _ = Expect<Equal<typeof createThermostat, (room: string, targetCelsius: number) => Thermostat>>;
```

## runtime: describe reports room and temperature

```js
assert.equal(createThermostat('Kitchen', 21).describe(), 'Kitchen: 21°C');
```

## runtime: setTarget clamps between 10 and 30

```js
const office = createThermostat('Office', 20);
office.setTarget(35);
assert.equal(office.targetCelsius, 30);
office.setTarget(4);
assert.equal(office.describe(), 'Office: 10°C');
office.setTarget(18);
assert.equal(office.targetCelsius, 18);
```
