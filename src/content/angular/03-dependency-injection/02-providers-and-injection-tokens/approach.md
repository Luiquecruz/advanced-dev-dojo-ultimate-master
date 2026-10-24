1. In `tokens.ts`, create the `GREETING` token with `providedIn: 'root'` and a factory so it works without any configuration.
2. Declare the `Logger` contract as an abstract class so it can be both a type and a runtime token.
3. Implement `MemoryLogger` that records messages in an array.
4. In `Greeter`, add a component-level provider mapping `Logger` to `MemoryLogger` with `useClass`.
5. Inject both tokens with `inject()` and render the greeting in the `<h1>`.
6. Call `logger.log('Greeted Ada')` from the button click handler.
