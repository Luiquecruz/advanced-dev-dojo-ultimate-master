1. Declare `interface Point2D { x: number; y: number }` and implement
   `distanceFromOrigin(point: Point2D): number` (Euclidean distance, `√(x² + y²)`).
2. Declare `class Pixel` with public `x: number`, `y: number` and `color: string`, set from the
   constructor `new Pixel(x, y, color)`. **Do not** use `implements`.
3. Declare `const pixelDistance = distanceFromOrigin(new Pixel(3, 4, 'red'))` (structural typing makes this
   compile).
4. Declare a branded `type EmailAddress` (a `string` that plain strings are not assignable to).
5. `toEmailAddress(raw: string): EmailAddress` — throws an `Error` when `raw` has no `@`, otherwise returns
   it branded.
6. `sendWelcome(email: EmailAddress): string` — returns `"Welcome sent to <email>"`.
