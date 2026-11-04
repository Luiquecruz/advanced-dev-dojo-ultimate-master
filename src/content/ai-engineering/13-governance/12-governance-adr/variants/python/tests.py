import re
from datetime import date

ADR = mod.ADR
GOVERNANCE_PLAN = mod.GOVERNANCE_PLAN

LAYERS = ["organizational", "regulatory", "data", "model", "agent-identity", "application", "operational-cost", "engineering", "audit"]
OWNERS = ["cto", "ai-platform-team", "data-protection-officer", "legal-compliance", "security-team", "credit-product-team", "support-product-team", "finance-finops", "engineering-leadership", "internal-audit"]
LEGAL_BASES = ["consent", "contract", "legitimate-interest", "legal-obligation", "credit-protection"]
CUSTOMER_FEATURES = ["support-chat", "credit-limit", "collections-email"]


def is_integer(value):
    return isinstance(value, int) and not isinstance(value, bool)


def is_number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def parse_date(text):
    try:
        return date.fromisoformat(text[:10])
    except (TypeError, ValueError):
        return None


def layer(name):
    return next((item for item in GOVERNANCE_PLAN["layers"] if item["layer"] == name), None)


def obligation(feature, jurisdiction, instrument):
    return next(
        (item for item in GOVERNANCE_PLAN["regulatory"]["obligations"] if item["feature"] == feature and item["jurisdiction"] == jurisdiction and re.search(instrument, item["instrument"])),
        None,
    )


def status_of(feature, jurisdiction, instrument):
    found = obligation(feature, jurisdiction, instrument)
    return None if found is None else found["status"]


@test('the ADR is an accepted governance decision whose context names the sprawl findings and the regulation, with a "We will" decision')
def _():
    assert is_integer(ADR["id"]) and ADR["id"] > 0
    assert ADR["status"] == "accepted"
    assert ADR["layer"] == "governance"
    assert len(ADR["title"].strip()) >= 10
    assert len(ADR["context"].strip()) >= 80
    assert re.search(r"owner|sprawl|shadow|shared key", ADR["context"], re.IGNORECASE)
    assert re.search(r"LGPD|GDPR|AI Act", ADR["context"])
    assert len(ADR["decision"].strip()) >= 40
    assert re.match(r"we will\b", ADR["decision"].strip(), re.IGNORECASE)


@test("lists at least two distinct rejected alternatives with reasons, and positive and negative consequences")
def _():
    assert len(ADR["alternatives"]) >= 2
    for alternative in ADR["alternatives"]:
        assert len(alternative["option"].strip()) >= 3
        assert len(alternative["reason"].strip()) >= 20
    options = [alternative["option"].strip().lower() for alternative in ADR["alternatives"]]
    assert len(set(options)) == len(options)
    for side in ["positive", "negative"]:
        items = ADR["consequences"][side]
        assert len(items) >= 1
        for item in items:
            assert len(item.strip()) >= 15


@test("every governance layer appears once with a real owner, controls, an enforcement point and evidence, and no layer that must run at runtime is left to process")
def _():
    assert sorted(item["layer"] for item in GOVERNANCE_PLAN["layers"]) == sorted(LAYERS)
    for item in GOVERNANCE_PLAN["layers"]:
        assert item["owner"] in OWNERS
        assert len(item["controls"]) >= 1
        assert item["enforcement"] in ["runtime", "ci", "process"]
        assert len(item["evidence"].strip()) >= 10
    for name in ["data", "agent-identity", "operational-cost"]:
        assert layer(name)["enforcement"] == "runtime"
    assert layer("model")["enforcement"] in ["ci", "runtime"]
    assert layer("data")["owner"] == "data-protection-officer"
    assert layer("regulatory")["owner"] == "legal-compliance"
    assert layer("audit")["owner"] != layer("agent-identity")["owner"]
    assert layer("audit")["owner"] != "ai-platform-team"


