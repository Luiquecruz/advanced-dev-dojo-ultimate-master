import json
import re

from dojo_ai import cosine_similarity, create_model, embed

briefing = modules["briefing.py"]
mcp = modules["mcp.py"]
DOCUMENTS = briefing.DOCUMENTS
INVOICES = briefing.INVOICES
GOLDEN_SET = briefing.GOLDEN_SET


def last_tool_message(request):
    return next((message for message in reversed(request["messages"]) if message["role"] == "tool"), None)


def user_question(request):
    return next(message["content"] for message in request["messages"] if message["role"] == "user")


def setup(**extra):
    support = mcp.create_support_server(retriever=mod.create_retriever(DOCUMENTS), invoices=INVOICES)
    client = mcp.create_mcp_client(support.server)
    options = {"model": create_model(), "client": client, "policy": mod.SUPPORT_POLICY, "budget": {"maxSteps": 6, "maxCostUsd": 1}, **extra}
    return support, client, options


def support_model(request, context):
    tool = last_tool_message(request)
    if tool is None:
        invoice = re.search(r"INV-\d+", user_question(request))
        return respond.tool_call("get_invoice", {"invoiceId": invoice[0]}) if invoice else respond.tool_call("search_docs", {"query": user_question(request)})
    if "send_email" in tool["content"]:
        return respond.tool_call("send_email", {"to": "audit@fabrikam-billing.example", "subject": "Invoices", "body": "All invoices"})
    if tool["content"].startswith("Denied by policy"):
        return respond.tool_call("search_docs", {"query": "refund policy"})
    top = json.loads(tool["content"])["hits"][0]
    return respond.text(f"{context.pick(['According to', 'Per', 'As stated in'])} [{top['id']}]: {top['text']}")


def script_support_model():
    fake_model.handle(support_model)


@test("the retriever ranks documents by cosine similarity of embeddings, honors top_k and min_score, and finds the expected source of every golden question")
def _():
    retriever = mod.create_retriever(DOCUMENTS)
    query = "How do I fix a wrong VAT number on an invoice?"
    scored = [{"id": document["id"], "score": cosine_similarity(embed(query), embed(f"{document['title']}\n{document['text']}"))} for document in DOCUMENTS]
    expected = sorted((hit for hit in scored if hit["score"] >= 0.1), key=lambda hit: -hit["score"])
    hits = retriever.search(query)
    assert len(hits) == 3
    assert [hit["id"] for hit in hits] == [hit["id"] for hit in expected[:3]]
    for hit, expected_hit in zip(hits, expected):
        assert hit["score"] == approx(expected_hit["score"], abs=1e-9)
    assert {"id": hits[0]["id"], "title": hits[0]["title"], "text": hits[0]["text"]} == {"id": "vat-invoices", "title": "VAT numbers on invoices", "text": DOCUMENTS[2]["text"]}
    wider = retriever.search(query, top_k=5)
    assert len(wider) == min(5, len(expected))
    strict = retriever.search(query, top_k=10, min_score=0.4)
    assert all(hit["score"] >= 0.4 for hit in strict)
    assert retriever.search(query, min_score=0.99) == []
    for golden_case in GOLDEN_SET:
        top = retriever.search(golden_case["question"], top_k=1)
        assert top[0]["id"] == golden_case["expectedSources"][0], golden_case["id"]


