import asyncio
from datetime import datetime, timezone

from dojo_ai import create_model
from dojo_ai.testing import fake_model, respond

from main import DataPolicyError, apply_retention, check_model_call, classify_record, erase_subject, governed_generate

DAY = 24 * 60 * 60 * 1000
NOW = int(datetime(2026, 10, 31, 12, tzinfo=timezone.utc).timestamp() * 1000)

POLICY = {
    "fields": {
        "name": {"classification": "confidential", "personal": True},
        "email": {"classification": "confidential", "personal": True},
        "orderId": {"classification": "internal", "personal": False},
        "issue": {"classification": "internal", "personal": False},
        "plan": {"classification": "internal", "personal": False},
        "cpf": {"classification": "restricted", "personal": True},
    },
    "purposes": {
        "customer-support": {"allowedFields": ["name", "orderId", "issue", "plan"], "requiresConsent": False, "maxClassification": "confidential", "retentionDays": 30},
        "marketing": {"allowedFields": ["name", "plan"], "requiresConsent": True, "maxClassification": "confidential", "retentionDays": 7},
    },
}

TICKET = {"name": "Maria Souza", "email": "maria@example.com", "orderId": "A-1001", "issue": "Package arrived damaged", "cpf": "123.456.789-09", "plan": "premium", "referrer": "newsletter-2026-09"}
MARIA = {"id": "customer-4411", "consents": ["customer-support"]}
JOAO = {"id": "customer-5120", "consents": ["customer-support", "marketing"]}


async def main():
    model = create_model()
    store = []
    clock = {"time": NOW}

    def now():
        return clock["time"]

    labels = classify_record(TICKET, POLICY)
    print(f"classification: highest {labels['highest']}, unlabeled {', '.join(labels['unlabeled'])}")
    check = check_model_call({"record": TICKET, "subject": MARIA, "purpose": "customer-support"}, POLICY)
    if check["allowed"]:
        print(f"support call keeps {', '.join(check['payload'])}; drops {', '.join(check['droppedFields'])}")

    fake_model.reply(respond.text("Sorry about the damaged package, Maria. A replacement for order A-1001 ships tomorrow."))
    support = await governed_generate(model, {"record": TICKET, "subject": MARIA, "purpose": "customer-support", "instruction": "Draft a short reply to the customer."}, POLICY, now=now, store=store)
    print(f"support reply: {support['text']}")
    print(f"  the model saw: {fake_model.requests[0]['messages'][1]['content']}")

    try:
        await governed_generate(model, {"record": TICKET, "subject": MARIA, "purpose": "marketing", "instruction": "Write an upgrade offer."}, POLICY, now=now, store=store)
    except DataPolicyError as error:
        print(f"marketing for Maria refused before any model call: {', '.join(error.reasons)}")

    clock["time"] = NOW + 2 * DAY
    fake_model.reply(respond.text("João, premium members get early access to the new plan this week."))
    offer = await governed_generate(model, {"record": {**TICKET, "name": "João Lima"}, "subject": JOAO, "purpose": "marketing", "instruction": "Write an upgrade offer."}, POLICY, now=now, store=store)
    print(f"marketing for João (consented): {offer['text']}")

    print("\nprocessing records:")
    for record in store:
        print(f"  {record['subjectId']} {record['purpose']:<16} fields {','.join(record['fields']):<26} expires {record['expiresAt'][:10]}")

    ten_days_later = apply_retention(store, NOW + 10 * DAY)
    purged = ", ".join(f"{record['subjectId']}/{record['purpose']}" for record in ten_days_later["purged"])
    print(f"\nretention job after 10 days: kept {len(ten_days_later['kept'])}, purged {purged}")
    erased = erase_subject(ten_days_later["kept"], "customer-4411")
    print(f"Maria asks for erasure: removed {erased['erased']} record(s), {len(erased['kept'])} left")


if __name__ == "__main__":
    asyncio.run(main())
