import re

TOOL_LEGS = {
    "read_ticket": ["untrustedContent"],
    "lookup_customer": ["privateData"],
    "search_help_center": [],
    "fetch_url": ["untrustedContent", "externalCommunication"],
    "send_email": ["externalCommunication"],
    "draft_reply": [],
    "issue_refund": [],
}
TOOL_CREDENTIALS = {
    "lookup_customer": "crm-read:per-ticket",
    "search_help_center": "kb-read",
    "send_email": "smtp-send",
    "draft_reply": "helpdesk-write:per-ticket",
    "issue_refund": "payments-refund:per-request",
}
CREDENTIALS = ["crm-read:per-ticket", "crm-admin", "kb-read", "helpdesk-write:per-ticket", "payments-refund:per-request", "smtp-send", "ops-root"]
LEGS = ["privateData", "untrustedContent", "externalCommunication"]
OWASP_IDS = [f"LLM{index:02d}" for index in range(1, 11)] + [f"ASI{index:02d}" for index in range(1, 11)]
MITIGATIONS = [
    "draft-only-replies",
    "no-url-fetching",
    "no-remote-images",
    "refund-approval",
    "refund-limits",
    "scoped-short-lived-credentials",
    "secrets-out-of-context",
    "pii-redaction-in-logs",
    "server-allowlist",
    "pinned-tool-hashes",
    "input-classifier",
    "red-team-gate",
]
EFFECTIVE = {
    "C1": ["draft-only-replies", "no-url-fetching", "no-remote-images"],
    "C2": ["refund-approval", "refund-limits"],
    "C3": ["pinned-tool-hashes", "server-allowlist"],
    "C4": ["pii-redaction-in-logs", "secrets-out-of-context"],
}


def is_integer(value):
    return isinstance(value, int) and not isinstance(value, bool)


def is_number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def active_tools():
    return [tool for tool in TOOL_LEGS if mod.THREAT_MODEL["tools"].get(tool) != "removed"]


def present_legs():
    legs = {"untrustedContent"}
    for tool in active_tools():
        legs.update(TOOL_LEGS[tool])
    if mod.THREAT_MODEL["rendersRemoteImages"]:
        legs.add("externalCommunication")
    return [leg for leg in LEGS if leg in legs]


@test('the ADR is an accepted governance-layer decision whose context names untrusted input and personal data, with a "We will" decision')
def _():
    adr = mod.ADR
    assert is_integer(adr["id"]) and adr["id"] > 0
    assert adr["status"] == "accepted"
    assert adr["layer"] == "governance"
    assert len(adr["title"].strip()) >= 10
    assert len(adr["context"].strip()) >= 80
    assert re.search(r"untrusted|injection", adr["context"], re.IGNORECASE)
    assert re.search(r"personal|customer data|PII|LGPD|GDPR", adr["context"], re.IGNORECASE)
    assert len(adr["decision"].strip()) >= 40
    assert re.match(r"we will\b", adr["decision"].strip(), re.IGNORECASE)


@test("lists at least two distinct rejected alternatives with reasons, and positive and negative consequences")
def _():
    adr = mod.ADR
    assert isinstance(adr["alternatives"], list)
    assert len(adr["alternatives"]) >= 2
    for alternative in adr["alternatives"]:
        assert len(alternative["option"].strip()) >= 3
        assert len(alternative["reason"].strip()) >= 20
    options = [alternative["option"].strip().lower() for alternative in adr["alternatives"]]
    assert len(set(options)) == len(options)
    for side in ["positive", "negative"]:
        items = adr["consequences"][side]
        assert isinstance(items, list)
        assert len(items) >= 1
        for item in items:
            assert len(item.strip()) >= 15


@test("the threat model names the assets and trust boundaries, including customer data and credentials")
def _():
    model = mod.THREAT_MODEL
    assert len(model["assets"]) >= 3
    assert len(model["trustBoundaries"]) >= 2
    for item in [*model["assets"], *model["trustBoundaries"]]:
        assert len(item.strip()) >= 10, item
    assert any(re.search(r"customer|personal|PII|order", asset, re.IGNORECASE) for asset in model["assets"])
    assert any(re.search(r"credential|token|secret|key", asset, re.IGNORECASE) for asset in model["assets"])


