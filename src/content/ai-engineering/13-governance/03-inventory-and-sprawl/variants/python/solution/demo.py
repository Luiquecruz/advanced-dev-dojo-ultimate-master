import asyncio
from datetime import datetime, timezone

from dojo_ai import create_model
from dojo_ai.testing import fake_model, respond

from main import audit_inventory, create_registry, detect_shadow_ai, log_entry_from

DAY = 24 * 60 * 60 * 1000
NOW = int(datetime(2026, 10, 31, 12, tzinfo=timezone.utc).timestamp() * 1000)

PEOPLE = [
    {"id": "ana", "active": True},
    {"id": "bruno", "active": True},
    {"id": "carla", "active": False},
]


def at(days):
    moment = datetime.fromtimestamp((NOW + days * DAY) / 1000, tz=timezone.utc)
    return moment.isoformat(timespec="milliseconds").replace("+00:00", "Z")


def seed_registry():
    registry = create_registry()
    registry.register({"id": "model-small", "kind": "model", "name": "acme-small-2026-05", "owner": "ana", "createdAt": at(-150)})
    registry.register({"id": "support-agent", "kind": "agent", "name": "Support assistant", "owner": "ana", "createdAt": at(-120), "lastUsedAt": at(-1)})
    registry.register({"id": "pilot-agent", "kind": "agent", "name": "Q1 pricing pilot", "owner": "carla", "createdAt": at(-240), "lastUsedAt": at(-150)})
    registry.register({"id": "docs-mcp", "kind": "mcp-server", "name": "Internal docs MCP server", "owner": "bruno", "createdAt": at(-60)})
    registry.register({"id": "key-support", "kind": "api-key", "name": "Support gateway key", "owner": "ana", "createdAt": at(-120), "expiresAt": at(9), "lastUsedAt": at(-1)})
    registry.register({"id": "key-pilot", "kind": "api-key", "name": "Pilot key", "owner": "carla", "createdAt": at(-240), "expiresAt": at(-20), "lastUsedAt": at(-150)})
    try:
        registry.register({"id": "key-forever", "kind": "api-key", "name": "Key with no expiry", "owner": "bruno", "createdAt": at(0)})
    except ValueError as error:
        print(f"rejected: {error}")
    return registry


async def collect_gateway_log():
    traffic = [
        {"model": "acme-small-2026-05", "agent_id": "support-agent", "key_id": "key-support", "source": "support-api"},
        {"model": "acme-small-2026-05", "agent_id": "support-agent", "key_id": "key-support", "source": "support-api"},
        {"model": "frontier-x-latest", "key_id": "key-personal-7", "source": "marketing-laptop"},
        {"model": "frontier-x-latest", "key_id": "key-personal-7", "source": "marketing-laptop"},
        {"model": "frontier-x-latest", "key_id": "key-personal-7", "source": "sales-laptop"},
        {"model": "acme-small-2026-05", "agent_id": "invoice-bot", "key_id": "key-support", "source": "finance-cron"},
    ]
    log = []
    for call in traffic:
        fake_model.reply(respond.text(["Here is the summary you asked for.", "Draft ready: three campaigns, two pending approval, one blocked on legal review."]))
        response = await create_model(call["model"]).generate({"messages": [{"role": "user", "content": "Summarize this customer list for the campaign."}]})
        log.append(log_entry_from(response, key_id=call["key_id"], agent_id=call.get("agent_id"), source=call["source"], timestamp=at(0)))
    return log


def print_findings(registry):
    for finding in audit_inventory(registry.list(), PEOPLE, now=NOW):
        print(f"  {finding['issue']:<9} {finding['assetId']:<14} {finding['detail']}")


async def main():
    registry = seed_registry()
    print(f"registry: {len(registry.list())} assets, {len(registry.list('api-key'))} credentials")

    print("\ninventory audit:")
    print_findings(registry)

    registry.transfer_ownership("pilot-agent", "bruno")
    registry.retire("key-pilot", at(0))
    print("\nafter transferring pilot-agent to bruno and retiring key-pilot:")
    print_findings(registry)

    print("\nshadow AI signals from the gateway log:")
    for signal in detect_shadow_ai(registry.list(), await collect_gateway_log()):
        plural = "" if signal["calls"] == 1 else "s"
        print(f"  {signal['kind']:<18} {signal['value']:<18} {signal['calls']} call{plural}, {signal['totalTokens']} tokens from {', '.join(signal['sources'])}")


if __name__ == "__main__":
    asyncio.run(main())
