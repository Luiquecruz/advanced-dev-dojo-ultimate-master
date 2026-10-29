1. Classify the failures: invalid input belongs to the HTTP layer (`HTTPException`), missing accounts and insufficient funds belong to the domain (already thrown by the service), the report failure is unexpected.
2. Add the input guard in the withdraw route and throw instead of returning, so the same translator handles it. Check the type as well as the sign: `'20'` is not a number.
3. Write `onError` as an ordered `instanceof` chain that maps each known class to its status, always with the `{ error }` shape.
4. Make the last branch defensive: log the original error for operators, answer a fixed message for clients. Never pass `err.message` of an unknown error to the response.
5. Add `notFound` with the same shape, so even unmatched routes look like the rest of the API.
6. Confirm the routes have no `try/catch`: the service stays HTTP-agnostic and the mapping lives in one place.
