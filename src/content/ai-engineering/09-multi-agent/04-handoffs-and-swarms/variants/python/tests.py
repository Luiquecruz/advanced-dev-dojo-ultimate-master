from dojo_ai import create_model

AGENTS = {
    "triage": {"name": "triage", "instructions": "You are triage. Route the customer to the right specialist.", "handoffs": ["billing", "tech"]},
    "billing": {"name": "billing", "instructions": "You are billing. Handle invoices and charges.", "handoffs": ["refunds", "tech"]},
    "tech": {"name": "tech", "instructions": "You are tech support. Handle bugs and outages.", "handoffs": ["billing"]},
    "refunds": {"name": "refunds", "instructions": "You are refunds. Decide and issue refunds.", "handoffs": []},
}
QUESTION = "I was charged twice for my March invoice, please fix it."


def system_of(request):
    return request["messages"][0]["content"]


def agent_of(request):
    return next(agent["name"] for agent in AGENTS.values() if agent["instructions"] == system_of(request))


def tool_names(request):
    return [tool["name"] for tool in request["tools"]]


def options(**extra):
    return {"model": create_model(), "agents": AGENTS, "entry": "triage", "max_handoffs": 4, "max_turns": 8, **extra}


@test("names handoff tools after their target and offers only the allowed targets, each requiring a reason")
def _():
    assert mod.handoff_tool_name("billing") == "transfer_to_billing"
    assert mod.handoff_tool_name("Tech Support") == "transfer_to_tech_support"
    assert mod.handoff_tool_name("Refunds (EU)") == "transfer_to_refunds_eu"
    tools = mod.handoff_tools(AGENTS["triage"])
    assert [tool["name"] for tool in tools] == ["transfer_to_billing", "transfer_to_tech"]
    for tool in tools:
        assert len(tool["description"]) > 10
        assert tool["parameters"]["type"] == "object"
        assert tool["parameters"]["properties"]["reason"]["type"] == "string"
        assert "reason" in tool["parameters"]["required"]
    assert mod.handoff_tools(AGENTS["refunds"]) == []


@test("is_ping_pong detects two agents bouncing control back and forth")
def _():
    assert mod.is_ping_pong(["billing", "tech", "billing", "tech"]) is True
    assert mod.is_ping_pong(["triage", "billing", "tech", "billing", "tech"]) is True
    assert mod.is_ping_pong(["billing", "tech", "billing"]) is False
    assert mod.is_ping_pong(["triage", "billing", "tech", "billing"]) is False
    assert mod.is_ping_pong(["triage", "billing", "refunds", "billing"]) is False
    assert mod.is_ping_pong(["billing", "tech", "triage", "tech"]) is False
    assert mod.is_ping_pong(["billing", "billing", "billing", "billing"]) is False


@test("the entry agent answers directly with its own instructions and handoff tools")
async def _():
    fake_model.reply(respond.text("Your invoice is fine; the second charge is a pending authorization."))
    result = await mod.run_swarm(QUESTION, **options())
    assert result == {
        "status": "answered",
        "answer": "Your invoice is fine; the second charge is a pending authorization.",
        "agent": "triage",
        "path": ["triage"],
        "handoffs": [],
        "turns": 1,
    }
    assert fake_model.requests[0]["messages"] == [
        {"role": "system", "content": AGENTS["triage"]["instructions"]},
        {"role": "user", "content": QUESTION},
    ]
    assert tool_names(fake_model.requests[0]) == ["transfer_to_billing", "transfer_to_tech"]


@test("a handoff passes control and the conversation to the target agent")
async def _():
    fake_model.reply(
        respond.tool_call("transfer_to_billing", {"reason": "duplicate charge"}),
        respond.tool_call("transfer_to_refunds", {"reason": "customer needs a refund"}),
        respond.text("Refund of the duplicate charge issued."),
    )
    result = await mod.run_swarm(QUESTION, **options())
    assert result == {
        "status": "answered",
        "answer": "Refund of the duplicate charge issued.",
        "agent": "refunds",
        "path": ["triage", "billing", "refunds"],
        "handoffs": [
            {"from": "triage", "to": "billing", "reason": "duplicate charge"},
            {"from": "billing", "to": "refunds", "reason": "customer needs a refund"},
        ],
        "turns": 3,
    }
    second = fake_model.requests[1]
    assert system_of(second) == AGENTS["billing"]["instructions"]
    assert tool_names(second) == ["transfer_to_refunds", "transfer_to_tech"]
    first_call = fake_model.responses[0]["toolCalls"][0]
    user, assistant, tool = second["messages"][1:]
    assert user == {"role": "user", "content": QUESTION}
    assert assistant["role"] == "assistant"
    assert [[call["id"], call["name"]] for call in assistant["toolCalls"]] == [[first_call["id"], "transfer_to_billing"]]
    assert tool["role"] == "tool"
    assert tool["toolCallId"] == first_call["id"]
    note = second["messages"][3]["content"]
    for part in ["triage", "billing", "duplicate charge"]:
        assert part in note, part
    third = fake_model.requests[2]
    assert system_of(third) == AGENTS["refunds"]["instructions"]
    assert len([message for message in third["messages"] if message["role"] != "system"]) == 5
    assert third["tools"] == []


