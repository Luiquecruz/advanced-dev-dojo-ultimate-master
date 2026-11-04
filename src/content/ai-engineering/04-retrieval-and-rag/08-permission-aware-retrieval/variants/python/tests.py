from dojo_ai import create_model, embed

documents_module = modules["documents.py"]
DOCUMENTS = documents_module.DOCUMENTS
PEOPLE = documents_module.PEOPLE


class SpyEmbedder:
    def __init__(self):
        self.calls = []

    def __call__(self, texts):
        self.calls.append(list(texts))
        return embed(texts)


def loaded_index(embedder=None):
    index = mod.create_secure_index(embedder)
    for document in DOCUMENTS:
        index.upsert(document)
    return index


def ids(results):
    return [result["id"] for result in results]


def by_id(document_id):
    return next(document for document in DOCUMENTS if document["id"] == document_id)


@test("can_read requires the same tenant and a shared group or an explicit user grant, and denies by default")
def _():
    assert mod.can_read(PEOPLE["maria"], by_id("acme-salary-bands")) is True
    assert mod.can_read(PEOPLE["sam"], by_id("acme-salary-bands")) is False
    assert mod.can_read(PEOPLE["lee"], by_id("acme-salary-bands")) is False
    assert mod.can_read(PEOPLE["lee"], by_id("globex-salary-bands")) is True
    assert mod.can_read(PEOPLE["dana"], by_id("acme-performance-review-dana")) is True
    assert mod.can_read(PEOPLE["sam"], by_id("acme-performance-review-dana")) is False
    assert mod.can_read({"userId": "dana", "tenantId": "globex", "groups": ["hr"]}, by_id("acme-performance-review-dana")) is False
    assert mod.can_read(PEOPLE["maria"], {"id": "draft", "tenantId": "acme", "text": "Draft", "allowedGroups": []}) is False


@test("never returns another tenant’s documents, even when they match the query best and share group names")
def _():
    index = loaded_index()
    results = index.search(PEOPLE["lee"], "Acme salary bands for engineers in euros", top_k=10)
    assert len(results) > 0
    for result in results:
        assert result["id"].startswith("globex-")
    acme_hr = index.search(PEOPLE["maria"], "Globex salary bands in dollars", top_k=10)
    for result in acme_hr:
        assert result["id"].startswith("acme-")
    assert "acme-salary-bands" in ids(acme_hr)


@test("filters by permission before ranking, so top_k fills with readable documents however high forbidden ones score")
def _():
    index = loaded_index()
    for copy in range(5):
        index.upsert({"id": f"acme-salary-copy-{copy}", "tenantId": "acme", "text": "Acme salary bands for engineers and support agents.", "allowedGroups": ["hr"]})
    results = index.search(PEOPLE["dana"], "salary bands for engineers", top_k=2)
    assert len(results) == 2
    for result in results:
        assert mod.can_read(PEOPLE["dana"], by_id(result["id"])) is True
    assert all("salary" in result_id for result_id in ids(index.search(PEOPLE["maria"], "salary bands for engineers", top_k=2)))
    assert index.search({"userId": "guest", "tenantId": "acme", "groups": []}, "leave", top_k=3) == []


@test("a permission change takes effect on the next search without re-embedding unchanged text")
def _():
    embedder = SpyEmbedder()
    index = loaded_index(embedder)
    embedded_documents = len(embedder.calls)
    assert ids(index.search(PEOPLE["dana"], "October outage certificate", top_k=1)) == ["acme-incident-review"]
    index.upsert({**by_id("acme-incident-review"), "allowedGroups": ["security"]})
    assert len(embedder.calls) == embedded_documents + 1
    assert "acme-incident-review" not in ids(index.search(PEOPLE["dana"], "October outage certificate", top_k=5))
    assert index.count() == len(DOCUMENTS)
    index.upsert({**by_id("acme-handbook-leave"), "text": "Acme employees get 30 days of paid leave a year from 2027."})
    assert ["Acme employees get 30 days of paid leave a year from 2027."] in embedder.calls
    [leave] = index.search(PEOPLE["sam"], "paid leave days", top_k=1)
    assert "30 days" in leave["text"]


@test("deleted documents disappear from every later search")
def _():
    index = loaded_index()
    assert ids(index.search(PEOPLE["maria"], "performance review Dana raise", top_k=1)) == ["acme-performance-review-dana"]
    assert index.remove("acme-performance-review-dana") is True
    assert index.remove("acme-performance-review-dana") is False
    assert index.count() == len(DOCUMENTS) - 1
    assert "acme-performance-review-dana" not in ids(index.search(PEOPLE["maria"], "performance review Dana raise", top_k=10))


@test("moving a document to another tenant hides it from the old tenant immediately")
def _():
    index = loaded_index()
    index.upsert({**by_id("acme-incident-review"), "tenantId": "globex"})
    assert "acme-incident-review" not in ids(index.search(PEOPLE["dana"], "October outage certificate", top_k=10))
    kim = {"userId": "kim", "tenantId": "globex", "groups": ["engineering"]}
    assert ids(index.search(kim, "October outage certificate", top_k=1)) == ["acme-incident-review"]


@test("answer_question sends only passages the user may read and skips the model when nothing readable matches")
async def _():
    index = loaded_index()
    fake_model.handle(lambda request, context: respond.text(["Employees get 25 days of paid leave [1].", "You have 25 days of leave a year [1]."]))
    answered = await mod.answer_question(create_model(), index, PEOPLE["sam"], "How many days of paid leave and what are the salary bands?")
    assert "[1]" in answered["answer"]
    assert "acme-handbook-leave" in answered["sourceIds"]
    for source_id in answered["sourceIds"]:
        assert mod.can_read(PEOPLE["sam"], by_id(source_id)) is True
    prompt = "\n".join(message["content"] for message in fake_model.requests[0]["messages"])
    assert by_id("acme-handbook-leave")["text"] in prompt
    for forbidden in ["acme-salary-bands", "acme-performance-review-dana", "globex-salary-bands", "globex-handbook-leave"]:
        assert by_id(forbidden)["text"] not in prompt
    outsider = await mod.answer_question(create_model(), index, {"userId": "guest", "tenantId": "initech", "groups": ["all-staff"]}, "How many days of paid leave?")
    assert outsider == {"answer": None, "sourceIds": []}
    assert len(fake_model.requests) == 1
