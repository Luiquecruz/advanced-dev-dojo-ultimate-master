import asyncio

from dojo_ai import create_model
from dojo_ai.testing import fake_model, respond

from main import contribute_with_model, create_blackboard, rebuild

OWNERS = {"plan": "lead", "findings:*": "researcher", "draft": "editor"}


def describe(result):
    return f"wrote version {result['version']}" if result["ok"] else f"failed ({result['reason']})"


async def main():
    board = create_blackboard(OWNERS)
    model = create_model()

    board.write("lead", "plan", "Compare Beacon and Prism on price and retention.", 0)
    board.write("researcher", "findings:beacon", "Beacon: $0.30/GB, 30 days retention.", 0)
    board.write("researcher", "findings:prism", "Prism: $0.45/GB, 90 days retention.", 0)

    replies = 0

    def handler(request, context):
        nonlocal replies
        replies += 1
        return respond.slow(2 if replies % 2 == 0 else 6, respond.text(f"Draft {replies}: Beacon is cheaper, Prism keeps data three times longer."))

    fake_model.handle(handler)

    options = {"board": board, "model": model, "read_keys": ["plan", "findings:beacon", "findings:prism"], "max_attempts": 3}
    first, second = await asyncio.gather(
        contribute_with_model("editor", "draft", "Write the comparison draft.", **options),
        contribute_with_model("editor", "draft", "Write a shorter comparison draft.", **options),
    )
    print(f"editor A: {describe(first)} after {first['attempts']} attempt(s)")
    print(f"editor B: {describe(second)} after {second['attempts']} attempt(s)")

    hijack = await contribute_with_model("researcher", "plan", "Change the plan to include a third vendor.", **options)
    print(f"researcher rewriting the plan: {'accepted' if hijack['ok'] else 'rejected (' + hijack['reason'] + ')'}")

    print("log:")
    for entry in board.log():
        outcome = f"accepted as v{entry['version']}" if entry["accepted"] else f"rejected, {entry['reason']}"
        print(f"  #{entry['sequence']} {entry['agent']} -> {entry['key']} (expected v{entry['expectedVersion']}): {outcome}")
    print(f"draft: {board.read('draft')['value']}")
    print(f"rebuilt from the log matches the board: {rebuild(board.log()) == board.snapshot()}")


if __name__ == "__main__":
    asyncio.run(main())
