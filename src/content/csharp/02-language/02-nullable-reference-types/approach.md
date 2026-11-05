1. Read the types first: `Find` returns `Customer?`, so "not found" is a normal answer, not an error. `Email` and `Nickname` are `string?`; `Id` and `Name` are `string` and must never hold `null`.
2. Constructor: guard `id` and `name` with `ArgumentNullException.ThrowIfNull`. It names the parameter for you, so the test can check `ParamName`.
3. `Find`: replace the indexer with `TryGetValue` and return the found customer or `null`. This is the classic mistake: the indexer compiles, and it throws only when a key is missing.
4. `DisplayName`: look the customer up once with `Find`, then fall back from nickname to name to `"guest"` with `?.` and `??`.
5. `EmailLength`: `?.` turns the length into an `int?` that is `null` when either step is missing; `?? 0` turns that `null` into `0`.
