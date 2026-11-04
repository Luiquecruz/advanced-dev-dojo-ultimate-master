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
    # TODO: label every field from the policy; unlabeled fields count as restricted and are listed in "unlabeled"
    raise NotImplementedError


def check_model_call(input, policy):
    # TODO: unknown purpose, missing consent, minimization to allowed labeled fields, classification ceiling of the purpose
    if input["purpose"] not in policy["purposes"]:
        return {"allowed": False, "reasons": ["unknown-purpose"]}
    return {"allowed": True, "payload": dict(input["record"]), "droppedFields": []}


async def governed_generate(model, input, policy, *, now, store):
    # TODO: check before calling, raise DataPolicyError without calling the model, send only the payload, store a processing record with its expiry
    response = await model.generate(
        {
            "messages": [
                {"role": "system", "content": input["instruction"]},
                {"role": "user", "content": json.dumps(input["record"], separators=(",", ":"), ensure_ascii=False)},
            ]
        }
    )
    record = {
        "subjectId": input["subject"]["id"],
        "purpose": input["purpose"],
        "fields": list(input["record"]),
        "output": response["text"],
        "responseId": response["id"],
        "processedAt": iso_timestamp(now()),
        "expiresAt": iso_timestamp(now()),
    }
    store.append(record)
    return {"text": response["text"], "record": record}


def apply_retention(store, now):
    # TODO: split records into kept and purged ("expiresAt" at or before now)
    return {"kept": store, "purged": []}


def erase_subject(store, subject_id):
    # TODO: remove every record of the subject and count them
    raise NotImplementedError
