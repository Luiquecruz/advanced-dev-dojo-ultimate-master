import asyncio
import re

from dojo_ai import create_model
from dojo_ai.testing import fake_model, respond

from main import initialize_project, read_tasks, run_session
from memory_file_system import file_system

DIRECTORY = "/app/checkout-rewrite"

PLAN = [
    {"id": "cart-model", "title": "Cart model with line items"},
    {"id": "totals", "title": "Totals with tax and discounts"},
    {"id": "checkout-api", "title": "POST /checkout endpoint"},
    {"id": "receipt-email", "title": "Receipt email after payment"},
    {"id": "gift-cards", "title": "Gift card redemption"},
]


def verify(task, output):
    return {"passed": output.startswith(f"DONE {task['id']}"), "feedback": f"the tests for {task['id']} still fail"}


def task_id_of(content):
    match = re.match(r"Task (\S+):", content)
    return match.group(1) if match else "unknown"


async def main():
    print(f"initialized: {initialize_project(DIRECTORY, PLAN)}")
    print(f"initialized again: {initialize_project(DIRECTORY, PLAN)} (the plan is never overwritten)")

    gift_card_attempts = []

    def answer(request, context):
        task_id = task_id_of(request["messages"][1]["content"])
        if task_id == "gift-cards":
            gift_card_attempts.append(request)
            return respond.text("I could not find the payment provider docs.")
        return respond.text(f"DONE {task_id}")

    fake_model.handle(answer)
    fake_model.reply(respond.text("DONE cart-model"), respond.text("DONE totals"), respond.text("DONE checkout-api"), respond.error(500))

    model = create_model()
    for session_id in ["monday", "tuesday", "wednesday", "thursday"]:
        try:
            result = await run_session(DIRECTORY, model=model, verify=verify, session_id=session_id, max_tasks=2, max_attempts=2)
            print(f"session {session_id}: completed [{', '.join(result['completed'])}], blocked [{', '.join(result['blocked'])}], {result['remaining']} pending")
        except Exception as error:
            print(f"session {session_id}: crashed ({error}); state on disk is kept")

    print("tasks.json:")
    for task in read_tasks(DIRECTORY):
        print(f"  {task['id']:<14} {task['status']:<8} attempts={task['attempts']}")
    print("progress.md:")
    for line in file_system.read_file(f"{DIRECTORY}/progress.md").rstrip().split("\n"):
        print(f"  {line}")
    print(f"gift card attempts: {len(gift_card_attempts)}")


if __name__ == "__main__":
    asyncio.run(main())
