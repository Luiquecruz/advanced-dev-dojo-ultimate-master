1. Replace the three placeholder aliases with `Omit` and `Pick` expressions on `User`.
2. In `toPublicUser`, destructure `passwordHash` away and return the rest.
3. In `toPreview`, return an object literal with just `id` and `name`.
4. In `createUser`, spread the input and add the generated `id` and `createdAt`.
