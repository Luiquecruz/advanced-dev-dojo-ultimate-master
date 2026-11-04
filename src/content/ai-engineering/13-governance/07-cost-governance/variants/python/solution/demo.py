import asyncio
from datetime import datetime, timezone

from dojo_ai import create_model
from dojo_ai.testing import fake_model, respond

from main import BudgetExceededError, create_cost_governor, governed_generate

PRICING = {"inputPerMillion": 3, "outputPerMillion": 15}
clock = {"time": int(datetime(2026, 10, 31, 9, tzinfo=timezone.utc).timestamp() * 1000)}


def print_alert(alert):
    print(f"  ALERT {alert['budgetId']} reached {round(alert['threshold'] * 100)}%: ${alert['spentUsd']:.5f} of ${alert['limitUsd']}")


async def main():
    fake_model.configure(pricing=PRICING)
    governor = create_cost_governor(
        budgets=[
            {"id": "company-monthly", "limitUsd": 50},
            {"id": "support-team", "team": "support", "limitUsd": 0.01},
            {"id": "support-summaries", "team": "support", "feature": "summaries", "limitUsd": 0.001},
        ],
        rate_limits={"sales": {"requests": 2, "windowMs": 60_000}},
        now=lambda: clock["time"],
        on_alert=print_alert,
    )
    small = create_model("acme-small-2026-05")
    large = create_model("acme-large-2026-05")
    fake_model.handle(
        lambda request, context: respond.text(
            [
                "Customer reports a damaged package and wants a replacement.",
                "Refund approved for order A-1001; label sent to the customer by email.",
                "Hi Ana, following up on the proposal we discussed last week.",
            ]
        )
    )

    calls = [
        (small, {"team": "support", "feature": "summaries"}, 40),
        (small, {"team": "support", "feature": "summaries"}, 40),
        (large, {"team": "support", "feature": "replies"}, 300),
        (small, {"team": "support", "feature": "summaries"}, 40),
        (small, {"team": "sales", "feature": "emails"}, 150),
        (small, {"team": "sales", "feature": "emails"}, 150),
        (small, {"team": "sales", "feature": "emails"}, 150),
    ]
    for model, context, max_tokens in calls:
        clock["time"] += 5_000
        label = f"{context['team']}/{context['feature']} on {model.name}"
        request = {"messages": [{"role": "user", "content": "Summarize ticket T-1: the package arrived damaged."}], "maxTokens": max_tokens}
        try:
            response = await governed_generate(governor, model, context, request, PRICING)
            print(f"{label:<44} ${response['usage']['cost']:.5f}")
        except BudgetExceededError as error:
            print(f"{label:<44} refused before the call: {error}")

    report = governor.report()
    print(f"\nspend ${report['totalUsd']:.5f}")
    for name, totals in {"team": report["byTeam"], "feature": report["byFeature"], "model": report["byModel"]}.items():
        print(f"  by {name}: {', '.join(f'{key} ${value:.5f}' for key, value in totals.items())}")


if __name__ == "__main__":
    asyncio.run(main())