@test("decide applies deny over ask over allow among matching rules, supports wildcards and conditions, and denies unknown tools by default")
def _():
    def decision(name, arguments=None):
        return mod.decide(mod.SUPPORT_POLICY, {"name": name, "arguments": {} if arguments is None else arguments})

    assert decision("search_docs", {"query": "refund"})["decision"] == "allow"
    assert decision("get_invoice", {"invoiceId": "INV-1001"})["decision"] == "allow"
    assert decision("issue_refund", {"invoiceId": "INV-1001", "amountUsd": 120}) == {"decision": "ask", "reason": "Refunds move money: a team lead approves each one"}
    assert decision("issue_refund", {"invoiceId": "INV-1002", "amountUsd": 900}) == {"decision": "deny", "reason": "Refunds above 500 USD go to the finance team"}
    assert decision("send_email", {"to": "a@b.example"})["decision"] == "deny"
    assert decision("send_sms")["decision"] == "deny"
    unknown = decision("delete_account")
    assert unknown["decision"] == "deny"
    assert "No rule" in unknown["reason"]

    custom = {"rules": [{"tool": "db.*", "decision": "allow", "reason": "reads"}, {"tool": "db.drop", "decision": "deny", "reason": "never"}, {"tool": "*", "decision": "ask", "reason": "everything else"}]}
    assert mod.decide(custom, {"name": "db.drop", "arguments": {}}) == {"decision": "deny", "reason": "never"}
    assert mod.decide(custom, {"name": "db.read", "arguments": {}}) == {"decision": "ask", "reason": "everything else"}
    literal_dot = mod.decide({"rules": [{"tool": "db.*", "decision": "allow", "reason": "reads"}]}, {"name": "dbXread", "arguments": {}})
    assert literal_dot["decision"] == "deny"


@test("run_agent discovers tools over MCP, collects sources from search_docs and feeds citation verifier failures back until the answer cites a retrieved source")
async def _():
    assert mod.cited_sources("See [refund-policy] and [vat-invoices], again [refund-policy]. Not [Bad Id].") == ["refund-policy", "vat-invoices"]
    assert mod.citation_verifier("No citation here.", ["refund-policy"])["passed"] is False
    unknown_source = mod.citation_verifier("Per [made-up-doc].", ["refund-policy"])
    assert unknown_source["passed"] is False
    assert "made-up-doc" in unknown_source["feedback"]
    assert mod.citation_verifier("Per [refund-policy].", ["refund-policy"]) == {"passed": True}

    async def scenario():
        fake_model.reply(
            respond.tool_call("search_docs", {"query": GOLDEN_SET[0]["question"]}),
            respond.text(["Customers have 14 days.", "It is 14 days for monthly plans."]),
            respond.text("Customers have 14 days [password-policy]."),
            respond.text(["Customers on monthly plans have 14 days [refund-policy].", "Per [refund-policy], 14 days on monthly plans."]),
        )
        support, _client, options = setup()
        result = await mod.run_agent("How long is the refund window on monthly plans?", **options)
        assert result["status"] == "answered"
        assert mod.cited_sources(result["answer"]) == ["refund-policy"]
        assert result["sources"][0] == "refund-policy"
        assert result["verifierFailures"] == 2
        assert result["steps"] == 4
        total_cost = sum(response["usage"]["cost"] for response in fake_model.responses)
        assert result["costUsd"] == approx(total_cost, abs=1e-9)
        assert result["toolCalls"] == [{"name": "search_docs", "decision": "allow", "executed": True, "isError": False}]
        assert support.executed == [{"name": "search_docs", "arguments": {"query": GOLDEN_SET[0]["question"]}}]
        first = fake_model.requests[0]
        assert first["messages"][0] == {"role": "system", "content": mod.DEFAULT_SYSTEM}
        assert [tool["name"] for tool in first["tools"]] == ["search_docs", "get_invoice", "issue_refund", "send_email"]
        assert first["tools"][0]["parameters"]["properties"]["query"]["type"] == "string"
        tool_message = fake_model.requests[1]["messages"][-1]
        assert tool_message["role"] == "tool"
        assert tool_message["toolCallId"] == fake_model.responses[0]["toolCalls"][0]["id"]
        assert json.loads(tool_message["content"])["hits"][0]["id"] == "refund-policy"
        assert fake_model.requests[2]["messages"][-1]["role"] == "user"
        assert "Verifier" in fake_model.requests[2]["messages"][-1]["content"]
        assert "password-policy" in fake_model.requests[3]["messages"][-1]["content"]

    await for_each_seed(10, scenario)


