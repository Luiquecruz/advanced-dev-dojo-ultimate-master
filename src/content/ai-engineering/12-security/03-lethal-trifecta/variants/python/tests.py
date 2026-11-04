import copy

TOOLS = [
    {"name": "read_inbox", "capabilities": ["privateData", "untrustedContent"]},
    {"name": "search_drive", "capabilities": ["privateData"]},
    {"name": "fetch_url", "capabilities": ["untrustedContent", "externalCommunication"]},
    {"name": "send_email", "capabilities": ["externalCommunication"]},
    {"name": "draft_reply", "capabilities": []},
    {"name": "calculator", "capabilities": []},
    {"name": "legacy_plugin"},
]


def email_agent(sessions):
    return {"name": "mail-assistant", "tools": TOOLS, "sessions": sessions}


@test("analyze_session lists the tools behind each leg in session order and flags a session that has all three")
def _():
    report = mod.analyze_session({"id": "triage", "tools": ["read_inbox", "search_drive", "send_email", "calculator"]}, TOOLS)
    assert report == {
        "sessionId": "triage",
        "legs": {"privateData": ["read_inbox", "search_drive"], "untrustedContent": ["read_inbox"], "externalCommunication": ["send_email"]},
        "lethal": True,
    }
    safe = mod.analyze_session({"id": "drafts", "tools": ["read_inbox", "search_drive", "draft_reply"]}, TOOLS)
    assert safe["lethal"] is False
    assert safe["legs"]["externalCommunication"] == []


@test("untrusted session inputs and remote image rendering count as legs even without any tool")
def _():
    report = mod.analyze_session({"id": "inbound", "tools": ["search_drive"], "untrustedInputs": ["inbound email", "attachment"], "rendersRemoteImages": True}, TOOLS)
    assert report["legs"]["untrustedContent"] == ["input:inbound email", "input:attachment"]
    assert report["legs"]["externalCommunication"] == ["remote-images"]
    assert report["lethal"] is True
    plain_text = mod.analyze_session({"id": "inbound", "tools": ["search_drive"], "untrustedInputs": ["inbound email"], "rendersRemoteImages": False}, TOOLS)
    assert plain_text["lethal"] is False


@test("a tool without capability labels, or one missing from the profiles, counts as every leg; an empty label list counts as none")
def _():
    unlabeled = mod.analyze_session({"id": "plugin", "tools": ["legacy_plugin"]}, TOOLS)
    assert unlabeled["legs"] == {"privateData": ["legacy_plugin"], "untrustedContent": ["legacy_plugin"], "externalCommunication": ["legacy_plugin"]}
    assert unlabeled["lethal"] is True
    unknown = mod.analyze_session({"id": "mystery", "tools": ["shadow_tool"]}, TOOLS)
    assert unknown["lethal"] is True
    harmless = mod.analyze_session({"id": "math", "tools": ["calculator", "draft_reply"]}, TOOLS)
    assert harmless["legs"] == {"privateData": [], "untrustedContent": [], "externalCommunication": []}
    assert harmless["lethal"] is False


@test("analyze_agent reports every session in order and names the lethal ones")
def _():
    report = mod.analyze_agent(
        email_agent([
            {"id": "summarize", "tools": ["read_inbox", "draft_reply"]},
            {"id": "research", "tools": ["search_drive", "fetch_url"]},
            {"id": "notify", "tools": ["send_email"]},
            {"id": "auto-reply", "tools": ["read_inbox", "send_email"]},
        ])
    )
    assert report["agent"] == "mail-assistant"
    assert [session["sessionId"] for session in report["sessions"]] == ["summarize", "research", "notify", "auto-reply"]
    assert report["lethalSessions"] == ["research", "auto-reply"]


