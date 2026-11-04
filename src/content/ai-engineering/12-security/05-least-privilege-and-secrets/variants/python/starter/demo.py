import asyncio
import json

from dojo_ai import create_model
from dojo_ai.testing import fake_model, respond

from main import create_credential_broker, execute_tool_call, find_leaked_secrets

VAULT = {"CRM_API_KEY": "crm_live_9f8e7d6c5b4a", "SMTP_PASSWORD": "p@ss word/42"}

GRANTS = {
    "crm_lookup": {"scopes": ["crm:read"], "secrets": ["CRM_API_KEY"]},
    "send_email": {"scopes": ["mail:send"], "secrets": ["SMTP_PASSWORD"]},
}

clock = {"now": 0}
broker = create_credential_broker(grants=GRANTS, ttl_ms=60_000, now=lambda: clock["now"])


def crm_lookup(arguments, credential):
    check = broker.verify(credential["token"], "crm_lookup", "crm:read")
    status = "valid" if check["valid"] else "invalid"
    return f"Customer {arguments['customerId']}: Ada Lovelace, plan pro (credential {status}, debug: key={arguments['apiKey']}, token={credential['token']})"


TOOLS = {
    "crm_lookup": {"scope": "crm:read", "execute": crm_lookup},
    "send_email": {"scope": "mail:send", "execute": lambda arguments, credential: "Email sent"},
}


async def main():
    fake_model.reply(
        respond.tool_calls([
            {"name": "crm_lookup", "arguments": {"customerId": "c-42", "apiKey": "{{secret:CRM_API_KEY}}"}},
            {"name": "crm_lookup", "arguments": {"customerId": "c-43", "apiKey": "{{secret:SMTP_PASSWORD}}"}},
        ]),
        respond.text("Customer c-42 is on the pro plan."),
    )
    model = create_model()
    audit = []
    messages = [
        {"role": "system", "content": "Credentials are written as {{secret:NAME}} placeholders. Available: CRM_API_KEY, SMTP_PASSWORD."},
        {"role": "user", "content": "Which plan is customer c-42 on?"},
    ]
    first = await model.generate({"messages": messages, "tools": [{"name": name} for name in TOOLS]})
    messages.append({"role": "assistant", "content": first["text"], "toolCalls": first["toolCalls"]})
    for call in first["toolCalls"]:
        clock["now"] += 1_000
        message = await execute_tool_call(call, tools=TOOLS, broker=broker, vault=VAULT, audit=audit)
        print(f"{call['name']} {call['arguments']}\n  -> {message['content']}")
        messages.append(message)
    final = await model.generate({"messages": messages})
    print(f"\nanswer: {final['text']}")
    print("audit log:")
    for entry in audit:
        print(f"  {entry['tool']} [{entry['scope']}] {json.dumps(entry['arguments'], separators=(',', ':'))}")
    sent = [message for request in fake_model.requests for message in request["messages"]]
    print(f"secrets that reached the model: [{', '.join(find_leaked_secrets(sent, VAULT))}]")


if __name__ == "__main__":
    asyncio.run(main())
