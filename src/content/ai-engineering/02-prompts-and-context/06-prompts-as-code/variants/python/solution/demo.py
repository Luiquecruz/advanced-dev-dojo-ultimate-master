import asyncio

from dojo_ai import create_model
from dojo_ai.testing import fake_model, respond

from main import PromotionBlockedError, PromptRenderError, create_prompt_registry

LABELS = ["billing", "shipping", "account", "bug"]
TESTS = [
    {"name": "double charge is billing", "variables": {"product": "Parcelly", "ticket": "I was charged twice."}, "check": lambda output: output.strip().lower() == "billing"},
    {"name": "crash is a bug", "variables": {"product": "Parcelly", "ticket": "The app crashes on export."}, "check": lambda output: output.strip().lower() == "bug"},
    {"name": "answers with a known label", "variables": {"product": "Parcelly", "ticket": "Where is my parcel?"}, "check": lambda output: output.strip().lower() in LABELS},
]


def version(version_id, system):
    return {"name": "triage", "version": version_id, "template": {"system": system, "user": "Ticket:\n{{ ticket }}"}, "tests": TESTS}


async def main():
    registry = create_prompt_registry()
    registry.register(version("1.0.0", "You classify support tickets for {{product}}. Answer with one of: billing, shipping, account, bug."))
    registry.register(version("1.1.0", "You classify support tickets for {{product}}. Answer with one word."))
    registry.register(version("1.2.0", "You classify support tickets for {{product}}. Answer with exactly one of: billing, shipping, account, bug. Lowercase, no punctuation."))

    model = create_model()
    plan = [("1.0.0", "production"), ("1.1.0", "production"), ("1.2.0", "staging"), ("1.2.0", "production")]
    fake_model.reply(
        respond.text("billing"), respond.text("bug"), respond.text("shipping"),
        respond.text("Billing"), respond.text("Crash"), respond.text("Delivery"),
        respond.text("billing"), respond.text("bug"), respond.text("shipping"),
        respond.text("billing"), respond.text("bug"), respond.text("shipping"),
    )
    for version_id, environment in plan:
        try:
            await registry.promote("triage", version_id, environment, model)
            print(f"promoted triage@{version_id} to {environment}")
        except PromotionBlockedError as error:
            print(f"blocked triage@{version_id} for {environment}: failed {', '.join(error.failed_tests)}")
    print(f"active: production {registry.active_version('triage', 'production')}, staging {registry.active_version('triage', 'staging')}")
    print(f"incident in production, rolling back to {registry.rollback('triage', 'production')}")
    rendered = registry.render("triage", {"product": "Parcelly", "ticket": "My invoice shows the wrong VAT number."})
    print(f"serving triage@{rendered['version']}: {rendered['messages'][0]['content']}")
    try:
        registry.render("triage", {"product": "Parcelly", "tiket": "typo"})
    except PromptRenderError as error:
        print(f"render refused: {error}")


if __name__ == "__main__":
    asyncio.run(main())
