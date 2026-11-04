import json

from dojo_ai import create_model

ONTOLOGY = {
    "classes": ["Person", "Organization", "Product"],
    "relations": [
        {"name": "worksFor", "domain": "Person", "range": "Organization"},
        {"name": "makes", "domain": "Organization", "range": "Product"},
        {"name": "acquired", "domain": "Organization", "range": "Organization"},
    ],
}

MEMO = "Ana Souza leads research at Acme Corp. Acme makes the Roadrunner drone."

MEMO_EXTRACTION = {
    "entities": [
        {"name": "Ana Souza", "type": "Person"},
        {"name": "Acme Corp", "type": "Organization", "aliases": ["Acme"]},
        {"name": "Roadrunner", "type": "Product"},
    ],
    "relations": [
        {"source": "Ana Souza", "type": "worksFor", "target": "Acme Corp"},
        {"source": "Acme", "type": "makes", "target": "Roadrunner"},
    ],
}


def entity_ids(graph):
    return [entity["id"] for entity in graph["entities"]]


@test('normalize_name lowercases, strips accents and punctuation, and drops a leading "the" and trailing legal suffixes')
def _():
    assert mod.normalize_name("  Ácme   Corp. ") == "acme"
    assert mod.normalize_name("ACME Corporation") == "acme"
    assert mod.normalize_name("The Acme Company, Inc.") == "acme"
    assert mod.normalize_name("José  Álvarez-Núñez") == "jose alvarez nunez"
    assert mod.normalize_name("Initech LLC") == "initech"
    assert mod.normalize_name("Co") == "co"
    assert mod.normalize_name("The") == "the"
    assert mod.normalize_name("Roadrunner 2") == "roadrunner 2"
    assert mod.normalize_name("!!!") == ""


@test("parse_extraction reads JSON wrapped in prose or a code fence and rejects broken or incomplete JSON with an ExtractionError")
async def _():
    compact = json.dumps(MEMO_EXTRACTION, separators=(",", ":"))
    assert mod.parse_extraction(compact) == MEMO_EXTRACTION
    assert mod.parse_extraction(f"Sure! Here it is:\n```json\n{compact}\n```") == MEMO_EXTRACTION
    broken = [compact[:40], compact[:-1] + ",}", compact.replace('"', "'"), "No entities found.", '{"entities": []}', '{"entities": {}, "relations": []}']
    for text in broken:
        error = await capture_error(lambda: mod.parse_extraction(text))
        assert isinstance(error, mod.ExtractionError), text


@test("extract_graph asks for JSON with the ontology classes and relations in the prompt and the document as the user message")
async def _():
    fake_model.reply(respond.json(MEMO_EXTRACTION))
    extraction = await mod.extract_graph(create_model(), MEMO, ONTOLOGY)
    assert extraction == MEMO_EXTRACTION
    request = fake_model.requests[0]
    assert request["responseFormat"] == {"type": "json"}
    assert request["messages"][0]["role"] == "system"
    for name in ["Person", "Organization", "Product", "worksFor", "makes", "acquired"]:
        assert name in request["messages"][0]["content"], name
    assert request["messages"][-1] == {"role": "user", "content": MEMO}


@test("extract_graph survives every malformed JSON shape by re-asking once with the bad reply in the history")
async def _():
    retried = 0

    async def scenario():
        nonlocal retried
        fake_model.reply(respond.malformed_json(MEMO_EXTRACTION), respond.json(MEMO_EXTRACTION))
        extraction = await mod.extract_graph(create_model(), MEMO, ONTOLOGY)
        assert extraction == MEMO_EXTRACTION
        requests = fake_model.requests
        if len(requests) == 1:
            assert "```" in fake_model.responses[0]["text"]
            return
        retried += 1
        first, second = requests
        assert len(requests) == 2
        assert second["messages"][: len(first["messages"])] == first["messages"]
        assert second["messages"][len(first["messages"])] == {"role": "assistant", "content": fake_model.responses[0]["text"]}
        assert second["messages"][-1]["role"] == "user"

    await for_each_seed(24, scenario)
    assert retried > 0


@test("extract_graph fails with an ExtractionError after max_attempts unusable replies, and immediately on a refusal")
async def _():
    fake_model.reply(
        respond.text("I found Ana and Acme."),
        respond.truncated(json.dumps(MEMO_EXTRACTION, separators=(",", ":"))),
        respond.text('{"entities": []}'),
        respond.json(MEMO_EXTRACTION),
    )
    error = await capture_error(mod.extract_graph(create_model(), MEMO, ONTOLOGY, max_attempts=3))
    assert isinstance(error, mod.ExtractionError)
    assert len(fake_model.requests) == 3

    fake_model.reset().reply(respond.refusal(), respond.json(MEMO_EXTRACTION))
    assert isinstance(await capture_error(mod.extract_graph(create_model(), MEMO, ONTOLOGY)), mod.ExtractionError)
    assert len(fake_model.requests) == 1