@test("inventory and identity fix the sprawl findings: owners, expiring credentials, a sanctioned alternative, one identity per agent and tamper-evident audit")
def _():
    inventory = GOVERNANCE_PLAN["inventory"]
    identity = GOVERNANCE_PLAN["identity"]
    assert inventory["requireOwner"] is True
    assert is_number(inventory["credentialMaxTtlDays"])
    assert 0 < inventory["credentialMaxTtlDays"] <= 90
    assert is_number(inventory["auditEveryDays"])
    assert 0 < inventory["auditEveryDays"] <= 30
    assert inventory["shadowAiResponse"] == "sanctioned-alternative"
    assert identity["perAgentIdentity"] is True
    assert identity["sharedKeysAllowed"] is False
    assert identity["decisionPoint"] == "every-tool-call"
    assert identity["defaultEffect"] == "deny"
    assert identity["auditLog"] == "hash-chained"
    assert identity["killSwitch"] is True
    assert is_number(identity["auditRetentionYears"])
    assert identity["auditRetentionYears"] >= 5


@test("data and model governance follow the briefing: a purpose and legal basis per customer feature, allowlist minimization, 90-day retention, pinned and eval-gated models migrated in time")
def _():
    data = GOVERNANCE_PLAN["data"]
    models = GOVERNANCE_PLAN["models"]
    for feature in CUSTOMER_FEATURES:
        purpose = next((item for item in data["purposes"] if item["feature"] == feature), None)
        assert purpose is not None
        assert purpose["legalBasis"] in LEGAL_BASES
    for item in data["purposes"]:
        if re.search(r"marketing", item["name"], re.IGNORECASE):
            assert item["legalBasis"] == "consent"
    assert data["minimization"] == "allowlist"
    assert is_number(data["retentionDays"])
    assert 0 < data["retentionDays"] <= 90
    assert data["providerTraining"] == "opted-out"
    assert models["pinnedVersions"] is True
    for suite in ["support-golden", "credit-fairness", "refusal-safety"]:
        assert suite in models["requiredEvals"]
    assert is_number(models["maxRegression"])
    assert 0 <= models["maxRegression"] <= 0.05
    migration_start = parse_date(models["migrationStartBy"])
    assert migration_start is not None
    assert (date(2027, 1, 15) - migration_start).days >= 30


@test("cost governance fits the monthly budget, covers every AI feature, alerts before the limit and stops runaway loops")
def _():
    cost = GOVERNANCE_PLAN["cost"]
    assert is_number(cost["monthlyLimitUsd"])
    assert 0 < cost["monthlyLimitUsd"] <= 12000
    total = sum(budget["limitUsd"] for budget in cost["budgets"])
    assert total <= cost["monthlyLimitUsd"]
    for feature in [*CUSTOMER_FEATURES, "coding-assistant"]:
        assert any(budget.get("feature") == feature for budget in cost["budgets"])
    for budget in cost["budgets"]:
        assert is_number(budget["limitUsd"])
        assert budget["limitUsd"] > 0
    assert any(is_number(threshold) and 0 < threshold < 1 for threshold in cost["alertThresholds"])
    assert cost["hardLimit"] is True
    assert cost["rateLimitPerAgent"] is True


@test("credit decisions keep meaningful human oversight, and the regulatory map covers Brazil and the EU with the right statuses")
def _():
    oversight = GOVERNANCE_PLAN["oversight"]
    regulatory = GOVERNANCE_PLAN["regulatory"]
    assert oversight["creditDecisions"] != "none"
    assert is_number(oversight["reviewQueueMaxPerAnalystPerDay"])
    assert 0 < oversight["reviewQueueMaxPerAnalystPerDay"] <= 80
    assert oversight["overrideRateTracked"] is True
    assert oversight["appealPath"] is True
    assert sorted(regulatory["markets"]) == ["BR", "EU"]
    assert is_number(regulatory["reviewEveryDays"])
    assert 0 < regulatory["reviewEveryDays"] <= 92
    assert status_of("credit-limit", "BR", r"LGPD") == "applies"
    assert obligation("credit-limit", "BR", r"LGPD.*20|20.*LGPD") is not None
    assert status_of("credit-limit", "EU", r"GDPR.*22|22.*GDPR") == "applies"
    assert status_of("credit-limit", "EU", r"AI Act") == "upcoming"
    assert status_of("support-chat", "EU", r"AI Act.*50|50.*AI Act") == "applies"
    for item in regulatory["obligations"]:
        assert item["jurisdiction"] in ["BR", "EU"]
        if re.search(r"PL\s*2338", item["instrument"]):
            assert item["status"] == "proposed"