@test("suggest_removal picks the leg with the fewest sources, prefers external communication on ties, and returns None for a safe session")
def _():
    tie = mod.analyze_session({"id": "a", "tools": ["search_drive", "send_email"], "untrustedInputs": ["web page"]}, TOOLS)
    assert mod.suggest_removal(tie) == {"leg": "externalCommunication", "sources": ["send_email"]}
    fewest_untrusted = mod.analyze_session({"id": "b", "tools": ["search_drive", "send_email"], "untrustedInputs": ["ticket"], "rendersRemoteImages": True}, TOOLS)
    assert mod.suggest_removal(fewest_untrusted) == {"leg": "untrustedContent", "sources": ["input:ticket"]}
    fewest_private = mod.analyze_session({"id": "c", "tools": ["search_drive", "fetch_url", "send_email"], "untrustedInputs": ["ticket"]}, TOOLS)
    assert mod.suggest_removal(fewest_private) == {"leg": "privateData", "sources": ["search_drive"]}
    assert mod.suggest_removal(mod.analyze_session({"id": "d", "tools": ["read_inbox", "draft_reply"]}, TOOLS)) is None


@test("remove_leg returns a new configuration where that session no longer has the leg, leaving other sessions and the input untouched")
async def _():
    config = email_agent([
        {"id": "auto-reply", "tools": ["read_inbox", "search_drive", "send_email", "fetch_url", "draft_reply"], "rendersRemoteImages": True},
        {"id": "research", "tools": ["search_drive", "fetch_url"]},
    ])
    snapshot = copy.deepcopy(config)
    fixed = mod.remove_leg(config, "auto-reply", "externalCommunication")
    assert config == snapshot
    assert fixed["sessions"][0]["tools"] == ["read_inbox", "search_drive", "draft_reply"]
    assert fixed["sessions"][0]["rendersRemoteImages"] is False
    assert fixed["sessions"][1]["tools"] == ["search_drive", "fetch_url"]
    assert mod.analyze_agent(fixed)["lethalSessions"] == ["research"]

    quarantined = mod.remove_leg(email_agent([{"id": "inbound", "tools": ["search_drive", "send_email", "legacy_plugin"], "untrustedInputs": ["email"]}]), "inbound", "untrustedContent")
    assert quarantined["sessions"][0]["tools"] == ["search_drive", "send_email"]
    assert quarantined["sessions"][0]["untrustedInputs"] == []
    assert mod.analyze_agent(quarantined)["lethalSessions"] == []

    error = await capture_error(lambda: mod.remove_leg(config, "missing", "privateData"))
    assert "missing" in str(error)


@test("the runtime guard blocks the call that would complete the trifecta, whatever the order, and does not record a denied call")
def _():
    orders = [
        {"calls": ["search_drive", "fetch_url"], "legsBefore": ["privateData"]},
        {"calls": ["fetch_url", "search_drive"], "legsBefore": ["untrustedContent", "externalCommunication"]},
        {"calls": ["send_email", "draft_reply", "read_inbox"], "legsBefore": ["externalCommunication"]},
    ]
    for order in orders:
        guard = mod.create_trifecta_guard(TOOLS)
        decisions = [guard.authorize(tool) for tool in order["calls"]]
        for decision in decisions[:-1]:
            assert decision["allowed"] is True
        assert decisions[-1] == {"allowed": False, "reason": "lethal_trifecta", "legs": order["legsBefore"]}
        assert guard.legs() == order["legsBefore"]
    guard = mod.create_trifecta_guard(TOOLS)
    assert guard.authorize("search_drive") == {"allowed": True, "legs": ["privateData"]}
    assert guard.authorize("draft_reply") == {"allowed": True, "legs": ["privateData"]}
    assert guard.authorize("send_email") == {"allowed": True, "legs": ["privateData", "externalCommunication"]}
    assert guard.authorize("fetch_url") == {"allowed": False, "reason": "lethal_trifecta", "legs": ["privateData", "externalCommunication"]}
    assert guard.authorize("send_email")["allowed"] is True
    assert guard.legs() == ["privateData", "externalCommunication"]

    triggered_by_email = mod.create_trifecta_guard(TOOLS, initial_legs=["untrustedContent"])
    assert triggered_by_email.authorize("search_drive")["allowed"] is True
    assert triggered_by_email.authorize("send_email")["allowed"] is False
    assert mod.create_trifecta_guard(TOOLS).authorize("legacy_plugin")["allowed"] is False
