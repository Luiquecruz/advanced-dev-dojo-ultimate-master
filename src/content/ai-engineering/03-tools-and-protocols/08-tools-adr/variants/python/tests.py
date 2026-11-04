import re

SYSTEMS = ["orders-db", "refunds", "knowledge-base", "crm", "carrier-claims"]
SHARED_SYSTEMS = ["knowledge-base", "crm"]
EXTERNAL_AGENTS = ["carrier-claims"]
GATEWAY_TOOLS = 64
TOKENS_PER_DEFINITION = 350
TOOL_BUDGET_TOKENS = 6000
ROUND_SECONDS = 1.2
REPLY_SECONDS = 8
MAX_OUTPUT_TOKENS = 1500


def mechanism_of(system):
    return next((integration["mechanism"] for integration in mod.INTEGRATIONS if integration["system"] == system), None)


@test('the ADR is an accepted harness decision whose context names tools, the token budget and approvals, with a "We will" decision')
def _():
    adr = mod.ADR
    assert isinstance(adr["id"], int) and adr["id"] > 0
    assert adr["status"] == "accepted"
    assert adr["layer"] == "harness"
    assert len(adr["title"].strip()) >= 10
    assert len(adr["context"].strip()) >= 80
    assert re.search(r"tool|MCP", adr["context"], re.IGNORECASE)
    assert re.search(r"token|budget", adr["context"], re.IGNORECASE)
    assert re.search(r"approv|refund", adr["context"], re.IGNORECASE)
    assert len(adr["decision"].strip()) >= 40
    assert re.match(r"we will\b", adr["decision"].strip(), re.IGNORECASE)


@test("lists at least two distinct rejected alternatives with reasons, and positive and negative consequences")
def _():
    adr = mod.ADR
    assert len(adr["alternatives"]) >= 2
    for alternative in adr["alternatives"]:
        assert len(alternative["option"].strip()) >= 3
        assert len(alternative["reason"].strip()) >= 20
    options = [alternative["option"].strip().lower() for alternative in adr["alternatives"]]
    assert len(set(options)) == len(options)
    for side in ["positive", "negative"]:
        assert len(adr["consequences"][side]) >= 1
        for item in adr["consequences"][side]:
            assert len(item.strip()) >= 15


@test("integrates every briefing system exactly once: shared systems over MCP, the external multi-day agent over A2A, nothing else over A2A")
def _():
    assert sorted(integration["system"] for integration in mod.INTEGRATIONS) == sorted(SYSTEMS)
    for integration in mod.INTEGRATIONS:
        assert integration["mechanism"] in ["function-calling", "mcp", "a2a"]
        assert len(integration["reason"].strip()) >= 20
    for system in SHARED_SYSTEMS:
        assert mechanism_of(system) == "mcp"
    for system in EXTERNAL_AGENTS:
        assert mechanism_of(system) == "a2a"
    for system in SYSTEMS:
        if system not in EXTERNAL_AGENTS:
            assert mechanism_of(system) != "a2a"


@test("the tool catalog has unique model-friendly names, real descriptions, error contracts, bounded outputs and approval on every write tool")
def _():
    tools = mod.TOOL_PLAN["tools"]
    assert len(tools) >= 4
    names = [tool["name"] for tool in tools]
    assert len(set(names)) == len(names)
    for tool in tools:
        assert re.fullmatch(r"[a-z][a-z0-9_]*", tool["name"])
        assert len(tool["name"]) <= 64
        assert tool["system"] in SYSTEMS
        assert len(tool["description"].strip()) >= 40
        assert isinstance(tool["maxOutputTokens"], int) and tool["maxOutputTokens"] > 0
        assert tool["maxOutputTokens"] <= MAX_OUTPUT_TOKENS
        assert len(tool["errorContract"].strip()) >= 20
        assert re.search(r"error", tool["errorContract"], re.IGNORECASE)
        if not tool["readOnly"]:
            assert tool["requiresApproval"] is True
    assert any(tool["system"] == "refunds" and not tool["readOnly"] for tool in tools)


@test("tools are loaded on demand because the gateway catalog exceeds the budget, and the always-loaded set fits within it")
def _():
    assert GATEWAY_TOOLS * TOKENS_PER_DEFINITION > TOOL_BUDGET_TOKENS
    loading = mod.TOOL_PLAN["loading"]
    assert loading["strategy"] == "search-on-demand"
    assert loading["budgetTokens"] > 0
    assert loading["budgetTokens"] <= TOOL_BUDGET_TOKENS
    names = [tool["name"] for tool in mod.TOOL_PLAN["tools"]]
    for name in loading["alwaysLoaded"]:
        assert name in names
    assert len(set(loading["alwaysLoaded"])) == len(loading["alwaysLoaded"])
    assert len(loading["alwaysLoaded"]) * TOKENS_PER_DEFINITION <= loading["budgetTokens"]


@test("the round limit fits the latency budget and the repository uses the vendor-neutral context file")
def _():
    plan = mod.TOOL_PLAN
    assert isinstance(plan["maxToolRounds"], int)
    assert plan["maxToolRounds"] >= 2
    assert plan["maxToolRounds"] * ROUND_SECONDS <= REPLY_SECONDS
    assert plan["contextFile"] == "AGENTS.md"
