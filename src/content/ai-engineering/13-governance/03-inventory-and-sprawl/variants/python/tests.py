from datetime import datetime, timezone

from dojo_ai import create_model

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


def asset(**overrides):
    return {"kind": "agent", "name": overrides["id"], "owner": "ana", "createdAt": at(-10), **overrides}


def contains(record, expected):
    return all(key in record and record[key] == value for key, value in expected.items())


def issues(findings):
    return [f"{finding['issue']}:{finding['assetId']}" for finding in findings]


@test("register rejects duplicate ids, unknown kinds, missing owners and credentials without expiry")
async def _():
    registry = mod.create_registry()
    registry.register(asset(id="support-agent"))
    registry.register(asset(id="key-support", kind="api-key", expiresAt=at(30)))
    registry.register(asset(id="model-small", kind="model", name="acme-small-2026-05"))
    await capture_error(lambda: registry.register(asset(id="support-agent")))
    await capture_error(lambda: registry.register(asset(id="mystery", kind="robot")))
    await capture_error(lambda: registry.register(asset(id="no-owner", owner="")))
    await capture_error(lambda: registry.register(asset(id="blank-owner", owner="   ")))
    await capture_error(lambda: registry.register(asset(id="key-forever", kind="api-key")))
    assert [item["id"] for item in registry.list()] == ["support-agent", "key-support", "model-small"]
    assert [item["id"] for item in registry.list("api-key")] == ["key-support"]
    assert contains(registry.get("model-small"), {"kind": "model", "name": "acme-small-2026-05", "owner": "ana"})
    assert registry.get("nothing") is None


@test("the registry hands out copies, and transfer_ownership and retire update the stored record")
async def _():
    registry = mod.create_registry()
    registry.register(asset(id="triage-agent", owner="carla"))
    copy = registry.get("triage-agent")
    copy["owner"] = "mallory"
    registry.list()[0]["owner"] = "mallory"
    assert registry.get("triage-agent")["owner"] == "carla"
    assert contains(registry.transfer_ownership("triage-agent", "bruno"), {"id": "triage-agent", "owner": "bruno"})
    assert contains(registry.retire("triage-agent", at(0)), {"id": "triage-agent", "retiredAt": at(0)})
    assert contains(registry.get("triage-agent"), {"owner": "bruno", "retiredAt": at(0)})
    await capture_error(lambda: registry.transfer_ownership("ghost-agent", "bruno"))
    await capture_error(lambda: registry.retire("ghost-agent", at(0)))


@test("audit_inventory flags every asset whose owner left or is unknown")
def _():
    findings = mod.audit_inventory(
        [asset(id="pilot-agent", owner="carla", lastUsedAt=at(-1)), asset(id="docs-mcp", kind="mcp-server", owner="zed"), asset(id="support-agent", lastUsedAt=at(-1))],
        PEOPLE,
        now=NOW,
    )
    assert [finding["assetId"] for finding in findings if finding["issue"] == "orphaned"] == ["docs-mcp", "pilot-agent"]
    for finding in findings:
        assert isinstance(finding["detail"], str)
    assert not any(finding["assetId"] == "support-agent" for finding in findings)


@test("audit_inventory flags expired and expiring credentials relative to the injected now")
def _():
    keys = [
        asset(id="key-expired", kind="api-key", expiresAt=at(-3), lastUsedAt=at(-1)),
        asset(id="key-expires-now", kind="api-key", expiresAt=at(0), lastUsedAt=at(-1)),
        asset(id="key-expiring", kind="api-key", expiresAt=at(10), lastUsedAt=at(-1)),
        asset(id="key-edge", kind="api-key", expiresAt=at(14), lastUsedAt=at(-1)),
        asset(id="key-fine", kind="api-key", expiresAt=at(60), lastUsedAt=at(-1)),
    ]
    assert issues(mod.audit_inventory(keys, PEOPLE, now=NOW)) == ["expired:key-expired", "expired:key-expires-now", "expiring:key-edge", "expiring:key-expiring"]
    assert issues(mod.audit_inventory(keys, PEOPLE, now=NOW, expiring_within_days=7)) == ["expired:key-expired", "expired:key-expires-now"]
    assert issues(mod.audit_inventory(keys, PEOPLE, now=NOW + 61 * DAY)) == ["expired:key-edge", "expired:key-expired", "expired:key-expires-now", "expired:key-expiring", "expired:key-fine"]


