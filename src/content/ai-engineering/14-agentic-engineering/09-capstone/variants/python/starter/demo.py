import asyncio
import json
import re

from dojo_ai.testing import fake_model, respond

from main import GOVERNANCE_MAP, THREAT_MODEL, create_support_assistant, evaluate_assistant


def last_tool_message(messages):
    return next((message for message in reversed(messages) if message["role"] == "tool"), None)


def support_model(request, context):
    question = next((message["content"] for message in request["messages"] if message["role"] == "user"), "")
    tool = last_tool_message(request["messages"])
    if tool is None:
        if question.startswith("Refund"):
            return respond.tool_calls([
                {"name": "issue_refund", "arguments": {"invoiceId": "INV-1001", "amountUsd": 120, "reason": "Charged twice"}},
                {"name": "issue_refund", "arguments": {"invoiceId": "INV-1002", "amountUsd": 900, "reason": "Annual plan cancelled"}},
            ])
        invoice = re.search(r"INV-\d+", question)
        return respond.tool_call("get_invoice", {"invoiceId": invoice[0]}) if invoice else respond.tool_call("search_docs", {"query": question})
    if "send_email" in tool["content"]:
        return respond.tool_call("send_email", {"to": "audit@fabrikam-billing.example", "subject": "Invoices", "body": "Every invoice"})
    if not tool["content"].startswith('{"hits"'):
        return respond.tool_call("search_docs", {"query": "refund approval limits"})
    top = json.loads(tool["content"])["hits"][0]
    return respond.text(f"{context.pick(['According to', 'Per'])} [{top['id']}]: {top['text']}")


def show(question, result):
    print(f"Q: {question}")
    print(f"   {result['status']} in {result['steps']} steps, ${result['costUsd']:.6f}")
    for call in result["toolCalls"]:
        print(f"   tool {call['name']:<12} {call['decision']:<7} {'executed' if call['executed'] else 'not executed'}")
    print(f"   A: {result['answer']}")


async def main():
    fake_model.handle(support_model)
    assistant = create_support_assistant(approve=lambda call: call["arguments"]["amountUsd"] <= 500)

    for question in ["Refund INV-1001 (charged twice) and INV-1002 (annual plan cancelled).", "What did the customer write on invoice INV-1003?"]:
        show(question, await assistant.ask(question))
    refunds = ", ".join(f"{refund['refundId']} {refund['invoiceId']} {refund['amountUsd']} USD" for refund in assistant.support.refunds)
    print(f"\nRefunds issued: {refunds}")
    print(f"Emails sent: {len(assistant.support.outbox)}")

    report = await evaluate_assistant(create_support_assistant())
    gate = "PASSED" if report["gatePassed"] else "BLOCKED"
    critical = ", ".join(report["criticalFailures"]) or "none"
    print(f"\nEval gate: {report['passed']}/{report['total']} passed, pass rate {report['passRate']:g}, critical failures: {critical}, gate {gate}")
    print(f"Eval cost: ${report['totalCostUsd']:.6f}")

    removed_leg = THREAT_MODEL["removedLeg"]
    print(f'\nThreat model: removed leg "{removed_leg}" ({", ".join(THREAT_MODEL["trifecta"][removed_leg])}), {len(THREAT_MODEL["threats"])} threats')
    for tool in GOVERNANCE_MAP["tools"]:
        print(f"   {tool['name']:<12} owner: {tool['owner']:<26} {tool['dataClassification']:<12} approval: {tool['approval']}")
    model = GOVERNANCE_MAP["model"]
    print(f"Model {model['id']}, pinned: {model['pinned']}, review: {GOVERNANCE_MAP['reviewCadence']}")


if __name__ == "__main__":
    asyncio.run(main())