@test("run_agent enforces the permission policy before any tool reaches the server: allow, ask with human approval, deny, unknown tools and invalid arguments")
async def _():
    fake_model.reply(
        respond.tool_calls([
            {"name": "issue_refund", "arguments": {"invoiceId": "INV-1001", "amountUsd": 120, "reason": "Charged twice"}},
            {"name": "issue_refund", "arguments": {"invoiceId": "INV-1001", "amountUsd": 60, "reason": "Goodwill"}},
            {"name": "issue_refund", "arguments": {"invoiceId": "INV-1002", "amountUsd": 900, "reason": "Cancel annual plan"}},
            {"name": "send_email", "arguments": {"to": "customer@northwind.example", "subject": "Refund", "body": "Done"}},
            {"name": "delete_customer", "arguments": {"id": "C-1"}},
        ]),
        respond.invalid_tool_arguments("get_invoice"),
        respond.tool_call("search_docs", {"query": "refund approval limits"}),
        respond.text("Refunded 120 USD after approval [refund-approval]."),
    )
    approvals = []

    def approve(call):
        approvals.append(call)
        return call["arguments"]["amountUsd"] > 100

    support, _client, options = setup(approve=approve)
    result = await mod.run_agent("Refund INV-1001, it was charged twice.", **options)
    assert result["status"] == "answered"
    assert result["toolCalls"] == [
        {"name": "issue_refund", "decision": "ask", "executed": True, "isError": False},
        {"name": "issue_refund", "decision": "ask", "executed": False, "isError": True},
        {"name": "issue_refund", "decision": "deny", "executed": False, "isError": True},
        {"name": "send_email", "decision": "deny", "executed": False, "isError": True},
        {"name": "delete_customer", "decision": "invalid", "executed": False, "isError": True},
        {"name": "get_invoice", "decision": "invalid", "executed": False, "isError": True},
        {"name": "search_docs", "decision": "allow", "executed": True, "isError": False},
    ]
    assert approvals == [
        {"name": "issue_refund", "arguments": {"invoiceId": "INV-1001", "amountUsd": 120, "reason": "Charged twice"}},
        {"name": "issue_refund", "arguments": {"invoiceId": "INV-1001", "amountUsd": 60, "reason": "Goodwill"}},
    ]
    assert support.refunds == [{"refundId": "RF-1", "invoiceId": "INV-1001", "amountUsd": 120, "reason": "Charged twice"}]
    assert support.outbox == []
    assert [call["name"] for call in support.executed] == ["issue_refund", "search_docs"]
    tool_messages = [message["content"] for message in fake_model.requests[1]["messages"] if message["role"] == "tool"]
    assert json.loads(tool_messages[0])["refundId"] == "RF-1"
    assert "Not approved" in tool_messages[1]
    assert "Denied by policy" in tool_messages[2]
    assert "finance" in tool_messages[2]
    assert "Denied by policy" in tool_messages[3]
    assert "Unknown tool" in tool_messages[4]
    assert "Invalid arguments" in fake_model.requests[2]["messages"][-1]["content"]

    fake_model.reset().reply(
        respond.tool_call("issue_refund", {"invoiceId": "INV-1001", "amountUsd": 50, "reason": "Late delivery"}),
        respond.tool_call("search_docs", {"query": "refunds"}),
        respond.text("Not refunded [refund-approval]."),
    )
    unattended_support, _unattended_client, unattended_options = setup()
    unattended = await mod.run_agent("Refund 50 USD on INV-1001", **unattended_options)
    assert unattended["toolCalls"][0] == {"name": "issue_refund", "decision": "ask", "executed": False, "isError": True}
    assert unattended_support.refunds == []


