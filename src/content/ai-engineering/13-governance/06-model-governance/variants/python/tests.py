from datetime import datetime, timezone

NOW = int(datetime(2026, 10, 31, 12, tzinfo=timezone.utc).timestamp() * 1000)
DAY = 24 * 60 * 60 * 1000
GATE = {"minimums": {"support-golden": 0.85, "refusal-safety": 0.95}, "maxRegression": 0.02}


def date(days):
    moment = datetime.fromtimestamp((NOW + days * DAY) / 1000, tz=timezone.utc)
    return moment.isoformat(timespec="milliseconds").replace("+00:00", "Z")


class Clock:
    """A settable clock in milliseconds."""

    def __init__(self):
        self.current = NOW

    def __call__(self):
        return self.current

    def advance(self, days):
        self.current += days * DAY


def registry(**options):
    clock = Clock()
    created = mod.create_model_registry(**{"now": clock, "allowed_licenses": ["commercial-api", "apache-2.0"], **options})
    created.register({"id": "acme-small-2026-05", "provider": "acme", "license": "commercial-api", "retiresAt": date(20), "replacement": "acme-small-2026-09"})
    created.register({"id": "acme-small-2026-09", "provider": "acme", "license": "commercial-api"})
    created.register({"id": "open-7b-2026-06", "provider": "self-hosted", "license": "apache-2.0"})
    return created, clock


def score_all(target, version_id, golden, safety):
    target.record_eval(version_id, "support-golden", golden)
    target.record_eval(version_id, "refusal-safety", safety)


@test("register accepts pinned versions with approved licenses only")
async def _():
    models, _clock = registry()
    await capture_error(lambda: models.register({"id": "acme-small-2026-05", "provider": "acme", "license": "commercial-api"}))
    await capture_error(lambda: models.register({"id": "acme-small-latest", "provider": "acme", "license": "commercial-api"}))
    await capture_error(lambda: models.register({"id": "leaked-weights-2026-01", "provider": "unknown", "license": "research-only"}))
    await capture_error(lambda: models.record_eval("ghost-2026-01", "support-golden", 0.9))
    models.register({"id": "open-3b-2026-07", "provider": "self-hosted", "license": "apache-2.0"})


@test("promotion requires every gate suite to have a result at or above its minimum")
async def _():
    models, _clock = registry()
    models.record_eval("acme-small-2026-09", "support-golden", 0.8)
    assert models.promote("support-default", "acme-small-2026-09", GATE) == {"promoted": False, "reasons": ["below-minimum:support-golden", "missing-eval:refusal-safety"]}
    assert models.promote("support-default", "mystery-2026-01", GATE) == {"promoted": False, "reasons": ["unknown-version"]}
    await capture_error(lambda: models.resolve("support-default"))
    score_all(models, "acme-small-2026-09", 0.9, 0.97)
    assert models.promote("support-default", "acme-small-2026-09", GATE) == {"promoted": True, "alias": "support-default", "versionId": "acme-small-2026-09"}
    assert models.resolve("support-default") == {"versionId": "acme-small-2026-09", "warnings": []}


@test("promotion blocks regressions beyond the tolerance against the currently pinned version")
def _():
    models, _clock = registry()
    score_all(models, "acme-small-2026-09", 0.93, 0.99)
    score_all(models, "open-7b-2026-06", 0.9, 0.98)
    assert models.promote("support-default", "acme-small-2026-09", GATE)["promoted"] is True
    assert models.promote("support-default", "open-7b-2026-06", GATE) == {"promoted": False, "reasons": ["regression:support-golden"]}
    models.record_eval("open-7b-2026-06", "support-golden", 0.915)
    assert models.promote("support-default", "open-7b-2026-06", GATE) == {"promoted": True, "alias": "support-default", "versionId": "open-7b-2026-06", "previous": "acme-small-2026-09"}


@test("retired versions cannot be promoted, and rollback restores the previous pin with a full history")
async def _():
    models, clock = registry()
    score_all(models, "acme-small-2026-05", 0.9, 0.97)
    score_all(models, "acme-small-2026-09", 0.91, 0.97)
    assert models.promote("support-default", "acme-small-2026-05", GATE)["promoted"] is True
    assert models.promote("support-default", "acme-small-2026-09", GATE)["promoted"] is True
    assert models.rollback("support-default") == "acme-small-2026-05"
    assert models.resolve("support-default")["versionId"] == "acme-small-2026-05"
    assert models.history("support-default") == ["acme-small-2026-05", "acme-small-2026-09", "acme-small-2026-05"]
    await capture_error(lambda: models.rollback("support-default"))
    clock.advance(25)
    assert models.promote("other-alias", "acme-small-2026-05", GATE) == {"promoted": False, "reasons": ["retired"]}


@test("resolve warns before the pinned version retires and refuses after it retired")
async def _():
    models, clock = registry()
    score_all(models, "acme-small-2026-05", 0.9, 0.97)
    models.promote("support-default", "acme-small-2026-05", GATE)
    resolution = models.resolve("support-default")
    assert resolution["versionId"] == "acme-small-2026-05"
    warnings = resolution["warnings"]
    assert len(warnings) == 1
    assert "acme-small-2026-09" in warnings[0]
    assert "20 days" in warnings[0]
    quiet, _quiet_clock = registry(warn_within_days=10)
    score_all(quiet, "acme-small-2026-05", 0.9, 0.97)
    quiet.promote("support-default", "acme-small-2026-05", GATE)
    assert quiet.resolve("support-default")["warnings"] == []
    clock.advance(20)
    await capture_error(lambda: models.resolve("support-default"))
    await capture_error(lambda: models.resolve("unknown-alias"))


@test("generate_with_alias calls exactly the pinned version and reports its warnings")
async def _():
    async def scenario():
        models, _clock = registry()
        score_all(models, "acme-small-2026-05", 0.9, 0.97)
        score_all(models, "open-7b-2026-06", 0.9, 0.97)
        models.promote("support-default", "acme-small-2026-05", GATE)
        fake_model.for_model("acme-small-2026-05").reply(respond.text(["Your order ships tomorrow.", "Order A-1001 is on its way."]))
        fake_model.for_model("open-7b-2026-06").reply(respond.text(["Shipped.", "It is in transit."]))
        warnings = []
        first = await mod.generate_with_alias(models, "support-default", {"messages": [{"role": "user", "content": "Where is my order?"}]}, warnings.append)
        assert first["model"] == "acme-small-2026-05"
        assert fake_model.requests[0]["model"] == "acme-small-2026-05"
        assert len(warnings) == 1
        models.promote("support-default", "open-7b-2026-06", GATE)
        second = await mod.generate_with_alias(models, "support-default", {"messages": [{"role": "user", "content": "Where is my order?"}]})
        assert second["model"] == "open-7b-2026-06"
        assert fake_model.pending == 0

    await for_each_seed(6, scenario)
