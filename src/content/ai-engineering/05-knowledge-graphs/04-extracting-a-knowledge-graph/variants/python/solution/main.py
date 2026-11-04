import json
import re
import unicodedata

LEGAL_SUFFIXES = {"inc", "incorporated", "corp", "corporation", "co", "company", "ltd", "limited", "llc", "gmbh", "plc"}


class ExtractionError(Exception):
    """Raised when a model reply cannot be turned into an extraction."""


def normalize_name(name):
    without_accents = re.sub("[̀-ͯ]", "", unicodedata.normalize("NFD", name))
    words = re.sub("[^a-z0-9]+", " ", without_accents.lower()).split()
    if len(words) > 1 and words[0] == "the":
        words.pop(0)
    while len(words) > 1 and words[-1] in LEGAL_SUFFIXES:
        words.pop()
    return " ".join(words)


def parse_extraction(text):
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end <= start:
        raise ExtractionError("The reply contains no JSON object")
    try:
        value = json.loads(text[start : end + 1])
    except json.JSONDecodeError as error:
        raise ExtractionError(f"The reply is not valid JSON: {error}") from None
    if not isinstance(value, dict) or not isinstance(value.get("entities"), list) or not isinstance(value.get("relations"), list):
        raise ExtractionError('The reply must be an object with "entities" and "relations" arrays')
    return {"entities": value["entities"], "relations": value["relations"]}


def build_extraction_request(text, ontology):
    relations = "\n".join(f"- {relation['name']} ({relation['domain']} -> {relation['range']})" for relation in ontology["relations"])
    system = "\n".join([
        "Extract entities and relations from the user text into a knowledge graph.",
        f"Entity types (use only these): {', '.join(ontology['classes'])}.",
        f"Relations (use only these, source type -> target type):\n{relations}",
        'Use the full name of each entity as "name" and list other spellings found in the text as "aliases".',
        'Reply with JSON only: {"entities":[{"name":"...","type":"...","aliases":["..."]}],"relations":[{"source":"<entity name>","type":"<relation>","target":"<entity name>"}]}',
    ])
    return {
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": text},
        ],
        "responseFormat": {"type": "json"},
    }


async def extract_graph(model, text, ontology, max_attempts=2):
    request = build_extraction_request(text, ontology)
    messages = request["messages"]
    last_problem = ""
    for _attempt in range(max_attempts):
        response = await model.generate({**request, "messages": messages})
        if response["finishReason"] in ("refusal", "content_filter"):
            raise ExtractionError(f"The model declined to extract ({response['finishReason']})")
        try:
            return parse_extraction(response["text"])
        except ExtractionError as error:
            last_problem = str(error)
            messages = [
                *request["messages"],
                {"role": "assistant", "content": response["text"]},
                {"role": "user", "content": f"{last_problem}. Reply again with the complete JSON object only, no prose and no code fence."},
            ]
    raise ExtractionError(f"No valid extraction after {max_attempts} attempts: {last_problem}")


def validate_extraction(extraction, ontology):
    accepted = {"entities": [], "relations": []}
    rejected = []
    type_by_name = {}
    for entity in extraction["entities"]:
        if not isinstance(entity.get("name"), str) or normalize_name(entity["name"]) == "":
            rejected.append({"item": entity, "reason": "Entity has an empty name"})
        elif entity.get("type") not in ontology["classes"]:
            rejected.append({"item": entity, "reason": f'Entity "{entity["name"]}" has type "{entity.get("type")}", which is not in the ontology'})
        else:
            accepted["entities"].append(entity)
            for name in [entity["name"], *(entity.get("aliases") or [])]:
                type_by_name.setdefault(normalize_name(name), entity["type"])
    for relation in extraction["relations"]:
        definition = next((candidate for candidate in ontology["relations"] if candidate["name"] == relation["type"]), None)
        source_type = type_by_name.get(normalize_name(relation["source"]))
        target_type = type_by_name.get(normalize_name(relation["target"]))
        if definition is None:
            rejected.append({"item": relation, "reason": f'Relation "{relation["type"]}" is not in the ontology'})
        elif source_type is None or target_type is None:
            missing = relation["source"] if source_type is None else relation["target"]
            rejected.append({"item": relation, "reason": f'Relation "{relation["type"]}" references "{missing}", which is not an accepted entity'})
        elif source_type != definition["domain"]:
            rejected.append({"item": relation, "reason": f'Relation "{relation["type"]}" needs a {definition["domain"]} as source, got {source_type} "{relation["source"]}"'})
        elif target_type != definition["range"]:
            rejected.append({"item": relation, "reason": f'Relation "{relation["type"]}" needs a {definition["range"]} as target, got {target_type} "{relation["target"]}"'})
        else:
            accepted["relations"].append(relation)
    return {"accepted": accepted, "rejected": rejected}


def create_knowledge_graph():
    return {"entities": [], "relations": []}


def resolve_entity(graph, name, entity_type):
    key = normalize_name(name)
    return next(
        (entity for entity in graph["entities"] if entity["type"] == entity_type and any(normalize_name(known) == key for known in [entity["name"], *entity["aliases"]])),
        None,
    )


def merge_extraction(graph, extraction, document_id):
    report = {"created": 0, "merged": 0, "relationsAdded": 0}
    id_by_name = {}
    for entity in extraction["entities"]:
        names = [entity["name"], *(entity.get("aliases") or [])]
        stored = next((found for found in (resolve_entity(graph, name, entity["type"]) for name in names) if found is not None), None)
        if stored is None:
            stored = {
                "id": f"{entity['type'].lower()}:{normalize_name(entity['name']).replace(' ', '-')}",
                "name": entity["name"],
                "type": entity["type"],
                "aliases": [],
                "sources": [],
            }
            graph["entities"].append(stored)
            report["created"] += 1
        else:
            report["merged"] += 1
        for name in names:
            if name != stored["name"] and name not in stored["aliases"]:
                stored["aliases"].append(name)
            id_by_name.setdefault(normalize_name(name), stored["id"])
        if document_id not in stored["sources"]:
            stored["sources"].append(document_id)
    for relation in extraction["relations"]:
        source = id_by_name.get(normalize_name(relation["source"]))
        target = id_by_name.get(normalize_name(relation["target"]))
        if source is None or target is None:
            continue
        existing = next(
            (stored for stored in graph["relations"] if stored["source"] == source and stored["type"] == relation["type"] and stored["target"] == target),
            None,
        )
        if existing is None:
            graph["relations"].append({"source": source, "type": relation["type"], "target": target, "sources": [document_id]})
            report["relationsAdded"] += 1
        elif document_id not in existing["sources"]:
            existing["sources"].append(document_id)
    return report


async def build_knowledge_graph(model, documents, ontology):
    result = {"graph": create_knowledge_graph(), "rejected": [], "failed": []}
    for document in documents:
        try:
            extraction = await extract_graph(model, document["text"], ontology)
        except Exception as error:
            result["failed"].append({"documentId": document["id"], "reason": str(error)})
            continue
        validation = validate_extraction(extraction, ontology)
        result["rejected"].extend({**rejection, "documentId": document["id"]} for rejection in validation["rejected"])
        merge_extraction(result["graph"], validation["accepted"], document["id"])
    return result
