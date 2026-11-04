import json

from dojo_ai import count_tokens, create_model


def fixtures():
    return modules["servers.py"]


def tokens_of(definition):
    return count_tokens(json.dumps(definition, separators=(",", ":"), ensure_ascii=False))


def total_tokens(definitions):
    return sum(tokens_of(definition) for definition in definitions)


class SpyServer:
    """Answers every request with `reply(request)` and records what it received."""

    def __init__(self, reply):
        self.reply = reply
        self.received = []

    async def handle(self, message):
        request = json.loads(message)
        self.received.append(request)
        return json.dumps({"jsonrpc": "2.0", "id": request["id"], **self.reply(request)})


async def company_index(extra=()):
    return await mod.build_tool_index([*fixtures().create_company_servers(), *extra])


def qualified_names(tools):
    return [tool["qualifiedName"] for tool in tools]


@test("create_mcp_client sends JSON-RPC requests with unique ids and the protocol version, capabilities and identity in _meta, and raises McpError on errors")
async def _():
    def reply(request):
        if request["method"] == "tools/call":
            return {"error": {"code": -32602, "message": "Unknown tool: nope", "data": {"name": "nope"}}}
        return {"result": {"resultType": "complete", "tools": []}}

    server = SpyServer(reply)
    client = mod.create_mcp_client(server, {"name": "support-agent", "version": "2.1.0"})
    assert await client.request("tools/list") == {"resultType": "complete", "tools": []}
    await client.request("tools/list", {"cursor": "2"})
    error = await capture_error(client.request("tools/call", {"name": "nope", "arguments": {}}))
    assert isinstance(error, mod.McpError)
    assert error.code == -32602
    assert error.data == {"name": "nope"}

    received = server.received
    assert [request["jsonrpc"] for request in received] == ["2.0", "2.0", "2.0"]
    assert len({request["id"] for request in received}) == 3
    assert received[1]["params"].get("cursor") == "2"
    for request in received:
        meta = request["params"]["_meta"]
        assert meta.get("io.modelcontextprotocol/protocolVersion") == "2026-07-28"
        assert meta.get("io.modelcontextprotocol/clientCapabilities") == {}
        assert meta.get("io.modelcontextprotocol/clientInfo") == {"name": "support-agent", "version": "2.1.0"}


@test("build_tool_index discovers every tool across servers, following nextCursor pages, and namespaces colliding names as server__tool")
async def _():
    index = await company_index()
    assert qualified_names(index.tools) == [
        "crm__search",
        "crm__find_customer",
        "crm__update_customer_email",
        "crm__list_customer_notes",
        "billing__search",
        "billing__list_invoices",
        "billing__refund_invoice",
        "billing__apply_credit",
        "docs__search",
        "docs__get_article",
    ]
    refund = next(tool for tool in index.tools if tool["qualifiedName"] == "billing__refund_invoice")
    billing_refund = fixtures().BILLING_TOOLS[2]
    assert refund == {
        "qualifiedName": "billing__refund_invoice",
        "serverId": "billing",
        "toolName": "refund_invoice",
        "description": billing_refund["description"],
        "inputSchema": billing_refund["inputSchema"],
    }
    assert index.failures == []


@test("build_tool_index keeps working when one server fails and reports which one")
async def _():
    index = await company_index([{"id": "legacy", "server": fixtures().create_broken_server()}])
    assert len(index.tools) == 10
    assert len(index.failures) == 1
    assert index.failures[0]["serverId"] == "legacy"
    assert "database unavailable" in index.failures[0]["message"]


@test("search ranks tools by similarity to the task and returns at most the limit")
async def _():
    index = await company_index()

    def top(query, limit=1):
        return qualified_names(index.search(query, limit))

    assert top("refund an invoice") == ["billing__refund_invoice"]
    assert top("add credit to balance") == ["billing__apply_credit"]
    assert top("find customer profile") == ["crm__find_customer"]
    assert len(top("customer email address", 3)) == 3
    assert top("customer email address", 3)[0] == "crm__update_customer_email"
    assert len(index.search("anything", 50)) == 10


