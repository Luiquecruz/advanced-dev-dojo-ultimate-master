1. Start from the contract shared by both sides: the title rules live in `schemas.ts`, so the server and the client cannot disagree about what a valid todo is.
2. Extend the server as a single method chain. Each `.post`/`.patch` adds its input and output types to `typeof app`, which is all the client needs.
3. Validate with the shared schemas and custom hooks so error bodies keep the API's `{ error }` shape, and pass explicit status codes so each response type is tied to its status.
4. Build the client with `hc<AppType>` and the injected `fetch`; the injection is what lets `main.ts` and the tests talk to the app in memory and lets production add auth headers later.
5. Validate on the client before sending: it gives instant feedback and saves a round trip, while the server still validates for every other caller.
6. Check the status before reading the body and convert anything unexpected into an `ApiError` carrying the status and the server's message.
7. Confirm `client.ts` imports `AppType` with `import type`, so the server module is never loaded by the client.
