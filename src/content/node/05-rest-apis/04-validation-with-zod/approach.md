1. Write the body schema field by field from the contract. Transformations (`trim`, `default`) are part of parsing, so the handler receives clean data.
2. Write the query schema with `z.coerce` because every query value arrives as a string; leave `role` optional so the filter only applies when sent.
3. Implement `formatIssues` as a pure function and test it mentally with a nested path: the API's error shape should not depend on Zod's internal format.
4. Create one hook that turns a failed result into the `400` body, and attach it to both `zValidator` calls so the error shape is identical everywhere.
5. In the handlers, read only `c.req.valid(...)`. Building the user from the validated object is what removes `isAdmin`: unknown keys were stripped by `z.object`.
6. Send an invalid body with several mistakes and confirm the response lists all of them, not only the first.
