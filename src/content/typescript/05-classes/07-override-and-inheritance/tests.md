## pattern: Overrides are explicit and reuse super

```regex
override\s+describe\s*\(\s*\)[\s\S]*super\.describe\(\)
```

## pattern: Uses new.target for the error name

```regex
this\.name\s*=\s*new\.target\.name
```

## type: The hierarchy is type compatible

```ts
const errors: HttpError[] = [new NotFoundError('User'), new ServiceUnavailableError(10)];
const asError: Error = new NotFoundError('Post');
type _ = [
  Expect<Equal<NotFoundError['resource'], string>>,
  Expect<Equal<ServiceUnavailableError['retryAfterSeconds'], number>>,
];
```

## runtime: Each class reports its own name

```js
assert.equal(new HttpError(500, 'Boom').name, 'HttpError');
assert.equal(new NotFoundError('User').name, 'NotFoundError');
assert.equal(new ServiceUnavailableError(30).name, 'ServiceUnavailableError');
assert.ok(new NotFoundError('User') instanceof HttpError);
assert.ok(new NotFoundError('User') instanceof Error);
```

## runtime: describe is overridden in NotFoundError

```js
assert.equal(new HttpError(500, 'Boom').describe(), 'HttpError 500: Boom');
assert.equal(new NotFoundError('User').describe(), 'NotFoundError 404: User not found [resource=User]');
assert.equal(new ServiceUnavailableError(5).describe(), 'ServiceUnavailableError 503: Service unavailable');
```

## runtime: isRetryable combines base and subclass rules

```js
assert.equal(new HttpError(502, 'Bad gateway').isRetryable(), true);
assert.equal(new NotFoundError('User').isRetryable(), false);
assert.equal(new ServiceUnavailableError(30).isRetryable(), true);
assert.equal(new ServiceUnavailableError(120).isRetryable(), false);
```
