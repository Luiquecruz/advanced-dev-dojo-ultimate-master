import asyncio
import json

from dojo_ai import create_model
from dojo_ai.testing import fake_model, respond

from main import check_freshness, map_obligations, summarize
from rules import RULES, RULES_AS_OF

DESCRIPTION = """Lumen Pay is a Brazilian fintech launching in Portugal and California.
It ships a customer support chatbot, an AI model that proposes credit-limit increases for consumers,
and a tool that generates marketing images."""

EXTRACTED = {
    "name": "Lumen Pay",
    "markets": ["BR", "EU", "US-CA"],
    "features": [
        {"id": "support-chat", "uses": ["chatbot"], "dataTypes": ["personal"], "users": ["consumers"]},
        {"id": "credit-limit", "uses": ["credit-decision"], "dataTypes": ["personal"], "users": ["consumers"]},
        {"id": "marketing-images", "uses": ["synthetic-media"], "dataTypes": [], "users": ["consumers"]},
    ],
}


def is_profile(value):
    return (
        isinstance(value, dict)
        and isinstance(value.get("name"), str)
        and isinstance(value.get("markets"), list)
        and isinstance(value.get("features"), list)
        and all(isinstance(feature, dict) and isinstance(feature.get("id"), str) and isinstance(feature.get("uses"), list) for feature in value["features"])
    )


async def main():
    fake_model.reply(respond.json(EXTRACTED))
    response = await create_model().generate(
        {
            "messages": [
                {"role": "system", "content": "Extract the product profile (markets, features with uses, data types and users) as JSON. A lawyer reviews it before use."},
                {"role": "user", "content": DESCRIPTION},
            ],
            "responseFormat": {"type": "json"},
        }
    )
    profile = json.loads(response["text"])
    if not is_profile(profile):
        print("the extracted profile is invalid; ask a human to fill it in")
        return

    as_of = "2026-11-01"
    freshness = check_freshness(RULES_AS_OF, as_of)
    plural = "" if freshness["ageDays"] == 1 else "s"
    state = "fresh" if freshness["fresh"] else "REVIEW NEEDED"
    print(f"{profile['name']}: {len(profile['features'])} features in {', '.join(profile['markets'])}; rules table as of {RULES_AS_OF} ({freshness['ageDays']} day{plural} old, {state})")
    print("not legal advice: confirm every obligation with counsel\n")

    obligations = map_obligations(profile, RULES, as_of)
    jurisdiction = ""
    for obligation in obligations:
        if obligation["jurisdiction"] != jurisdiction:
            jurisdiction = obligation["jurisdiction"]
            print(jurisdiction)
        when = f" from {obligation['appliesFrom']}" if obligation["status"] == "upcoming" else ""
        print(f"  [{obligation['status']}{when}] {obligation['featureId']}: {obligation['instrument']}")

    print("\nsummary:")
    for name, counts in summarize(obligations).items():
        print(f"  {name:<6} applies {counts['applies']}, upcoming {counts['upcoming']}, proposed {counts['proposed']}")


if __name__ == "__main__":
    asyncio.run(main())
