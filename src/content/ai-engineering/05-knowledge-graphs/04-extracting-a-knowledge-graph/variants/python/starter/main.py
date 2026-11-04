import json
import re
import unicodedata

LEGAL_SUFFIXES = {"inc", "incorporated", "corp", "corporation", "co", "company", "ltd", "limited", "llc", "gmbh", "plc"}


class ExtractionError(Exception):
    """Raised when a model reply cannot be turned into an extraction."""


def normalize_name(name):
    # TODO: strip accents (NFD), lowercase, turn punctuation into spaces, collapse spaces, drop a leading "the" and trailing legal suffixes
    return name.strip().lower()


def parse_extraction(text):
    # TODO: parse the JSON object between the first "{" and the last "}"; raise ExtractionError when it is broken or lacks the two lists
    return json.loads(text)


def build_extraction_request(text, ontology):
    # TODO: a system message listing every class and relation (with domain and range) and the JSON shape; the document as the user message; JSON response format
    return {"messages": [{"role": "user", "content": f"Extract entities and relations from: {text}"}]}


async def extract_graph(model, text, ontology, max_attempts=2):
    # TODO: refusals fail at once; an unparseable reply is re-asked with the bad reply and a correction in the history, up to max_attempts calls
    response = await model.generate(build_extraction_request(text, ontology))
    return parse_extraction(response["text"])


def validate_extraction(extraction, ontology):
    # TODO: reject empty names, unknown types, unknown relations, relations to entities that were not accepted, and domain or range mismatches
    return {"accepted": extraction, "rejected": []}


def create_knowledge_graph():
    return {"entities": [], "relations": []}


def resolve_entity(graph, name, entity_type):
    # TODO: the stored entity of the same type whose name or alias has the same normalized form
    return next((entity for entity in graph["entities"] if entity["type"] == entity_type and entity["name"] == name), None)


def merge_extraction(graph, extraction, document_id):
    # TODO: resolve or create each entity, record aliases and sources, then add or update relations by resolved ids
    raise NotImplementedError


async def build_knowledge_graph(model, documents, ontology):
    # TODO: extract, validate and merge each document; log rejected items with the document id and record failed documents
    raise NotImplementedError
