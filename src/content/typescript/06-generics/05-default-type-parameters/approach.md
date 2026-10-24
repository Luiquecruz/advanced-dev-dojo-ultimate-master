1. Add `= unknown` and `= ApiError` defaults to `ApiResponse`, and `= number` to the cursor of `Paginated`.
2. Simplify the function return types now that the error type is defaulted.
3. Give `failure` a `never` default so a bare failure does not claim any data type.
4. Give `createCollection` a `string` default for calls without arguments.
5. Fix the `failure` body to use its `code` and `message` parameters.
