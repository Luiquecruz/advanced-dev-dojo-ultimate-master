Build the credential and secret layer of a harness: a broker that issues scoped credentials which expire, placeholder resolution at the tool boundary, redaction of secrets in every form, and a tool executor that ties them together so no secret ever reaches the model or the audit log. Time is injected with `now()` (milliseconds).

A **grant** per tool is `{ scopes, secrets? }`: the scopes the tool may request and the names of the secrets it may use. A **vault** maps secret names to values. A placeholder is `{{secret:NAME}}` (letters, digits and `_`).

## 1. `createCredentialBroker({ grants, ttlMs, now = Date.now })`

- **`issue(tool, scopes)`** returns a new credential `{ token, tool, scopes, issuedAt, expiresAt }` with a unique string `token`, the requested scopes (duplicates removed), `issuedAt = now()` and `expiresAt = issuedAt + ttlMs`. Throw a `ScopeError` (exported) for a tool without a grant, an empty scope list, or any scope outside the tool's grant.
- **`verify(token, tool, scope)`** returns `{ valid: true }` or `{ valid: false, reason }`, checking in order: `'unknown'` (never issued or revoked), `'expired'` (`now() >= expiresAt`), `'wrong_tool'`, `'scope'` (not among the credential's scopes).
- **`revoke(token)`** forgets the token.
- **`allowedSecrets(tool)`** returns the secret names in the tool's grant (`[]` when none).

## 2. `resolvePlaceholders(value, vault, allowedSecrets)`

Return a copy of `value` where every placeholder inside any string, at any depth of arrays and objects, is replaced by the vault value. Other values are returned as they are, and the input is not modified. A placeholder whose name is not in `allowedSecrets` or not in the vault throws a `SecretAccessError` (exported) whose message contains the **name** and never a secret value.

## 3. `redactSecrets(text, vault)`

Replace every occurrence of each non-empty secret with `[REDACTED:NAME]`, in three forms: the raw value, its base64 encoding (UTF-8) and `encodeURIComponent(value)`. Replace the longest forms first, so a secret that contains another is redacted whole.

## 4. `findLeakedSecrets(messages, vault)`

The names (in vault order) of the non-empty secrets whose raw, base64 or URL-encoded form appears in any message `content` or in the `arguments` of any of its `toolCalls`.

## 5. `executeToolCall(toolCall, { tools, broker, vault, audit = [] })`

`tools` maps tool names to `{ scope, execute(args, credential) }`. Return a tool message `{ role: 'tool', toolCallId, content }` and **never throw**:

1. Arguments that are not a JSON object: `content` starts with `Error:`.
2. A tool missing from `tools`: `Error:` with its name.
3. Push `{ tool, scope, arguments }` to `audit`, with the arguments **as the model wrote them** (placeholders, not values).
4. Resolve placeholders with `broker.allowedSecrets(name)`, then `broker.issue(name, [scope])`. A `SecretAccessError` or `ScopeError` becomes `Error: <message>`.
5. Call `execute(resolvedArgs, credential)`; its text (or `Error: <message>` if it throws) is the content.
6. Redact the content with the vault **plus** the credential's token (name it `CREDENTIAL`), then revoke the credential, whatever happened.

The tests drive a fake-model agent loop across seeds with tools that echo keys in debug output and check every request the model received.
