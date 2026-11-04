import time
import uuid


class ScopeError(Exception):
    pass


class SecretAccessError(Exception):
    pass


def system_clock():
    return time.time_ns() // 1_000_000


class CredentialBroker:
    """Issues short-lived credentials limited to the scopes of each tool's grant."""

    def __init__(self, grants, ttl_ms, now):
        self.grants = grants
        self.ttl_ms = ttl_ms
        self.now = now
        self.issued = {}

    def issue(self, tool, scopes):
        # TODO: refuse unknown tools, empty requests and scopes outside the tool's grant with a ScopeError
        credential = {
            "token": f"tok_{uuid.uuid4()}",
            "tool": tool,
            "scopes": self.grants.get(tool, {}).get("scopes", scopes),
            "issuedAt": self.now(),
            "expiresAt": self.now() + self.ttl_ms,
        }
        self.issued[credential["token"]] = credential
        return credential

    def verify(self, token, tool, scope):
        # TODO: check expiry (expired at expiresAt), the tool and the scope
        if token in self.issued:
            return {"valid": True}
        return {"valid": False, "reason": "unknown"}

    def revoke(self, token):
        # TODO: forget the token
        pass

    def allowed_secrets(self, tool):
        return list(self.grants.get(tool, {}).get("secrets", []))


def create_credential_broker(*, grants, ttl_ms, now=system_clock):
    return CredentialBroker(grants, ttl_ms, now)


def resolve_placeholders(value, vault, allowed_secrets):
    # TODO: replace {{secret:NAME}} in nested strings, lists and dicts; raise SecretAccessError for names that are not allowed or missing
    raise NotImplementedError("Not implemented")


def redact_secrets(text, vault):
    # TODO: also redact base64 and URL-encoded forms, longest first, and skip empty values
    for name, value in vault.items():
        text = text.replace(value, f"[REDACTED:{name}]")
    return text


def find_leaked_secrets(messages, vault):
    # TODO: names of the secrets whose value (raw, base64 or URL-encoded) appears in any message content or tool call arguments
    raise NotImplementedError("Not implemented")


async def execute_tool_call(tool_call, *, tools, broker, vault, audit=None):
    # TODO: parse, audit with placeholders, resolve secrets, issue a credential, execute, redact, revoke; never raise
    raise NotImplementedError("Not implemented")
