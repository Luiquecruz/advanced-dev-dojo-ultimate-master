from dojo_ai import create_model

EXPENSIVE_PRICING = {"inputPerMillion": 1000, "outputPerMillion": 1000}


class Spy:
    """Records every call and delegates to the implementation."""

    def __init__(self, implementation):
        self.implementation = implementation
        self.calls = []

    def __call__(self, *arguments):
        self.calls.append(list(arguments))
        return self.implementation(*arguments)


def default_search(arguments):
    return {"query": arguments.get("query"), "page": arguments.get("page"), "hits": [f"result {arguments.get('page')}"]}


def search_tools(on_search=default_search):
    search = Spy(on_search)
    tools = [
        {
            "name": "search",
            "description": "Search the knowledge base",
            "parameters": {"type": "object", "properties": {"query": {"type": "string"}, "page": {"type": "number"}}},
            "execute": search,
        }
    ]
    return tools, search


def sum_usage(key):
    return sum(response["usage"][key] for response in fake_model.responses)


def tool_message_count(messages):
    return len([message for message in messages if message["role"] == "tool"])


def paging():
    page = 0

    def next_page(request, context):
        nonlocal page
        page += 1
        return respond.tool_call("search", {"query": "refund policy", "page": page})

    return next_page


@test("call_signature identifies a tool call by name and arguments, ignoring key order")
def _():
    def signature(name, arguments):
        return mod.call_signature({"name": name, "arguments": arguments})

    assert signature("search", '{"query":"refunds","page":1}') == signature("search", '{"page":1,"query":"refunds"}')
    assert signature("search", '{"filter":{"b":2,"a":1}}') == signature("search", '{"filter":{"a":1,"b":2}}')
    assert signature("search", '{"query":"refunds","page":1}') != signature("search", '{"query":"refunds","page":2}')
    assert signature("search", '{"query":"refunds"}') != signature("lookup", '{"query":"refunds"}')
    assert isinstance(signature("search", '{"query": '), str)


@test("a run that finishes reports done with the answer and usage totals summed from every response")
async def _():
    tools, _search = search_tools()
    fake_model.reply(
        respond.tool_call("search", {"query": "refund policy", "page": 1}),
        respond.tool_call("search", {"query": "refund policy", "page": 2}),
        respond.text("Refunds take 5 days."),
    )
    budget = {"maxSteps": 10, "maxTokens": 100000, "maxCostUsd": 1, "maxDurationMs": 60000}
    result = await mod.run_budgeted_agent(create_model(), task="How long do refunds take?", tools=tools, budget=budget)
    assert result["stop"]["reason"] == "done"
    assert isinstance(result["stop"]["detail"], str)
    assert len(result["stop"]["detail"]) > 0
    assert result["answer"] == "Refunds take 5 days."
    assert result["usage"]["steps"] == 3
    assert result["usage"]["inputTokens"] == sum_usage("inputTokens")
    assert result["usage"]["outputTokens"] == sum_usage("outputTokens")
    assert result["usage"]["totalTokens"] == sum_usage("totalTokens")
    assert result["usage"]["costUsd"] == approx(sum_usage("cost"), abs=1e-9)


@test("max_steps stops before a call that would exceed the step budget")
async def _():
    tools, search = search_tools()
    fake_model.handle(paging())
    result = await mod.run_budgeted_agent(create_model(), task="Research refunds", tools=tools, budget={"maxSteps": 4})
    assert result["stop"]["reason"] == "max_steps"
    assert result["answer"] is None
    assert len(fake_model.requests) == 4
    assert result["usage"]["steps"] == 4
    assert len(search.calls) == 4


@test("max_tokens stops as soon as the total reaches the budget and does not run the tool calls of that response, but a final answer still wins")
async def _():
    tools, search = search_tools()
    fake_model.handle(paging())
    result = await mod.run_budgeted_agent(create_model(), task="Research refunds", tools=tools, budget={"maxSteps": 10, "maxTokens": 1})
    assert result["stop"]["reason"] == "max_tokens"
    assert len(fake_model.requests) == 1
    assert search.calls == []

    fake_model.reset().reply(respond.text("Refunds take 5 days."))
    answered = await mod.run_budgeted_agent(create_model(), task="Research refunds", tools=tools, budget={"maxSteps": 10, "maxTokens": 1})
    assert answered["stop"]["reason"] == "done"
    assert answered["answer"] == "Refunds take 5 days."


