A token with a default: `new InjectionToken<string>('GREETING', { providedIn: 'root', factory: () => 'Hello' })`.
---
An abstract class can be a token. `MemoryLogger extends Logger` implements `log()` by pushing into `readonly messages: string[] = []`.
---
Register the implementation on the component: `providers: [{ provide: Logger, useClass: MemoryLogger }]`, then `private readonly logger = inject(Logger);`.
---
`protected readonly greeting = inject(GREETING);` and in the template `<h1>{{ greeting }}, Ada!</h1>`.
