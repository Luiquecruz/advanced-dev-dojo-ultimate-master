`type PublicUser = Omit<User, 'passwordHash'>;`, `type UserPreview = Pick<User, 'id' | 'name'>;` and `Omit<User, 'id' | 'createdAt'>` for the new user.
---
Returning `user` from `toPublicUser` still compiles because of structural typing, but the hash is still there at runtime. You must build a new object.
---
Rest destructuring removes one property: `const { passwordHash, ...publicUser } = user; return publicUser;`. For `createUser`: `return { ...input, id, createdAt };`.
