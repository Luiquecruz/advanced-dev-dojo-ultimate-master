1. Read the finished files first: `errors.ts` defines every status and code you will emit, `repository.ts` the storage contract, `main.ts` how `createApp` is called.
2. Write the schema so it validates **and** normalizes (trim, lowercase, default tags). Everything after it can trust its input.
3. Implement the service with ownership as the central rule: every read and delete goes through one owner-scoped `get`, so another user's id is indistinguishable from a missing one.
4. Implement the middleware: parse the header strictly, fail with a domain error, and expose the user through typed context variables.
5. Wire the routes: middleware on both `/bookmarks` and `/bookmarks/*`, the validator hook converting Zod issues into `ValidationError`, handlers that call exactly one service method and pick the status.
6. Finish with `notFound` and `onError`: one function builds every error body. Order the checks from most specific (`AppError`) to framework (`HTTPException`) to unknown, and never send an unknown error's message to the client.
