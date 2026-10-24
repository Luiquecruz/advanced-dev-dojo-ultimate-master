1. In `truncate-pipe.ts`, decorate the class with `@Pipe({ name: 'truncate' })` and implement `PipeTransform`.
2. Write `transform(value, limit = 20, suffix = '…')`: compare the length to the limit, slice, trim the end, append the suffix.
3. In `OrderSummary`, add the five built-in pipe classes and `TruncatePipe` to `imports`.
4. Apply `uppercase`, `titlecase`, `currency: 'EUR'`, `percent`, `date: 'MMM d, y' : 'UTC'` and `truncate: 20` in the template.
5. Notice that updating `order` with a new object re-runs the pure pipes.
