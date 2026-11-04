import json
from datetime import datetime, timedelta, timezone

RANK = ["public", "internal", "confidential", "restricted"]
DAY_MS = 24 * 60 * 60 * 1000
EPOCH = datetime(1970, 1, 1, tzinfo=timezone.utc)


class DataPolicyError(Exception):
    """Raised before any model call when the data policy denies it; `reasons` lists why."""

    def __init__(self, reasons):
        super().__init__(f"Data policy denied the model call: {', '.join(reasons)}")
        self.reasons = reasons


def iso_timestamp(milliseconds):
    moment = datetime.fromtimestamp(milliseconds / 1000, tz=timezone.utc)
    return moment.isoformat(timespec="milliseconds").replace("+00:00", "Z")


def parse_time_ms(text):
    moment = datetime.fromisoformat(text)
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=timezone.utc)
    return (moment - EPOCH) // timedelta(milliseconds=1)


def classify_record(record, policy):
    fields = {}
    unlabeled = []
    for name in record:
        label = policy["fields"].get(name)
        if label is None:
            unlabeled.append(name)
        fields[name] = "restricted" if label is None else label["classification"]
    highest = max(fields.values(), key=RANK.index, default="public")
    return {"fields": fields, "highest": highest, "unlabeled": unlabeled}


def check_model_call(input, policy):
    purpose = input["purpose"]
    rule = policy["purposes"].get(purpose)
    if rule is None:
        return {"allowed": False, "reasons": ["unknown-purpose"]}
    reasons = []
    if rule["requiresConsent"] and purpose not in input["subject"]["consents"]:
        reasons.append("missing-consent")
    payload = {}
    dropped_fields = []
    for name, value in input["record"].items():
        if name in rule["allowedFields"] and name in policy["fields"]:
            payload[name] = value
        else:
            dropped_fields.append(name)
    ceiling = RANK.index(rule["maxClassification"])
    if any(RANK.index(policy["fields"][name]["classification"]) > ceiling for name in payload):
        reasons.append("above-purpose-classification")
    if reasons:
        return {"allowed": False, "reasons": reasons}
    return {"allowed": True, "payload": payload, "droppedFields": dropped_fields}


async def governed_generate(model, input, policy, *, now, store):
    check = check_model_call(input, policy)
    if not check["allowed"]:
        raise DataPolicyError(check["reasons"])
    response = await model.generate(
        {
            "messages": [
                {"role": "system", "content": input["instruction"]},
                {"role": "user", "content": json.dumps(check["payload"], separators=(",", ":"), ensure_ascii=False)},
            ]
        }
    )
    processed_at = now()
    record = {
        "subjectId": input["subject"]["id"],
        "purpose": input["purpose"],
        "fields": list(check["payload"]),
        "output": response["text"],
        "responseId": response["id"],
        "processedAt": iso_timestamp(processed_at),
        "expiresAt": iso_timestamp(processed_at + policy["purposes"][input["purpose"]]["retentionDays"] * DAY_MS),
    }
    store.append(record)
    return {"text": response["text"], "record": dict(record)}


def apply_retention(store, now):
    purged = [record for record in store if parse_time_ms(record["expiresAt"]) <= now]
    kept = [record for record in store if parse_time_ms(record["expiresAt"]) > now]
    return {"kept": kept, "purged": purged}


def erase_subject(store, subject_id):
    kept = [record for record in store if record["subjectId"] != subject_id]
    return {"kept": kept, "erased": len(store) - len(kept)}
