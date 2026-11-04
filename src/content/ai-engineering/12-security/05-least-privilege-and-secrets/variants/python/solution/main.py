import base64
import inspect
import json
import re
import time
import uuid
from urllib.parse import quote

PLACEHOLDER = re.compile(r"\{\{secret:([A-Za-z0-9_]+)\}\}")


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
        grant = self.grants.get(tool)
        if grant is None:
            raise ScopeError(f'No grant for tool "{tool}"')
        if len(scopes) == 0:
            raise ScopeError(f'Tool "{tool}" requested no scope')
        denied = [scope for scope in scopes if scope not in grant["scopes"]]
        if denied:
            raise ScopeError(f'Tool "{tool}" may not use {", ".join(denied)}')
        issued_at = self.now()
        credential = {
            "token": f"tok_{uuid.uuid4()}",
            "tool": tool,
            "scopes": list(dict.fromkeys(scopes)),
            "issuedAt": issued_at,
            "expiresAt": issued_at + self.ttl_ms,
        }
        self.issued[credential["token"]] = credential
        return {**credential, "scopes": list(credential["scopes"])}

    def verify(self, token, tool, scope):
        credential = self.issued.get(token)
        if credential is None:
            return {"valid": False, "reason": "unknown"}
        if self.now() >= credential["expiresAt"]:
            return {"valid": False, "reason": "expired"}
        if credential["tool"] != tool:
            return {"valid": False, "reason": "wrong_tool"}
        if scope not in credential["scopes"]:
            return {"valid": False, "reason": "scope"}
        return {"valid": True}

    def revoke(self, token):
        self.issued.pop(token, None)

    def allowed_secrets(self, tool):
        return list(self.grants.get(tool, {}).get("secrets", []))


def create_credential_broker(*, grants, ttl_ms, now=system_clock):
    return CredentialBroker(grants, ttl_ms, now)


def resolve_placeholders(value, vault, allowed_secrets):
    if isinstance(value, str):
        def replace(match):
            name = match.group(1)
            if name not in allowed_secrets or name not in vault:
                raise SecretAccessError(f"Secret {name} is not available to this tool")
            return vault[name]

        return PLACEHOLDER.sub(replace, value)
    if isinstance(value, list):
        return [resolve_placeholders(item, vault, allowed_secrets) for item in value]
    if isinstance(value, dict):
        return {key: resolve_placeholders(item, vault, allowed_secrets) for key, item in value.items()}
    return value


def secret_forms(value):
    encoded = base64.b64encode(value.encode("utf-8")).decode("ascii")
    return list(dict.fromkeys([value, encoded, quote(value, safe="!~*'()")]))


def redact_secrets(text, vault):
    forms = [(name, form) for name, value in vault.items() if value != "" for form in secret_forms(value)]
    forms.sort(key=lambda entry: len(entry[1]), reverse=True)
    for name, form in forms:
        text = text.replace(form, f"[REDACTED:{name}]")
    return text


def find_leaked_secrets(messages, vault):
    texts = []
    for message in messages:
        texts.append(message.get("content") or "")
        texts.extend(call["arguments"] for call in message.get("toolCalls", []))
    return [
        name
        for name, value in vault.items()
        if value != "" and any(form in text for form in secret_forms(value) for text in texts)
    ]


async def execute_tool_call(tool_call, *, tools, broker, vault, audit=None):
    if audit is None:
        audit = []

    def reply(content, extra_vault=None):
        return {"role": "tool", "toolCallId": tool_call["id"], "content": redact_secrets(content, {**vault, **(extra_vault or {})})}

    try:
        arguments = json.loads(tool_call["arguments"])
    except ValueError:
        return reply("Error: arguments must be a JSON object")
    if not isinstance(arguments, dict):
        return reply("Error: arguments must be a JSON object")
    tool = tools.get(tool_call["name"])
    if tool is None:
        return reply(f"Error: unknown tool {tool_call['name']}")
    audit.append({"tool": tool_call["name"], "scope": tool["scope"], "arguments": json.loads(tool_call["arguments"])})
    try:
        resolved = resolve_placeholders(arguments, vault, broker.allowed_secrets(tool_call["name"]))
        credential = broker.issue(tool_call["name"], [tool["scope"]])
    except (SecretAccessError, ScopeError) as error:
        return reply(f"Error: {error}")
    credential_vault = {"CREDENTIAL": credential["token"]}
    try:
        result = tool["execute"](resolved, credential)
        if inspect.isawaitable(result):
            result = await result
        return reply(result, credential_vault)
    except Exception as error:
        return reply(f"Error: {error}", credential_vault)
    finally:
        broker.revoke(credential["token"])
