import json


def parse_json_loosely(text):
    # TODO: try json.loads on the text, on a fenced block and on the span from the first { to the last }; repair single quotes and trailing commas; None when nothing parses
    return json.loads(text)


async def generate_queries(model, question, *, count=3):
    # TODO: ask for {"queries": [...]} as JSON, keep the original question first, dedupe, cap at count + 1, fall back to [question]
    raise NotImplementedError


async def hyde_query(model, question):
    # TODO: ask for a hypothetical answer passage and return question + blank line + passage, or the question alone when there is none
    raise NotImplementedError


async def rerank(model, query, candidates, *, top_k=None):
    # TODO: one JSON request with the query and every candidate, keep valid scores only, scored candidates first, retrieval order as the fallback
    return {"results": [{**candidate, "score": None} for candidate in candidates][:top_k], "reranked": False}
