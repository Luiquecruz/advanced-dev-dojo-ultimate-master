Build the credential and secret layer of a harness: a broker that issues scoped credentials which expire, placeholder resolution at the tool boundary, redaction of secrets in every form, and a tool executor that ties them together so no secret ever reaches the model or the audit log. Time is injected with `now()` (milliseconds).

A **grant** per tool is `{"scopes": [...], "secrets": [...]}` (`"secrets"` optional): the scopes the tool may request and the names of the secrets it may use. A **vault** is a dict from secret names to values. A placeholder is `{{secret:NAME}}` (letters, digits and `_`). Credentials, verifications, tool calls and messages are plain dicts whose keys keep the JSON names (`"issuedAt"`, `"expiresAt"`, `"toolCallId"`, `"toolCalls"`).

## 1. `create_credential_broker(*, grants, ttl_ms, now=system_clock)`

Return a `CredentialBroker` with these methods:

- **`issue(tool, scopes)`** returns a new credential `{"token", "tool", "scopes", "issuedAt", "expiresAt"}` with a unique string `"token"`, the requested scopes (duplicates removed), `"issuedAt"` = `now()` and `"expiresAt"` = `"issuedAt"` + `ttl_ms`. Raise a `ScopeError` (defined in `main.py`) for a tool without a grant, an empty scope list, or any scope outside the tool's grant.
- **`verify(token, tool, scope)`** returns `{"valid": True}` or `{"valid": False, "reason": reason}`, checking in order: `"unknown"` (never issued or revoked), `"expired"` (`now() >= expiresAt`), `"wrong_tool"`, `"scope"` (not among the credential's scopes).
- **`revoke(token)`** forgets the token.
- **`allowed_secrets(tool)`** returns the secret names in the tool's grant (`[]` when none).

## 2. `resolve_placeholders(value, vault, allowed_secrets)`

Return a copy of `value` where every placeholder inside any string, at any depth of lists and dicts, is replaced by the vault value. Other values are returned as they are, and the input is not modified. A placeholder whose name is not in `allowed_secrets` or not in the vault raises a `SecretAccessError` (defined in `main.py`) whose message contains the **name** and never a secret value.

## 3. `redact_secrets(text, vault)`

Replace every occurrence of each non-empty secret with `[REDACTED:NAME]`, in three forms: the raw value, its base64 encoding (UTF-8) and its URL encoding as JavaScript's `encodeURIComponent` writes it (`urllib.parse.quote(value, safe="!~*'()")`). Replace the longest forms first, so a secret that contains another is redacted whole.

## 4. `find_leaked_secrets(messages, vault)`

The names (in vault order) of the non-empty secrets whose raw, base64 or URL-encoded form appears in any message `"content"` or in the `"arguments"` of any of its `"toolCalls"`.

## 5. `execute_tool_call(tool_call, *, tools, broker, vault, audit=None)`

`tools` maps tool names to `{"scope": ..., "execute": function}`, where `execute(arguments, credential)` returns a string (or a coroutine that returns one). Return a tool message `{"role": "tool", "toolCallId", "content"}` and **never raise**:

1. Arguments that are not a JSON object: `"content"` starts with `Error:`.
2. A tool missing from `tools`: `Error:` with its name.
3. Append `{"tool", "scope", "arguments"}` to `audit` (when given), with the arguments **as the model wrote them** (placeholders, not values).
4. Resolve placeholders with `broker.allowed_secrets(name)`, then `broker.issue(name, [scope])`. A `SecretAccessError` or `ScopeError` becomes `Error: <message>`.
5. Call `execute(resolved_arguments, credential)`; its text (or `Error: <message>` if it raises) is the content.
6. Redact the content with the vault **plus** the credential's token (name it `CREDENTIAL`), then revoke the credential, whatever happened.

The tests drive a fake-model agent loop across seeds with tools that echo keys in debug output and check every request the model received.
