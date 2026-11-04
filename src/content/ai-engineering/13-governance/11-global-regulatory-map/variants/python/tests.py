import re
from datetime import date

rules_module = modules["rules.py"]
RULES = rules_module.RULES
RULES_AS_OF = rules_module.RULES_AS_OF

RULE_TABLE = [
    {"id": "alpha-disclose", "jurisdiction": "AA", "instrument": "Alpha AI Law, Art. 3", "status": "law", "appliesFrom": "2026-01-01", "when": {"uses": ["chatbot"]}, "obligation": "Disclose AI."},
    {"id": "alpha-high-risk", "jurisdiction": "AA", "instrument": "Alpha AI Law, Art. 9", "status": "law", "appliesFrom": "2027-06-01", "when": {"uses": ["credit-decision", "employment-decision"], "dataTypes": ["personal"]}, "obligation": "Impact assessment."},
    {"id": "alpha-bill", "jurisdiction": "AA", "instrument": "Alpha Bill 12", "status": "bill", "when": {"uses": ["chatbot"]}, "obligation": "Proposed: label outputs."},
    {"id": "beta-federal", "jurisdiction": "BB", "instrument": "Beta Consumer Act", "status": "law", "when": {"users": ["consumers"]}, "obligation": "No deception."},
    {"id": "beta-state", "jurisdiction": "BB-NORTH", "instrument": "North Hiring Act", "status": "law", "appliesFrom": "2026-03-01", "when": {"uses": ["employment-decision"]}, "obligation": "Bias audit."},
    {"id": "gamma-everything", "jurisdiction": "GG", "instrument": "Gamma Promotion Act", "status": "law", "appliesFrom": "2025-01-01", "when": {}, "obligation": "Cooperate."},
]

PRODUCT = {
    "name": "Lumen",
    "markets": ["AA", "BB-NORTH"],
    "features": [
        {"id": "support-chat", "uses": ["chatbot"], "dataTypes": ["personal"], "users": ["consumers"]},
        {"id": "credit-limit", "uses": ["credit-decision"], "dataTypes": ["personal"], "users": ["consumers"]},
        {"id": "cv-screening", "uses": ["employment-decision"], "dataTypes": ["personal"], "users": ["job-applicants"]},
    ],
}


def key_of(obligation):
    return f"{obligation['ruleId']}/{obligation['featureId']}:{obligation['status']}"


def keys_at(as_of, profile=PRODUCT, rules=RULE_TABLE):
    return [key_of(obligation) for obligation in mod.map_obligations(profile, rules, as_of)]


def is_date(text):
    try:
        date.fromisoformat(text)
        return True
    except ValueError:
        return False


@test("covers_market matches the same jurisdiction and its sub-markets, never the reverse")
def _():
    assert mod.covers_market("BB", ["BB-NORTH"]) is True
    assert mod.covers_market("BB", ["BB"]) is True
    assert mod.covers_market("BB-NORTH", ["BB"]) is False
    assert mod.covers_market("BB-NORTH", ["BB-SOUTH", "AA"]) is False
    assert mod.covers_market("AA", ["AAX"]) is False
    assert mod.covers_market("AA", []) is False


@test("matches_feature needs a shared value for every key the condition sets, and an empty condition matches everything")
def _():
    feature = PRODUCT["features"][1]
    assert mod.matches_feature({"uses": ["chatbot", "credit-decision"]}, feature) is True
    assert mod.matches_feature({"uses": ["credit-decision"], "dataTypes": ["sensitive"]}, feature) is False
    assert mod.matches_feature({"uses": ["credit-decision"], "dataTypes": ["personal"], "users": ["consumers"]}, feature) is True
    assert mod.matches_feature({"users": ["minors"]}, feature) is False
    assert mod.matches_feature({}, feature) is True


@test("map_obligations returns one obligation per matching rule and feature, with its source rule, only in the product markets")
def _():
    obligations = mod.map_obligations(PRODUCT, RULE_TABLE, "2026-11-01")
    assert [key_of(obligation) for obligation in obligations] == [
        "alpha-bill/support-chat:proposed",
        "alpha-disclose/support-chat:applies",
        "alpha-high-risk/credit-limit:upcoming",
        "alpha-high-risk/cv-screening:upcoming",
        "beta-federal/credit-limit:applies",
        "beta-federal/support-chat:applies",
        "beta-state/cv-screening:applies",
    ]
    assert obligations[2] == {"ruleId": "alpha-high-risk", "jurisdiction": "AA", "instrument": "Alpha AI Law, Art. 9", "featureId": "credit-limit", "obligation": "Impact assessment.", "status": "upcoming", "appliesFrom": "2027-06-01"}
    assert "appliesFrom" not in obligations[0]
    assert not any(obligation["jurisdiction"] == "GG" for obligation in obligations)


