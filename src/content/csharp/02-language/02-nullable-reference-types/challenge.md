Finish `Customer` and `CustomerDirectory` in `Program.cs`. The project has nullable reference types enabled, so `string?` and `Customer?` say "may be null", and a plain `string` says "never null". Your job is to make the code keep those promises when a lookup finds nothing.

## `Customer(string id, string name, string? email = null)`

Throw `ArgumentNullException` when `id` or `name` is `null`, with the parameter's name as `ParamName` (`ArgumentNullException.ThrowIfNull(name)` does this for you). The annotation alone checks nothing when the program runs, so a caller that writes `null!` would get through without this guard. `Email` and `Nickname` are optional and may stay `null`.

## `Find(string id)`

Return the customer stored under `id`, or `null` when there is none. It must never throw for an unknown id.

## `DisplayName(string id)`

Return the customer's `Nickname` when it is set, otherwise the `Name`, and `"guest"` when no customer has this id.

## `EmailLength(string id)`

Return the length of the customer's email, or `0` when the customer is missing **or** has no email.
