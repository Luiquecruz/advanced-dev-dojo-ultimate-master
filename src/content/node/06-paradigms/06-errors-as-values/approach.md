1. Implement `map` and `andThen` first; every later step is built from them. Both branch on `result.ok` and return the error result itself when it failed.
2. Turn each check of `transfer` into a function that returns a `Result`: amount parsing, the same-account rule, each account lookup, the funds check.
3. Chain them with `andThen` in the order the contract specifies, so the first failure short-circuits the rest and its value is what the caller receives.
4. Build the success value with new objects (`{ ...from, balance: ... }`). Nothing is committed inside `transfer`: it only decides.
5. Write `toHttpError` as a `switch` on `error.type` with a `never` default. Adding a variant later then breaks compilation until it is mapped.
6. The route is the imperative shell: parse the body, call `transfer`, and either translate the error or commit the two accounts and answer `200`.
