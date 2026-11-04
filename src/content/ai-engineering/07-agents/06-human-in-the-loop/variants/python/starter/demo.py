import asyncio
import json

from dojo_ai import create_model
from dojo_ai.testing import fake_model, respond

from main import resume_agent, start_agent


def create_tools(log):
    def refund(arguments):
        log.append(f"refunded ${arguments['amount']} on {arguments['orderId']}")
        return {"refunded": arguments["amount"]}

    def email_customer(arguments):
        log.append(f"emailed: {arguments['body']}")
        return "sent"

    return [
        {
            "name": "get_order",
            "description": "Read an order",
            "parameters": {"type": "object", "properties": {"orderId": {"type": "string"}}},
            "execute": lambda arguments: {"orderId": arguments["orderId"], "total": 240, "customer": "ana@example.com"},
        },
        {
            "name": "refund",
            "description": "Refund part or all of an order",
            "parameters": {"type": "object", "properties": {"orderId": {"type": "string"}, "amount": {"type": "number"}}},
            "requiresApproval": lambda arguments: float(arguments["amount"]) > 50,
            "execute": refund,
        },
        {
            "name": "email_customer",
            "description": "Send an email to the customer",
            "parameters": {"type": "object", "properties": {"body": {"type": "string"}}},
            "requiresApproval": True,
            "execute": email_customer,
        },
    ]


def tool_result_count(request):
    return len([message for message in request["messages"] if message["role"] == "tool"])


def agent_reply(request, context):
    match tool_result_count(request):
        case 0:
            return respond.tool_call("get_order", {"orderId": "A-77"})
        case 1:
            return respond.tool_calls([
                {"name": "refund", "arguments": {"orderId": "A-77", "amount": 240}},
                {"name": "email_customer", "arguments": {"body": "We refunded your full order, sorry!"}},
            ])
        case _:
            return respond.text("The refund and the email were handled as the reviewer decided.")


def show(label, run):
    print(f"{label}: status={run['status']} steps={run['state']['steps']}")
    if run["status"] == "interrupted":
        for pending in run["pending"]:
            print(f"  waiting for a human: {pending['name']}({json.dumps(pending['arguments'])})")


async def main():
    fake_model.handle(agent_reply)
    first_log = []
    interrupted = await start_agent(create_model(), task="Customer says order A-77 arrived broken. Handle it.", tools=create_tools(first_log), max_steps=6)
    show("Monday 17:58", interrupted)
    saved = json.dumps(interrupted["state"])
    print(f"  state saved as {len(saved)} characters of JSON; side effects so far: {len(first_log)}\n")

    if interrupted["status"] != "interrupted":
        return
    refund_call, email_call = interrupted["pending"]
    decisions = {
        refund_call["toolCallId"]: {"type": "edit", "arguments": {"orderId": "A-77", "amount": 120}},
        email_call["toolCallId"]: {"type": "deny", "reason": "The email must mention the partial refund."},
    }
    print("Tuesday 09:10: reviewer edits the refund to $120 and denies the email")
    second_log = []
    finished = await resume_agent(create_model(), json.loads(saved), decisions, tools=create_tools(second_log), max_steps=6)
    show("Tuesday 09:10", finished)
    for entry in second_log:
        print(f"  side effect: {entry}")
    for message in finished["state"]["messages"]:
        if message["role"] == "tool":
            print(f"  tool result: {message['content']}")
    if finished["status"] == "done":
        print(f"  answer: {finished['answer']}")


if __name__ == "__main__":
    asyncio.run(main())