@test("definitions_for returns namespaced definitions in the requested order and never exceeds the token budget")
async def _():
    index = await company_index()
    refund = index.definitions_for(["billing__refund_invoice"], 10_000)[0]
    billing_refund = fixtures().BILLING_TOOLS[2]
    assert refund == {"name": "billing__refund_invoice", "description": billing_refund["description"], "parameters": billing_refund["inputSchema"]}

    names = qualified_names(index.tools)
    everything = index.definitions_for(names, 100_000)
    assert [definition["name"] for definition in everything] == names
    for budget in [0, 60, 150, 333, total_tokens(everything) - 1]:
        chosen = index.definitions_for(names, budget)
        assert total_tokens(chosen) <= budget
        assert len(chosen) < len(names)
    costs = [tokens_of(definition) for definition in everything]
    big = names[costs.index(max(costs))]
    small = names[costs.index(min(costs))]
    assert [definition["name"] for definition in index.definitions_for([big, "ghost__tool", small], min(costs))] == [small]


@test("call routes a namespaced call to the right server with the original tool name and reports tool errors without raising")
async def _():
    index = await company_index()
    assert await index.call("billing__refund_invoice", {"invoice": "INV-1001", "reason": "damaged"}) == {"text": "Refund of INV-1001 (49 USD) issued", "isError": False}
    customers = await index.call("crm__search", {"query": "ada"})
    assert json.loads(customers["text"])[0]["id"] == "C-7"
    invoices = await index.call("billing__search", {"query": "C-7"})
    assert json.loads(invoices["text"])[0]["invoice"] == "INV-1001"
    failed = await index.call("billing__refund_invoice", {"invoice": "INV-9", "reason": "x"})
    assert failed["isError"] is True
    assert "INV-9" in failed["text"]
    unknown = await index.call("billing__delete_all", {})
    assert unknown["isError"] is True
    assert "billing__delete_all" in unknown["text"]


@test("answer_with_tools starts with only search_tools, loads matching tools on demand within the budget, and calls them through the index")
async def _():
    index = await company_index()
    fake_model.reply(
        respond.tool_call("search_tools", {"query": "refund an invoice"}),
        respond.tool_call("billing__refund_invoice", {"invoice": "INV-1001", "reason": "arrived damaged"}),
        respond.text("Done: the refund for INV-1001 is on its way."),
    )
    result = await mod.answer_with_tools(create_model(), index, "Please refund invoice INV-1001, it arrived damaged.", budget_tokens=400, search_limit=2)
    first, second, third = fake_model.requests
    assert [tool["name"] for tool in first["tools"]] == ["search_tools"]
    offered = [tool["name"] for tool in second["tools"]]
    assert offered[0] == "search_tools"
    assert "billing__refund_invoice" in offered
    assert len(offered) <= 3
    assert total_tokens(second["tools"][1:]) <= 400
    tool_message = third["messages"][-1]
    assert tool_message["role"] == "tool"
    assert tool_message["toolCallId"] == fake_model.responses[1]["toolCalls"][0]["id"]
    assert "Refund of INV-1001" in tool_message["content"]
    assert result["text"] == "Done: the refund for INV-1001 is on its way."
    assert "billing__refund_invoice" in result["loadedTools"]
    assert result["rounds"] == 3


@test("answer_with_tools refuses tools that were not loaded, keeps every request within the budget and stops at max_rounds")
async def _():
    async def scenario():
        index = await company_index()
        fake_model.reply(
            respond.tool_call("billing__refund_invoice", {"invoice": "INV-1001", "reason": "x"}),
            respond.one_of([
                respond.tool_call("search_tools", {"query": "customer email address"}),
                respond.tool_call("search_tools", {"query": "knowledge base article"}),
                respond.tool_call("search_tools", {"query": "invoices and credit"}),
            ]),
            respond.tool_call("search_tools", {"query": "refund invoice customer search"}),
            respond.text("All set."),
        )
        result = await mod.answer_with_tools(create_model(), index, "Help me with my account.", budget_tokens=250, search_limit=3)
        assert result["text"] == "All set."
        refused = fake_model.requests[1]["messages"][-1]
        assert "search_tools" in json.loads(refused["content"])["error"]
        for request in fake_model.requests:
            names = [tool["name"] for tool in request["tools"]]
            assert names[0] == "search_tools"
            assert total_tokens(request["tools"][1:]) <= 250
            assert len(set(names)) == len(names)

    await for_each_seed(10, scenario)

    fake_model.reset().handle(lambda request, context: respond.tool_call("search_tools", {"query": "refund"}))
    index = await company_index()
    error = await capture_error(mod.answer_with_tools(create_model(), index, "Loop forever", max_rounds=4))
    assert isinstance(error, mod.ToolLoopLimitError)
    assert len(fake_model.requests) == 4