@test("max_cost reads the cost from usage and stops at the first response that reaches the budget")
async def _():
    fake_model.configure(pricing=EXPENSIVE_PRICING)
    fake_model.handle(paging())
    tools, search = search_tools()
    result = await mod.run_budgeted_agent(create_model(), task="Research refunds", tools=tools, budget={"maxSteps": 50, "maxCostUsd": 0.2})
    assert result["stop"]["reason"] == "max_cost"
    costs = [response["usage"]["cost"] for response in fake_model.responses]
    spent = sum(costs)
    assert spent >= 0.2
    assert spent - costs[-1] < 0.2
    assert result["usage"]["costUsd"] == approx(spent, abs=1e-9)
    assert len(search.calls) == len(costs) - 1


@test("timeout uses the injected clock and starts no model call after the deadline")
async def _():
    clock = {"time": 1000}

    def slow_search(arguments):
        clock["time"] += 400
        return {"page": arguments["page"]}

    tools, search = search_tools(slow_search)
    fake_model.handle(paging())
    result = await mod.run_budgeted_agent(
        create_model(),
        task="Research refunds",
        tools=tools,
        budget={"maxSteps": 20, "maxDurationMs": 1000},
        now=lambda: clock["time"],
    )
    assert result["stop"]["reason"] == "timeout"
    assert len(fake_model.requests) == 3
    assert len(search.calls) == 3
    assert result["elapsedMs"] == 1200


@test("stuck stops when the same call (same name, same arguments in any key order) repeats repeat_limit times in a row, without running the repeat")
async def _():
    tools, search = search_tools()
    flip = False

    def flipping_key_order(request, context):
        nonlocal flip
        flip = not flip
        return respond.tool_call("search", {"query": "refund policy", "page": 1} if flip else {"page": 1, "query": "refund policy"})

    fake_model.handle(flipping_key_order)
    result = await mod.run_budgeted_agent(create_model(), task="Research refunds", tools=tools, budget={"maxSteps": 20})
    assert result["stop"]["reason"] == "stuck"
    assert len(fake_model.requests) == 3
    assert len(search.calls) == 2

    fake_model.reset()
    turn = 0

    def alternating_queries(request, context):
        nonlocal turn
        turn += 1
        return respond.tool_call("search", {"query": "refunds" if turn % 2 == 0 else "returns", "page": 1})

    fake_model.handle(alternating_queries)
    alternating = await mod.run_budgeted_agent(create_model(), task="Research refunds", tools=tools, budget={"maxSteps": 6}, repeat_limit=2)
    assert alternating["stop"]["reason"] == "max_steps"

    fake_model.reset().handle(lambda request, context: respond.tool_call("search", {"query": "refunds", "page": 1}))
    strict = await mod.run_budgeted_agent(create_model(), task="Research refunds", tools=tools, budget={"maxSteps": 6}, repeat_limit=2)
    assert strict["stop"]["reason"] == "stuck"
    assert len(fake_model.requests) == 2


@test("across seeds, every run stays within its budgets and reports usage that matches the responses")
async def _():
    reasons = set()

    async def scenario():
        fake_model.configure(pricing=EXPENSIVE_PRICING)
        fake_model.handle(lambda request, context: respond.one_of([
            respond.tool_call("search", {"query": "refunds", "page": 1}),
            respond.tool_call("search", {"query": "refunds", "page": 2}),
            respond.tool_call("search", {"query": "returns", "page": 1}),
            respond.text("Refunds take 5 days."),
            respond.refusal(),
        ]))
        tools, search = search_tools()
        result = await mod.run_budgeted_agent(create_model(), task="Research refunds", tools=tools, budget={"maxSteps": 6, "maxCostUsd": 0.5}, repeat_limit=2)
        reasons.add(result["stop"]["reason"])
        assert result["stop"]["reason"] in ["done", "refused", "max_steps", "max_cost", "stuck"]
        assert len(fake_model.requests) <= 6
        assert result["usage"]["steps"] == len(fake_model.requests)
        assert result["usage"]["costUsd"] == approx(sum_usage("cost"), abs=1e-9)
        assert len(search.calls) == tool_message_count(result["messages"])
        expected_answer = fake_model.responses[-1]["text"] if result["stop"]["reason"] == "done" else None
        assert result["answer"] == expected_answer

    await for_each_seed(30, scenario)
    assert len(reasons) >= 3
