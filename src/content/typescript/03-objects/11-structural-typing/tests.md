## forbid: Pixel does not use implements

```regex
\bimplements\b
```

## type: A Pixel is accepted wherever a Point2D is expected

```ts
expectType<Point2D>(new Pixel(1, 2, 'blue'));
const pixel = new Pixel(1, 2, 'blue');
const color: string = pixel.color;
type _ = Expect<Equal<typeof distanceFromOrigin, (point: Point2D) => number>>;
```

## runtime: Distances are computed for plain objects and pixels

```js
assert.equal(pixelDistance, 5); assert.equal(distanceFromOrigin({ x: 6, y: 8 }), 10); assert.equal(distanceFromOrigin({ x: 0, y: 0 }), 0);
```

## type: EmailAddress is a string but plain strings are rejected

```ts
type _ = [Expect<Extends<EmailAddress, string>>, ExpectFalse<Extends<string, EmailAddress>>];
const email = toEmailAddress('ana@example.com');
sendWelcome(email);
// @ts-expect-error
sendWelcome('ana@example.com');
```

## runtime: toEmailAddress validates and sendWelcome formats

```js
assert.throws(() => toEmailAddress('not-an-email'));
assert.equal(sendWelcome(toEmailAddress('ana@example.com')), 'Welcome sent to ana@example.com');
```