@test("a handoff the current agent may not make is rejected and the same agent continues")
async def _():
    fake_model.reply(
        respond.tool_call("transfer_to_refunds", {"reason": "skip billing"}),
        respond.unknown_tool("transfer_to_legal"),
        respond.invalid_tool_arguments("transfer_to_billing"),
        respond.text("Billing confirmed the duplicate charge."),
    )
    result = await mod.run_swarm(QUESTION, **options())
    assert result["status"] == "answered"
    assert result["path"] == ["triage", "billing"]
    assert result["handoffs"] == [{"from": "triage", "to": "billing", "reason": ""}]
    assert result["turns"] == 4
    assert [agent_of(request) for request in fake_model.requests[:3]] == ["triage", "triage", "triage"]
    rejection = fake_model.requests[1]["messages"][-1]
    assert rejection["role"] == "tool"
    assert rejection["toolCallId"] == fake_model.responses[0]["toolCalls"][0]["id"]
    assert "transfer_to_refunds" in rejection["content"]
    assert "transfer_to_legal" in fake_model.requests[2]["messages"][-1]["content"]


@test("stops when two agents bounce control back and forth")
async def _():
    fake_model.handle(lambda request, context: (
        respond.tool_call("transfer_to_tech", {"reason": "looks technical"})
        if agent_of(request) == "billing"
        else respond.tool_call("transfer_to_billing", {"reason": "looks like billing"})
    ))
    result = await mod.run_swarm(QUESTION, **options(entry="billing", max_handoffs=10, max_turns=20))
    assert result["status"] == "ping_pong"
    assert result["answer"] is None
    assert result["path"] == ["billing", "tech", "billing"]
    assert result["agent"] == "billing"
    assert len(result["handoffs"]) == 2
    assert len(fake_model.requests) == 3


@test("stops on the handoff limit and on the turn limit")
async def _():
    fake_model.reply(
        respond.tool_call("transfer_to_billing", {"reason": "a"}),
        respond.tool_call("transfer_to_tech", {"reason": "b"}),
        respond.tool_call("transfer_to_billing", {"reason": "c"}),
    )
    limited = await mod.run_swarm(QUESTION, **options(max_handoffs=2))
    assert [limited["status"], limited["agent"], limited["answer"], limited["turns"]] == ["handoff_limit", "tech", None, 3]
    assert limited["path"] == ["triage", "billing", "tech"]

    fake_model.reset().handle(lambda request, context: respond.unknown_tool("transfer_to_nowhere"))
    stuck = await mod.run_swarm(QUESTION, **options(max_turns=3))
    assert [stuck["status"], stuck["agent"], stuck["answer"], stuck["turns"]] == ["turn_limit", "triage", None, 3]
    assert len(fake_model.requests) == 3


@test("keeps its invariants for every mix of answers, handoffs and invalid calls")
async def _():
    async def scenario():
        fake_model.handle(lambda request, context: respond.one_of([
            respond.text("Resolved."),
            respond.tool_call("transfer_to_billing", {"reason": "billing"}),
            respond.tool_call("transfer_to_tech", {"reason": "tech"}),
            respond.tool_call("transfer_to_refunds", {"reason": "refunds"}),
            respond.unknown_tool(),
        ]))
        result = await mod.run_swarm(QUESTION, **options(max_handoffs=3, max_turns=6))
        assert result["status"] in ["answered", "handoff_limit", "ping_pong", "turn_limit"]
        assert result["turns"] == len(fake_model.requests)
        assert result["turns"] <= 6
        assert len(result["handoffs"]) <= 3
        assert result["path"] == ["triage", *[handoff["to"] for handoff in result["handoffs"]]]
        assert result["agent"] == result["path"][-1]
        for handoff in result["handoffs"]:
            assert handoff["to"] in AGENTS[handoff["from"]]["handoffs"]
        for end in range(4, len(result["path"]) + 1):
            assert mod.is_ping_pong(result["path"][:end]) is False
        assert (result["answer"] is None) == (result["status"] != "answered")
        requests = fake_model.requests
        for index, request in enumerate(requests):
            agent = AGENTS[agent_of(request)]
            assert tool_names(request) == [mod.handoff_tool_name(name) for name in agent["handoffs"]]
            assert len([message for message in request["messages"] if message["role"] == "system"]) == 1
            assert index == 0 or len(request["messages"]) > len(requests[index - 1]["messages"])

    await for_each_seed(25, scenario)