@test("statuses follow the date: a law applies from its first day, a law without a date applies, a bill stays proposed")
def _():
    assert "alpha-high-risk/credit-limit:upcoming" in keys_at("2027-05-31")
    assert "alpha-high-risk/credit-limit:applies" in keys_at("2027-06-01")
    assert "beta-state/cv-screening:upcoming" in keys_at("2026-02-28")
    assert "alpha-bill/support-chat:proposed" in keys_at("2030-01-01")
    assert "beta-federal/support-chat:applies" in keys_at("2020-01-01")
    assert keys_at("2026-11-01", {**PRODUCT, "markets": ["GG"]}) == ["gamma-everything/credit-limit:applies", "gamma-everything/cv-screening:applies", "gamma-everything/support-chat:applies"]


@test("summarize counts obligations per jurisdiction and status, and check_freshness flags a rules table older than a quarter")
def _():
    assert mod.summarize(mod.map_obligations(PRODUCT, RULE_TABLE, "2026-11-01")) == {
        "AA": {"applies": 1, "upcoming": 2, "proposed": 1},
        "BB": {"applies": 2, "upcoming": 0, "proposed": 0},
        "BB-NORTH": {"applies": 1, "upcoming": 0, "proposed": 0},
    }
    assert mod.summarize([]) == {}
    assert mod.check_freshness("2026-10-31", "2026-11-30") == {"fresh": True, "ageDays": 30}
    assert mod.check_freshness("2026-10-31", "2027-01-31") == {"fresh": True, "ageDays": 92}
    assert mod.check_freshness("2026-10-31", "2027-02-01") == {"fresh": False, "ageDays": 93}
    assert mod.check_freshness("2026-10-31", "2026-12-31", 30) == {"fresh": False, "ageDays": 61}


@test("the seeded rules table is dated and every rule names its source, status and a valid date")
def _():
    assert re.fullmatch(r"\d{4}-\d{2}-\d{2}", RULES_AS_OF)
    ids = [rule["id"] for rule in RULES]
    assert len(set(ids)) == len(ids)
    for rule in RULES:
        assert len(rule["instrument"]) > 5
        assert len(rule["obligation"]) > 10
        assert rule["status"] in ["law", "bill"]
        if "appliesFrom" in rule:
            assert is_date(rule["appliesFrom"])
        if rule["status"] == "bill":
            assert "appliesFrom" not in rule
    for jurisdiction in ["EU", "BR", "US", "US-CA", "US-CO", "UK", "CN", "KR", "JP"]:
        assert any(rule["jurisdiction"] == jurisdiction for rule in RULES)


@test("with the seeded table, an EU and Brazil hiring and support product gets dated obligations in both markets")
def _():
    product = {
        "name": "Talento",
        "markets": ["EU", "BR"],
        "features": [
            {"id": "cv-screening", "uses": ["employment-decision"], "dataTypes": ["personal"], "users": ["job-applicants"]},
            {"id": "candidate-chat", "uses": ["chatbot"], "dataTypes": ["personal"], "users": ["job-applicants"]},
        ],
    }
    now = mod.map_obligations(product, RULES, "2026-11-01")
    keys = [key_of(obligation) for obligation in now]
    assert "eu-ai-act-annex3-employment/cv-screening:upcoming" in keys
    assert "eu-gdpr-art22/cv-screening:applies" in keys
    assert "eu-ai-act-art50-interaction/candidate-chat:applies" in keys
    assert "br-lgpd-art20-review/cv-screening:applies" in keys
    assert "br-pl-2338-high-risk/cv-screening:proposed" in keys
    assert all(obligation["jurisdiction"] in ["EU", "BR"] for obligation in now)
    assert next(obligation for obligation in now if obligation["ruleId"] == "eu-ai-act-annex3-employment")["appliesFrom"] == "2027-12-02"
    assert "eu-ai-act-annex3-employment/cv-screening:applies" in keys_at("2027-12-02", product, RULES)
    assert "eu-ai-act-art50-interaction/candidate-chat:upcoming" in keys_at("2026-07-01", product, RULES)
