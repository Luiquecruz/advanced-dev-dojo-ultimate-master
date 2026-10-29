Delete the `users` field and add `constructor(private readonly deps: SignupDependencies) {}`. From then on every collaborator is reached through `this.deps`.
---
In `signup`, normalize first (`rawEmail.trim().toLowerCase()`), then `if (await this.deps.users.findByEmail(email)) throw new EmailTakenError(email);` before building anything, so a rejected signup has no side effects.
---
Build the user with `this.deps.ids()` and `this.deps.clock.now().toISOString()`, then `await this.deps.users.save(user)` and `await this.deps.mailer.send({ to: email, subject: 'Welcome to Dev Dojo' })`.
---
`createContainer`: `const deps: SignupDependencies = { users: new InMemoryUserRepository(), mailer: consoleMailer, clock: systemClock, ids: randomUUID, ...overrides };` and return `{ ...deps, signupService: new SignupService(deps) }`.
