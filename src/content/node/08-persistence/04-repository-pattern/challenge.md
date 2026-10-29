Implement an in-memory `UserRepository` and a service that depends only on the interface. The `User`, `NewUser`, `UserRepository` and `DuplicateEmailError` declarations are given.

## `InMemoryUserRepository`

Store rows in the private `Map` and behave like a database table:

| Method | Behavior |
| --- | --- |
| `create(input)` | Assigns ids `1, 2, 3...` and returns the new user. Throws `DuplicateEmailError` (message `Email already in use: <email>`) when another user has the same email **ignoring case**. |
| `findById(id)` | The user, or `null`. |
| `findByEmail(email)` | The user whose email matches ignoring case, or `null`. |
| `list({ limit?, offset? })` | Users sorted by `id`, skipping `offset` (default `0`) and returning at most `limit` (default `50`). |
| `update(id, patch)` | Merges the patch, keeps the `id`, returns the updated user or `null` for an unknown id. Throws `DuplicateEmailError` when the new email belongs to **another** user (changing the case of your own email is allowed). |
| `delete(id)` | Removes the row; `true` when it existed, `false` otherwise. |

Every method returns **copies**: changing an object the repository returned must never change what is stored, exactly like rows read from a real database.

## `createUserService(users)`

Returns `{ register, promoteToAdmin }` and uses only the `UserRepository` methods it receives (the tests pass a fake):

- `register({ email, name })` calls `users.create` with the email trimmed and lowercased, the name trimmed and `role: 'member'`, and returns the created user.
- `promoteToAdmin(id)` calls `users.update(id, { role: 'admin' })` and returns the user; when the repository returns `null` it throws `new Error('User not found')`.
