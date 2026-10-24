## type: Validator is (value: string) => boolean

```ts
type _ = Expect<Equal<Validator, (value: string) => boolean>>;
```

## forbid: isNotEmpty's parameter is contextually typed

```regex
isNotEmpty\s*:\s*Validator\s*=\s*\(\s*\w+\s*:
```

## runtime: validateAll requires every validator to pass

```js
const short = (value) => value.length < 5; assert.equal(validateAll('hi', [isNotEmpty, short]), true); assert.equal(validateAll('   ', [isNotEmpty]), false); assert.equal(validateAll('too long', [isNotEmpty, short]), false); assert.equal(validateAll('', []), true);
```

## type: Formatter is callable and exposes unit

```ts
const format: Formatter = Object.assign((value: number) => String(value), { unit: 'kg' });
const text: string = format(1);
const unit: string = format.unit;
// @ts-expect-error
format('1');
```

## runtime: createFormatter formats with decimals and unit

```js
const kilos = createFormatter('kg', 1); assert.equal(kilos(2.345), '2.3 kg'); assert.equal(kilos.unit, 'kg'); assert.equal(createFormatter('m', 0)(5), '5 m');
```
