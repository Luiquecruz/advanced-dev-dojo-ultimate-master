import json
import re
from datetime import datetime, timezone

from dojo_ai import create_model

NOW = int(datetime(2026, 10, 31, 12, tzinfo=timezone.utc).timestamp() * 1000)
DAY = 24 * 60 * 60 * 1000

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
        "fraud-review": {"allowedFields": ["orderId", "cpf"], "requiresConsent": False, "maxClassification": "confidential", "retentionDays": 90},
    },
}

RECORD = {"name": "Maria Souza", "email": "maria@example.com", "orderId": "A-1001", "issue": "Package arrived damaged", "cpf": "123.456.789-09", "plan": "premium", "referrer": "newsletter-2026-09"}
MARIA = {"id": "customer-4411", "consents": ["customer-support"]}


def iso(milliseconds):
    moment = datetime.fromtimestamp(milliseconds / 1000, tz=timezone.utc)
    return moment.isoformat(timespec="milliseconds").replace("+00:00", "Z")


def contains(record, expected):
    return all(key in record and record[key] == value for key, value in expected.items())


@test("classify_record labels every field and treats unlabeled fields as restricted")
def _():
    assert mod.classify_record({"orderId": "A-1", "plan": "basic"}, POLICY) == {"fields": {"orderId": "internal", "plan": "internal"}, "highest": "internal", "unlabeled": []}
    result = mod.classify_record({"name": "Maria", "referrer": "x", "orderId": "A-1"}, POLICY)
    assert result["fields"] == {"name": "confidential", "referrer": "restricted", "orderId": "internal"}
    assert result["highest"] == "restricted"
    assert result["unlabeled"] == ["referrer"]
    assert mod.classify_record({}, POLICY)["highest"] == "public"


@test("check_model_call denies unknown purposes and purposes that need a consent the subject did not give")
def _():
    assert mod.check_model_call({"record": RECORD, "subject": MARIA, "purpose": "training"}, POLICY) == {"allowed": False, "reasons": ["unknown-purpose"]}
    assert mod.check_model_call({"record": RECORD, "subject": MARIA, "purpose": "marketing"}, POLICY) == {"allowed": False, "reasons": ["missing-consent"]}
    consenting = {"id": "customer-7", "consents": ["customer-support", "marketing"]}
    assert contains(mod.check_model_call({"record": RECORD, "subject": consenting, "purpose": "marketing"}, POLICY), {"allowed": True, "payload": {"name": "Maria Souza", "plan": "premium"}})


@test("check_model_call minimizes the payload to the labeled fields the purpose allows")
def _():
    copy = dict(RECORD)
    check = mod.check_model_call({"record": copy, "subject": MARIA, "purpose": "customer-support"}, POLICY)
    assert check == {
        "allowed": True,
        "payload": {"name": "Maria Souza", "orderId": "A-1001", "issue": "Package arrived damaged", "plan": "premium"},
        "droppedFields": ["email", "cpf", "referrer"],
    }
    assert copy == RECORD
    unlabeled_allowed = {**POLICY, "purposes": {**POLICY["purposes"], "support": {**POLICY["purposes"]["customer-support"], "allowedFields": ["orderId", "referrer"]}}}
    assert mod.check_model_call({"record": RECORD, "subject": MARIA, "purpose": "support"}, unlabeled_allowed) == {"allowed": True, "payload": {"orderId": "A-1001"}, "droppedFields": ["name", "email", "issue", "cpf", "plan", "referrer"]}


@test("check_model_call denies a purpose whose allowed fields exceed its classification ceiling, collecting every reason")
def _():
    assert mod.check_model_call({"record": RECORD, "subject": MARIA, "purpose": "fraud-review"}, POLICY) == {"allowed": False, "reasons": ["above-purpose-classification"]}
    strict = {**POLICY, "purposes": {**POLICY["purposes"], "marketing": {**POLICY["purposes"]["marketing"], "maxClassification": "internal"}}}
    assert mod.check_model_call({"record": RECORD, "subject": MARIA, "purpose": "marketing"}, strict) == {"allowed": False, "reasons": ["missing-consent", "above-purpose-classification"]}
    assert contains(mod.check_model_call({"record": {"orderId": "A-1"}, "subject": MARIA, "purpose": "fraud-review"}, POLICY), {"allowed": True, "payload": {"orderId": "A-1"}})


@test("governed_generate refuses before calling the model, and otherwise sends only the minimized payload and records the processing")
async def _():
    model = create_model()
    store = []
    error = await capture_error(mod.governed_generate(model, {"record": RECORD, "subject": MARIA, "purpose": "marketing", "instruction": "Write an offer."}, POLICY, now=lambda: NOW, store=store))
    assert isinstance(error, mod.DataPolicyError)
    assert error.reasons == ["missing-consent"]
    assert len(fake_model.requests) == 0
    assert store == []

    async def scenario():
        records = []
        fake_model.reply(respond.text(["Sorry about the damaged package, Maria. A replacement is on the way.", "We have opened a replacement for order A-1001.", "Thanks for reporting it. Can you send a photo of the package?"]))
        result = await mod.governed_generate(model, {"record": RECORD, "subject": MARIA, "purpose": "customer-support", "instruction": "Draft a reply to the customer."}, POLICY, now=lambda: NOW, store=records)
        request = fake_model.requests[0]
        assert request["messages"][0] == {"role": "system", "content": "Draft a reply to the customer."}
        assert json.loads(request["messages"][1]["content"]) == {"name": "Maria Souza", "orderId": "A-1001", "issue": "Package arrived damaged", "plan": "premium"}
        assert not re.search(r"maria@example|123\.456|newsletter", json.dumps(request["messages"]))
        assert result["text"] == fake_model.responses[0]["text"]
        assert records == [
            {
                "subjectId": "customer-4411",
                "purpose": "customer-support",
                "fields": ["name", "orderId", "issue", "plan"],
                "output": result["text"],
                "responseId": fake_model.responses[0]["id"],
                "processedAt": iso(NOW),
                "expiresAt": iso(NOW + 30 * DAY),
            }
        ]
        assert result["record"] == records[0]

    await for_each_seed(8, scenario)


@test("a failed model call propagates and stores no processing record")
async def _():
    fake_model.reply(respond.error(503))
    store = []
    error = await capture_error(mod.governed_generate(create_model(), {"record": RECORD, "subject": MARIA, "purpose": "customer-support", "instruction": "Reply."}, POLICY, now=lambda: NOW, store=store))
    assert error.status == 503
    assert store == []


@test("apply_retention purges records whose retention ended, and erase_subject removes every record of one person")
def _():
    def record(subject_id, expires_in_days):
        return {"subjectId": subject_id, "purpose": "customer-support", "fields": ["name"], "output": "x", "responseId": "r", "processedAt": iso(NOW - DAY), "expiresAt": iso(NOW + expires_in_days * DAY)}

    store = [record("a", -1), record("b", 0), record("a", 1), record("c", 30)]
    result = mod.apply_retention(store, NOW)
    assert result["purged"] == [store[0], store[1]]
    assert result["kept"] == [store[2], store[3]]
    assert mod.apply_retention(store, NOW + 31 * DAY)["kept"] == []
    assert mod.erase_subject(store, "a") == {"kept": [store[1], store[3]], "erased": 2}
    assert mod.erase_subject(store, "nobody") == {"kept": store, "erased": 0}