@test("validate_extraction accepts what fits the ontology and rejects the rest with a reason naming the problem")
def _():
    extraction = {
        "entities": [
            {"name": "Ana Souza", "type": "Person"},
            {"name": "Acme Corp", "type": "Organization", "aliases": ["Acme"]},
            {"name": "Roadrunner", "type": "Product"},
            {"name": "Berlin", "type": "City"},
            {"name": "  ", "type": "Person"},
        ],
        "relations": [
            {"source": "Ana Souza", "type": "worksFor", "target": "ACME"},
            {"source": "Acme", "type": "makes", "target": "Roadrunner"},
            {"source": "Ana Souza", "type": "livesIn", "target": "Berlin"},
            {"source": "Acme Corp", "type": "acquired", "target": "Globex"},
            {"source": "Roadrunner", "type": "worksFor", "target": "Acme"},
            {"source": "Acme", "type": "makes", "target": "Ana Souza"},
        ],
    }
    result = mod.validate_extraction(extraction, ONTOLOGY)
    accepted, rejected = result["accepted"], result["rejected"]
    assert [entity["name"] for entity in accepted["entities"]] == ["Ana Souza", "Acme Corp", "Roadrunner"]
    assert accepted["relations"] == [extraction["relations"][0], extraction["relations"][1]]
    assert [rejection["item"] for rejection in rejected] == [
        extraction["entities"][3],
        extraction["entities"][4],
        extraction["relations"][2],
        extraction["relations"][3],
        extraction["relations"][4],
        extraction["relations"][5],
    ]
    reasons = [rejection["reason"] for rejection in rejected]
    assert "City" in reasons[0]
    assert "livesIn" in reasons[2]
    assert "Globex" in reasons[3]
    assert "Person" in reasons[4]
    assert "Product" in reasons[5]


@test("merge_extraction resolves entities across documents by normalized name and alias, keeps aliases and provenance, and deduplicates relations")
def _():
    graph = mod.create_knowledge_graph()
    first = mod.merge_extraction(graph, MEMO_EXTRACTION, "memo-1")
    assert first == {"created": 3, "merged": 0, "relationsAdded": 2}
    second = mod.merge_extraction(graph, {
        "entities": [
            {"name": "ACME Corporation", "type": "Organization"},
            {"name": "Ána Souza", "type": "Person"},
            {"name": "Globex Inc.", "type": "Organization"},
        ],
        "relations": [
            {"source": "Ána Souza", "type": "worksFor", "target": "ACME Corporation"},
            {"source": "ACME Corporation", "type": "acquired", "target": "Globex Inc."},
        ],
    }, "report-7")
    assert second == {"created": 1, "merged": 2, "relationsAdded": 1}
    catalog = mod.merge_extraction(graph, {"entities": [{"name": "Acme", "type": "Product"}], "relations": []}, "catalog-9")
    assert catalog == {"created": 1, "merged": 0, "relationsAdded": 0}
    again = mod.merge_extraction(graph, MEMO_EXTRACTION, "memo-1")
    assert again == {"created": 0, "merged": 3, "relationsAdded": 0}

    acme = mod.resolve_entity(graph, "acme corp.", "Organization")
    assert acme == {"id": "organization:acme", "name": "Acme Corp", "type": "Organization", "aliases": ["Acme", "ACME Corporation"], "sources": ["memo-1", "report-7"]}
    assert mod.resolve_entity(graph, "ACME", "Product")["id"] == "product:acme"
    assert mod.resolve_entity(graph, "Initech", "Organization") is None
    assert entity_ids(graph) == ["person:ana-souza", "organization:acme", "product:roadrunner", "organization:globex", "product:acme"]
    assert graph["relations"] == [
        {"source": "person:ana-souza", "type": "worksFor", "target": "organization:acme", "sources": ["memo-1", "report-7"]},
        {"source": "organization:acme", "type": "makes", "target": "product:roadrunner", "sources": ["memo-1"]},
        {"source": "organization:acme", "type": "acquired", "target": "organization:globex", "sources": ["report-7"]},
    ]


@test("build_knowledge_graph validates and merges every document, logs rejected facts with their document and keeps going after a failed extraction")
async def _():
    press_extraction = {
        "entities": [{"name": "ACME Corporation", "type": "Organization"}, {"name": "Berlin", "type": "City"}],
        "relations": [{"source": "ACME Corporation", "type": "locatedIn", "target": "Berlin"}],
    }

    def answer(request, context):
        document = next(message["content"] for message in request["messages"] if message["role"] == "user")
        is_retry = any(message["role"] == "assistant" for message in request["messages"])
        if document == MEMO:
            return respond.json(MEMO_EXTRACTION)
        if document.startswith("ACME"):
            return respond.json(press_extraction) if is_retry else respond.malformed_json(press_extraction)
        return respond.refusal()

    async def scenario():
        fake_model.handle(answer)
        documents = [
            {"id": "memo-1", "text": MEMO},
            {"id": "press-2", "text": "ACME Corporation opened an office in Berlin."},
            {"id": "leak-3", "text": "Confidential salary list."},
        ]
        result = await mod.build_knowledge_graph(create_model(), documents, ONTOLOGY)
        assert entity_ids(result["graph"]) == ["person:ana-souza", "organization:acme", "product:roadrunner"]
        assert mod.resolve_entity(result["graph"], "Acme", "Organization")["sources"] == ["memo-1", "press-2"]
        assert len(result["graph"]["relations"]) == 2
        labels = [f"{rejection['documentId']}:{rejection['item']['name'] if 'name' in rejection['item'] else rejection['item']['type']}" for rejection in result["rejected"]]
        assert labels == ["press-2:Berlin", "press-2:locatedIn"]
        assert [failure["documentId"] for failure in result["failed"]] == ["leak-3"]
        assert len(result["failed"][0]["reason"]) > 0

    await for_each_seed(10, scenario)
