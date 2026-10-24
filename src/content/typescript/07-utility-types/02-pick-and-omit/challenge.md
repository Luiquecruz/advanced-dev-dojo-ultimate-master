Derive DTO types from `User` and make sure the password hash never leaves the server.

1. `type PublicUser` — every `User` field except `passwordHash` (use `Omit`).
2. `type UserPreview` — only `id` and `name` (use `Pick`).
3. `type NewUser` — every field except `id` and `createdAt` (use `Omit`).
4. `toPublicUser(user: User): PublicUser` — returns a **new object without** `passwordHash` at runtime.
5. `toPreview(user: User): UserPreview` — returns a new object containing only `id` and `name`.
6. `createUser(input: NewUser, id: number, createdAt: Date): User` — combines the input with the generated
   fields.
