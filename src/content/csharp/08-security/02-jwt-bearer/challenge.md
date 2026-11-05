Read a JWT access token by hand and check its claims, the way the bearer handler does before it trusts a token. Everything goes in `Program.cs`.

## `Jwt.DecodeSegment(segment)`

Returns the bytes of one Base64URL segment: `-` and `_` instead of `+` and `/`, and no `=` padding.

## `Jwt.ReadClaims(token)`

Splits the token into its three parts, decodes the **payload** (the middle part) and parses it as JSON, then returns a `TokenClaims`:

- `Issuer` from `iss` and `Expires` from `exp`; both are required, so a missing one throws `FormatException`.
- `Audiences` from `aud`, which is either one string or an array of strings. A token without `aud` has no audiences.
- `Subject` from `sub` and `NotBefore` from `nbf`, or `null` when they are absent.
- `exp` and `nbf` are NumericDate values, seconds since 1970-01-01 UTC.
- Assume each claim that is present has its JSON type: strings for `iss`, `sub` and `aud` (or its items), whole seconds for `exp` and `nbf`. Real validators also reject wrong types; the tests do not send them.
- A token that does not have exactly three parts, a payload that is not a JSON object, and an `exp` or `nbf` outside the range of `DateTimeOffset` throw `FormatException`.

## `ClaimsValidator.Check(token)`

`new ClaimsValidator(issuer, audience, clockSkew, clock)` returns the first rule a token breaks, in this order:

1. `Malformed` when `ReadClaims` cannot read it (`FormatException` or `JsonException`).
2. `WrongIssuer` when `iss` is not exactly the expected issuer.
3. `WrongAudience` when the expected audience is not among the audiences.
4. `Expired` when the current time is later than `exp` plus the clock skew.
5. `NotYetValid` when `nbf` is later than the current time plus the clock skew.

Otherwise it returns `Valid`. Read the current time from the injected `TimeProvider` (`clock.GetUtcNow()`), never from the system clock, so tests can choose the moment.

The signature is deliberately not checked here: this engine has no cryptography, and in a real API the handler verifies it against the issuer's keys **before** any claim is believed.
