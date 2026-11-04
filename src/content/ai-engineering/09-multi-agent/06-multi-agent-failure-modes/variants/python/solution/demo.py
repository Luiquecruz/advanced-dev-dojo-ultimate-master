import asyncio
import json

from dojo_ai import create_model
from dojo_ai.testing import fake_model, respond

from main import create_delegation_guard, gather_claims, vote_independently


async def main():
    model = create_model()

    print("1. Containing cascading errors")
    fake_model.reply(
        respond.json({"claims": [{"text": "Beacon costs $0.30 per GB ingested", "sourceId": "pricing-page"}, {"text": "Beacon offers unlimited free retention", "sourceId": "reddit-thread"}]}),
        respond.json({"claims": [{"text": "Beacon costs $0.30 per GB ingested", "sourceId": "pricing-page"}]}),
        respond.truncated(json.dumps({"claims": [{"text": "Retention is 30 days by default", "sourceId": "contract-v3"}]}, separators=(",", ":"))),
        respond.json({"claims": [{"text": "Retention is 30 days, extendable to 400 days", "sourceId": "legal-memo"}]}),
    )
    gathered = await gather_claims(
        [
            {"id": "pricing", "instruction": "Summarize Beacon pricing.", "sourceIds": ["pricing-page", "sales-deck"]},
            {"id": "retention", "instruction": "Summarize Beacon retention terms.", "sourceIds": ["contract-v3"]},
        ],
        model=model,
        max_attempts=2,
    )
    for claim in gathered["accepted"]:
        print(f"  accepted [{claim['taskId']}] {claim['text']} ({claim['sourceId']})")
    for entry in gathered["quarantined"]:
        print(f"  quarantined [{entry['taskId']}]: {'; '.join(entry['problems'])}")

    print("2. Independent votes before discussion")
    fake_model.reset().reply(
        respond.json({"answer": "no"}),
        respond.json({"answer": "yes"}),
        respond.error(503),
        respond.json({"answer": "No"}),
        respond.json({"answer": "no"}),
        respond.json({"answer": "yes"}),
    )
    vote = await vote_independently("Does the Beacon contract meet our 90-day retention policy? Answer yes or no.", model=model, voters=["security", "legal", "finance"], quorum=0.6)
    for round_number, ballots in enumerate(vote["ballots"], start=1):
        print(f"  round {round_number}: {', '.join('abstained' if ballot is None else ballot for ballot in ballots)}")
    print(f"  {vote['status']}: {'escalate to a human' if vote['decision'] is None else vote['decision']}")

    print("3. Delegation limits")
    guard = create_delegation_guard(max_depth=2, max_fan_out=3, max_total=5)
    requests = [
        (["lead"], "pricing"),
        (["lead", "pricing"], "fx-rates"),
        (["lead", "pricing", "fx-rates"], "bank-api"),
        (["lead", "pricing"], "lead"),
        (["lead"], "retention"),
        (["lead"], "support"),
        (["lead"], "security"),
        (["lead", "retention"], "archive"),
        (["lead", "retention"], "legal"),
    ]
    for chain, target in requests:
        decision = guard.request(chain, target)
        outcome = "allowed" if decision["allowed"] else f"blocked ({decision['reason']})"
        print(f"  {' > '.join(chain)} -> {target}: {outcome}")
    print(f"  delegations allowed: {guard.total}")


if __name__ == "__main__":
    asyncio.run(main())
