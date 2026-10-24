Configure a greeting component through tokens and providers.

**`tokens.ts`**

1. Export `GREETING`, an `InjectionToken<string>` provided in root with a default factory that returns `'Hello'`.
2. Export an abstract class `Logger` with an abstract method `log(message: string): void`.
3. Export `MemoryLogger extends Logger` with a public `messages: string[]` array (starts empty) and a `log()` that pushes the message into it.

**`app.ts`**

1. Export a `Greeter` component (selector `app-greeter`).
2. It registers `{ provide: Logger, useClass: MemoryLogger }` in its own `providers`.
3. It injects `GREETING` and `Logger` with `inject()`.
4. It renders `<h1>{GREETING}, Ada!</h1>` (for example `Hello, Ada!`) and a `<button>` with the text `Greet` that calls `logger.log('Greeted Ada')`.

Overriding the token (`{ provide: GREETING, useValue: 'Howdy' }`) must change the heading without touching the component.
