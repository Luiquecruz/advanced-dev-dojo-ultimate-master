`SignupService` creates its own repository, generates ids with `randomUUID()`, reads the clock with `new Date()` and logs instead of using a mailer. Refactor it to **constructor injection** and add a composition root.

The starter already exports `User`, `UserRepository`, `Mailer`, `Clock`, `IdGenerator`, `SignupDependencies` (`{ users, mailer, clock, ids }`), `EmailTakenError`, `InMemoryUserRepository`, `systemClock` and `consoleMailer`.

1. `new SignupService(deps: SignupDependencies)` stores the dependencies. The class must not create or call concrete collaborators itself: no `new Date`, `randomUUID`, `new InMemoryUserRepository` or `console` inside it.
2. `signup(email)`:
   - normalizes the email with `trim()` and `toLowerCase()`;
   - when `users.findByEmail(email)` finds a user, rejects with `new EmailTakenError(email)` (message `Email already registered: <email>`) without saving or sending anything;
   - otherwise builds `{ id: ids(), email, createdAt: clock.now().toISOString() }`, saves it with `users.save(user)`, sends `{ to: email, subject: 'Welcome to Dev Dojo' }` with `mailer.send`, and resolves with the user.
3. `createContainer(overrides?: Partial<SignupDependencies>)` is the composition root. It builds the defaults `users: new InMemoryUserRepository()`, `mailer: consoleMailer`, `clock: systemClock`, `ids: randomUUID`, applies the overrides, and returns `{ users, mailer, clock, ids, signupService }`, where `signupService` uses exactly those dependencies.