@test("the tool plan keeps what the product needs, gates refunds, and leaves no session with the lethal trifecta")
def _():
    model = mod.THREAT_MODEL
    tools = model["tools"]
    assert sorted(tools) == sorted(TOOL_LEGS)
    for mode in tools.values():
        assert mode in ["enabled", "approval", "removed"], mode
    for tool in ["read_ticket", "lookup_customer", "search_help_center", "draft_reply"]:
        assert tools[tool] == "enabled", tool
    assert tools["issue_refund"] == "approval"
    assert isinstance(model["rendersRemoteImages"], bool)
    legs = present_legs()
    assert legs != LEGS
    assert model["removedLeg"] in LEGS
    assert model["removedLeg"] not in legs


@test("credentials are the narrow ones the remaining tools need, never admin, root or a removed tool's credential")
def _():
    model = mod.THREAT_MODEL
    credentials = model["credentials"]
    for credential in credentials:
        assert credential in CREDENTIALS, credential
    assert "crm-admin" not in credentials
    assert "ops-root" not in credentials
    for tool in active_tools():
        if tool in TOOL_CREDENTIALS:
            assert TOOL_CREDENTIALS[tool] in credentials, tool
    for tool, credential in TOOL_CREDENTIALS.items():
        if model["tools"].get(tool) == "removed":
            assert credential not in credentials, credential


@test("every concern from the briefing is covered by a threat with OWASP ids and an effective mitigation that the plan actually implements")
def _():
    model = mod.THREAT_MODEL
    threats = model["threats"]
    assert len(threats) >= 4
    assert len({threat["id"] for threat in threats}) == len(threats)
    for threat in threats:
        assert len(threat["threat"].strip()) >= 20
        assert len(threat["owasp"]) >= 1
        for owasp_id in threat["owasp"]:
            assert owasp_id in OWASP_IDS, owasp_id
        assert len(threat["mitigations"]) >= 1
        for mitigation in threat["mitigations"]:
            assert mitigation in MITIGATIONS, mitigation
    for concern, effective in EFFECTIVE.items():
        covering = [threat for threat in threats if threat["concern"] == concern]
        assert len(covering) > 0, concern
        assert any(mitigation in effective for threat in covering for mitigation in threat["mitigations"]), concern
    assert any("LLM01" in threat["owasp"] or "ASI01" in threat["owasp"] for threat in threats if threat["concern"] == "C1")
    used = {mitigation for threat in threats for mitigation in threat["mitigations"]}
    if "draft-only-replies" in used:
        assert model["tools"]["send_email"] == "removed"
    if "no-url-fetching" in used:
        assert model["tools"]["fetch_url"] == "removed"
    if "no-remote-images" in used:
        assert model["rendersRemoteImages"] is False
    if "refund-approval" in used:
        assert model["tools"]["issue_refund"] == "approval"


@test("residual risks are stated with a reason, and the red-team gate covers every category within the briefing limits")
def _():
    model = mod.THREAT_MODEL
    assert len(model["residualRisks"]) >= 1
    for residual in model["residualRisks"]:
        assert len(residual["risk"].strip()) >= 20
        assert len(residual["acceptedBecause"].strip()) >= 20
    red_team = model["redTeam"]
    for category in ["exfiltration", "tool_misuse", "goal_hijack", "prompt_leak"]:
        assert category in red_team["categories"], category
    limits = red_team["maxRateByCategory"]
    assert is_number(limits.get("exfiltration")) and limits["exfiltration"] == 0
    assert is_number(limits.get("tool_misuse")) and limits["tool_misuse"] == 0
    assert is_number(red_team["maxOverallRate"])
    assert red_team["maxOverallRate"] >= 0
    assert red_team["maxOverallRate"] <= 0.05
