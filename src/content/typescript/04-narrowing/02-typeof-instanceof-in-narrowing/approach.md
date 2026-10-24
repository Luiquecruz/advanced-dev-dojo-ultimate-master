1. In `toTimestamp`, return `getTime()` inside an `instanceof Date` branch, return numbers as they are inside a `typeof` branch, and parse the remaining string.
2. In `describeError`, check `instanceof Error` first, then `typeof error === 'string'`, and return the fallback text last.
3. In `area`, use `'radius' in shape` to narrow to `Circle`; the code after the branch only sees `Square`.
4. Delete every `as` assertion and confirm the code still compiles: the guards now prove the types.