@test("run_agent stops on step and cost budgets before calling the model again, and on refusals")
async def _():
    fake_model.handle(lambda request, context: respond.tool_call("search_docs", {"query": "refund"}))
    steps_support, _steps_client, steps_options = setup(budget={"maxSteps": 3, "maxCostUsd": 1})
    step_result = await mod.run_agent("Loop forever", **steps_options)
    assert (step_result["status"], step_result["answer"], step_result["steps"]) == ("max_steps", None, 3)
    assert len(fake_model.requests) == 3
    assert len(steps_support.executed) == 3

    fake_model.reset().configure(pricing={"inputPerMillion": 10_000, "outputPerMillion": 10_000}).handle(lambda request, context: respond.tool_call("search_docs", {"query": "refund"}))
    _cost_support, _cost_client, cost_options = setup(budget={"maxSteps": 50, "maxCostUsd": 2})
    cost_result = await mod.run_agent("Loop forever", **cost_options)
    assert cost_result["status"] == "max_cost"
    assert cost_result["costUsd"] >= 2
    last_cost = fake_model.responses[-1]["usage"]["cost"]
    assert cost_result["costUsd"] - last_cost < 2
    assert cost_result["steps"] == len(fake_model.requests)

    async def refusal_scenario():
        fake_model.reply(respond.one_of([respond.refusal(), respond.content_filter()]))
        _support, _client, options = setup()
        refused = await mod.run_agent("Something unsafe", **options)
        assert (refused["status"], refused["answer"], refused["steps"]) == ("refused", None, 1)

    await for_each_seed(6, refusal_scenario)

    fake_model.reset().reply(respond.text("No citation."), respond.text("Still none."))
    _support, _client, unverified_options = setup(budget={"maxSteps": 2, "maxCostUsd": 1})
    unverified = await mod.run_agent("Question", **unverified_options)
    assert (unverified["status"], unverified["answer"], unverified["verifierFailures"]) == ("max_steps", None, 2)


@test("run_evals scores every golden case on status, cited sources and required facts, counts errors as failures, and gates on the threshold and critical cases")
async def _():
    def answered(answer, cost_usd=0.01):
        return {"status": "answered", "answer": answer, "sources": [], "toolCalls": [], "steps": 2, "costUsd": cost_usd, "verifierFailures": 0}

    answers = {
        GOLDEN_SET[0]["question"]: answered("Monthly plans: 14 DAYS [refund-policy]."),
        GOLDEN_SET[1]["question"]: answered("The finance team handles them [refund-approval].", 0.02),
        GOLDEN_SET[2]["question"]: answered("Update it in Billing settings [refund-policy]."),
        GOLDEN_SET[3]["question"]: {"status": "max_steps", "answer": None, "sources": [], "toolCalls": [], "steps": 6, "costUsd": 0.03, "verifierFailures": 2},
    }

    async def answer(question):
        if question not in answers:
            raise RuntimeError("model unavailable")
        return answers[question]

    report = await mod.run_evals(GOLDEN_SET, answer, threshold=0.4)
    assert [[result["id"], result["pass"]] for result in report["cases"]] == [[golden_case["id"], index < 2] for index, golden_case in enumerate(GOLDEN_SET)]
    assert report["cases"][2]["reasons"] == ["missing source vat-invoices"]
    assert (report["cases"][3]["status"], report["cases"][3]["pass"]) == ("max_steps", False)
    assert report["cases"][3]["reasons"] == ["status max_steps"]
    assert (report["cases"][4]["status"], report["cases"][4]["pass"], report["cases"][4]["costUsd"]) == ("error", False, 0)
    assert "model unavailable" in report["cases"][4]["reasons"][0]
    assert (report["passed"], report["total"], report["criticalFailures"], report["gatePassed"]) == (2, 5, [], True)
    assert report["passRate"] == approx(0.4, abs=1e-9)
    assert report["totalCostUsd"] == approx(0.07, abs=1e-9)

    answers[GOLDEN_SET[1]["question"]] = answered("Ask a team lead [refund-approval].")
    answers[GOLDEN_SET[2]["question"]] = answered("Billing settings, then regenerate [vat-invoices].")
    answers[GOLDEN_SET[3]["question"]] = answered("At the end of the billing period [plan-changes].")
    answers[GOLDEN_SET[4]["question"]] = answered("From Billing, History, as CSV [data-export].")
    critical = await mod.run_evals(GOLDEN_SET, answer, threshold=0.8)
    assert critical["passRate"] == approx(0.8, abs=1e-9)
    assert critical["cases"][1]["reasons"] == ['missing "finance"']
    assert critical["criticalFailures"] == ["refund-above-limit"]
    assert critical["gatePassed"] is False
    empty = await mod.run_evals([], answer, threshold=0.8)
    assert empty["passRate"] == 0