@test("audit_inventory flags idle keys and agents as stale, skips retired assets and sorts by issue then id")
def _():
    findings = mod.audit_inventory(
        [
            asset(id="report-agent", lastUsedAt=at(-120)),
            asset(id="key-unused", kind="api-key", createdAt=at(-200), expiresAt=at(200)),
            asset(id="key-recent", kind="api-key", createdAt=at(-200), expiresAt=at(200), lastUsedAt=at(-5)),
            asset(id="old-prompt", kind="prompt", createdAt=at(-400)),
            asset(id="retired-agent", owner="carla", lastUsedAt=at(-300), retiredAt=at(-200)),
            asset(id="alpha-agent", owner="carla", lastUsedAt=at(-91)),
        ],
        PEOPLE,
        now=NOW,
    )
    assert issues(findings) == ["orphaned:alpha-agent", "stale:alpha-agent", "stale:key-unused", "stale:report-agent"]
    assert mod.audit_inventory([asset(id="report-agent", lastUsedAt=at(-120))], PEOPLE, now=NOW, stale_after_days=180) == []


@test("log_entry_from records the model and the tokens the provider reports, for every reply length")
async def _():
    async def scenario():
        fake_model.reply(respond.text(["Done.", "Your refund was approved and will arrive within five business days.", "I could not find that order; can you share the order number?"]))
        response = await create_model("acme-small-2026-05").generate({"messages": [{"role": "user", "content": "Where is my refund?"}]})
        entry = mod.log_entry_from(response, key_id="key-support", agent_id="support-agent", source="support-api", timestamp=at(0))
        assert contains(entry, {"timestamp": at(0), "keyId": "key-support", "agentId": "support-agent", "source": "support-api", "model": "acme-small-2026-05", "totalTokens": response["usage"]["totalTokens"]})

    await for_each_seed(10, scenario)
    response = await create_model().generate({"messages": [{"role": "user", "content": "hi"}]})
    assert "agentId" not in mod.log_entry_from(response, key_id="key-x", source="laptop", timestamp=at(0))


@test("detect_shadow_ai aggregates unregistered keys, models and agents and the use of retired assets")
async def _():
    assets = [
        asset(id="support-agent"),
        asset(id="old-agent", retiredAt=at(-30)),
        asset(id="key-support", kind="api-key", expiresAt=at(30)),
        asset(id="key-old", kind="api-key", expiresAt=at(30), retiredAt=at(-30)),
        asset(id="model-small", kind="model", name="acme-small-2026-05"),
    ]
    calls = [
        ("acme-small-2026-05", "support-agent", "key-support", "support-api"),
        ("acme-small-2026-05", "support-agent", "key-support", "support-api"),
        ("frontier-x-latest", None, "key-personal-7", "marketing-laptop"),
        ("frontier-x-latest", None, "key-personal-7", "sales-laptop"),
        ("frontier-x-latest", None, "key-personal-7", "marketing-laptop"),
        ("acme-small-2026-05", "invoice-bot", "key-support", "finance-cron"),
        ("acme-small-2026-05", "old-agent", "key-old", "legacy-cron"),
    ]
    log = []
    for model, agent_id, key_id, source in calls:
        fake_model.reply(respond.text("ok"))
        response = await create_model(model).generate({"messages": [{"role": "user", "content": "Summarize the open tickets."}]})
        log.append(mod.log_entry_from(response, key_id=key_id, agent_id=agent_id, source=source, timestamp=at(0)))
    signals = mod.detect_shadow_ai(assets, log)
    assert [[signal["kind"], signal["value"], signal["calls"]] for signal in signals] == [
        ["unregistered-model", "frontier-x-latest", 3],
        ["unregistered-key", "key-personal-7", 3],
        ["unregistered-agent", "invoice-bot", 1],
        ["retired-asset", "key-old", 1],
        ["retired-asset", "old-agent", 1],
    ]
    assert signals[1]["sources"] == ["marketing-laptop", "sales-laptop"]
    assert signals[1]["totalTokens"] == sum(entry["totalTokens"] for entry in log[2:5])
    assert mod.detect_shadow_ai(assets, log[0:2]) == []
