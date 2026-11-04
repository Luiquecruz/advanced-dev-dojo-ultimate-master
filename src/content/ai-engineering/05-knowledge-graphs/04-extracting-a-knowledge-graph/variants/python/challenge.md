Build a knowledge graph from documents with a model: schema-guided extraction as JSON, re-asking on broken output, validation against an ontology, entity resolution and a merge that records provenance. The model is passed in as a parameter (the tests pass `create_model()` from `dojo_ai`).

## Data shapes

All data is plain dicts and lists with the JSON keys below (camelCase where a key has two words).

- Ontology: `{"classes", "relations"}`. `"classes"` is a list of type names (`["Person", "Organization", "Product"]`); each relation is `{"name", "domain", "range"}` (source type and target type). There is no inheritance here.
- Extraction (what the model returns): `{"entities", "relations"}`. An entity is `{"name", "type", "aliases"?}`; a relation is `{"source", "type", "target"}` where `"source"` and `"target"` are entity names.
- Knowledge graph: `{"entities", "relations"}`. A stored entity is `{"id", "name", "type", "aliases", "sources"}`; a stored relation is `{"source", "type", "target", "sources"}` where `"source"` and `"target"` are entity ids and `"sources"` lists document ids.

## 1. `normalize_name(name)`

Decompose accents (`unicodedata.normalize("NFD", name)`) and remove the combining marks (`̀`–`ͯ`), lowercase, replace every run of characters other than `a-z` and `0-9` with one space, trim, and split into words. If there is more than one word and the first is `the`, drop it. While there is more than one word and the last is a legal suffix (`inc`, `incorporated`, `corp`, `corporation`, `co`, `company`, `ltd`, `limited`, `llc`, `gmbh`, `plc`), drop it. Join with single spaces. `"The Acme Company, Inc."` becomes `"acme"`.

## 2. `ExtractionError` and `parse_extraction(text)`

`ExtractionError` is an exception class (a subclass of `Exception`). `parse_extraction` parses the text between the first `{` and the last `}` (so prose and code fences around the JSON are fine) and returns `{"entities", "relations"}`. Raise an `ExtractionError` when there is no such object, when it is not valid JSON, or when `"entities"` or `"relations"` is not a list.

## 3. `build_extraction_request(text, ontology)` and `extract_graph(model, text, ontology, max_attempts=2)`

The request is a dict with `"responseFormat": {"type": "json"}` and two messages: a `system` message that names every class and every relation (with its domain and range) and describes the JSON shape, then `{"role": "user", "content": text}`.

`extract_graph` awaits `model.generate` with that request and returns the parsed extraction.

- When `"finishReason"` is `refusal` or `content_filter`, raise an `ExtractionError` at once (no retry).
- When the reply cannot be parsed, call again with the original messages followed by `{"role": "assistant", "content": <the bad reply>}` and a `user` message asking for valid JSON only.
- After `max_attempts` calls without a parseable reply, raise an `ExtractionError`.

## 4. `validate_extraction(extraction, ontology)`

Return `{"accepted", "rejected"}`. `"accepted"` is an extraction with the valid items in their original order; `"rejected"` lists `{"item", "reason"}` for the others, entities first, then relations, each in original order.

- An entity is rejected when its name normalizes to `""`, or when its `"type"` is not a class (the reason contains the type).
- A relation is rejected, checking in this order, when its `"type"` is not a relation of the ontology (the reason contains the type); when its `"source"` or `"target"` does not match an **accepted** entity's name or alias by normalized name (the reason contains the unmatched name); when the source entity's type differs from the domain (the reason contains the domain); when the target entity's type differs from the range (the reason contains the range).

## 5. `create_knowledge_graph()`, `resolve_entity(graph, name, entity_type)` and `merge_extraction(graph, extraction, document_id)`

`create_knowledge_graph` returns `{"entities": [], "relations": []}`. `resolve_entity` returns the stored entity of that type whose `"name"` or one of whose `"aliases"` has the same normalized form as `name`, or `None`.

`merge_extraction` mutates the graph with an (already validated) extraction and returns `{"created", "merged", "relationsAdded"}`:

- For each entity, try `resolve_entity` with its name, then with each alias. If found, it is **merged**; otherwise **create** `{"id": "<type in lowercase>:<normalized name with spaces as ->", "name", "type", "aliases": [], "sources": []}` and append it.
- Add the entity's name and aliases to the stored `"aliases"` when they are not exactly the stored `"name"` and not already listed. Add `document_id` to `"sources"` once.
- For each relation, find the ids of its endpoints among this extraction's entities (by normalized name or alias, first match). If a stored relation with the same `"source"`, `"type"` and `"target"` exists, add `document_id` to its `"sources"` once; otherwise append `{"source", "type", "target", "sources": [document_id]}` and count it in `"relationsAdded"`.

## 6. `build_knowledge_graph(model, documents, ontology)`

`documents` is a list of `{"id", "text"}`. For each document in order: `extract_graph` (default attempts), `validate_extraction`, then `merge_extraction` of the accepted part into one graph. Return `{"graph", "rejected", "failed"}`: `"rejected"` holds every rejection with its `"documentId"` added; `"failed"` holds `{"documentId", "reason"}` for each document whose extraction raised, and processing continues with the next document.

The tests script valid, malformed, truncated and refused replies across seeds and check structure, never wording.