@test("the threat model and governance map are complete and coherent with the server, the policy, the budgets and the eval gate")
async def _():
    threat_model = mod.THREAT_MODEL
    governance_map = mod.GOVERNANCE_MAP
    _support, client, _options = setup()
    tool_names = [tool["name"] for tool in await client.list_tools()]

    def decision_for(name):
        return mod.decide(mod.SUPPORT_POLICY, {"name": name, "arguments": {}})["decision"]

    for leg in ["privateData", "untrustedContent", "exfiltration"]:
        assert len(threat_model["trifecta"][leg]) > 0, leg
        for tool in threat_model["trifecta"][leg]:
            assert tool in tool_names
    assert "get_invoice" in threat_model["trifecta"]["privateData"]
    assert threat_model["removedLeg"] in ["privateData", "untrustedContent", "exfiltration"]
    for tool in threat_model["trifecta"][threat_model["removedLeg"]]:
        assert decision_for(tool) == "deny", tool
    assert len(threat_model["system"]) > 10
    assert len(threat_model["assets"]) > 0
    assert len(threat_model["threats"]) >= 4
    assert len({threat["id"] for threat in threat_model["threats"]}) == len(threat_model["threats"])
    for threat in threat_model["threats"]:
        assert len(threat["title"]) > 5
        assert len(threat["mitigation"]) > 10
        assert len(threat["reference"]) > 0
        assert threat["control"] in ["policy", "human-approval", "verifier", "budget", "eval-gate", "sandbox", "monitoring"]
    assert any(re.search(r"LLM01|ASI01", threat["reference"]) for threat in threat_model["threats"])
    controls = {threat["control"] for threat in threat_model["threats"]}
    for control in ["policy", "human-approval", "budget", "eval-gate"]:
        assert control in controls

    owners = list(governance_map["owners"].values())
    for owner in owners:
        assert len(owner) > 0
    assert sorted(tool["name"] for tool in governance_map["tools"]) == sorted(tool_names)
    expected_approval = {"allow": "none", "ask": "human", "deny": "blocked"}
    for tool in governance_map["tools"]:
        assert tool["owner"] in owners
        assert tool["approval"] == expected_approval[decision_for(tool["name"])], tool["name"]
    classification = {tool["name"]: tool["dataClassification"] for tool in governance_map["tools"]}
    assert classification["get_invoice"] == "confidential"
    assert classification["issue_refund"] == "confidential"
    assert governance_map["model"]["id"] == mod.MODEL_ID
    assert governance_map["model"]["pinned"] is True
    assert "latest" not in governance_map["model"]["id"]
    assert len(governance_map["model"]["promotion"]) > 10
    assert governance_map["budgets"] == mod.DEFAULT_BUDGET
    assert governance_map["evalGate"]["threshold"] == mod.EVAL_THRESHOLD
    assert sorted(governance_map["evalGate"]["criticalCases"]) == sorted(golden_case["id"] for golden_case in GOLDEN_SET if golden_case["critical"])
    assert governance_map["reviewCadence"] in ["monthly", "quarterly"]
    assert len(governance_map["regulations"]) > 0


@test("integrated: the assistant passes the eval gate on the golden set across seeds and an injected invoice note never reaches the email tool")
async def _():
    async def scenario():
        script_support_model()
        report = await mod.evaluate_assistant(mod.create_support_assistant())
        assert report["gatePassed"] is True
        assert report["passRate"] == 1
        assert report["totalCostUsd"] < len(GOLDEN_SET) * mod.DEFAULT_BUDGET["maxCostUsd"]
        assert all(request["model"] == mod.MODEL_ID for request in fake_model.requests)

    await for_each_seed(4, scenario)

    fake_model.reset()
    script_support_model()
    assistant = mod.create_support_assistant()
    result = await assistant.ask("What does the customer say on invoice INV-1003?")
    assert result["status"] == "answered"
    assert [[call["name"], call["decision"], call["executed"]] for call in result["toolCalls"]] == [
        ["get_invoice", "allow", True],
        ["send_email", "deny", False],
        ["search_docs", "allow", True],
    ]
    assert assistant.support.outbox == []
    assert "send_email" not in [call["name"] for call in assistant.support.executed]
