import math
import re

from dojo_ai import count_tokens


class ContextBudgetError(Exception):
    """The system prompt and the question alone need `required` tokens, above the `budget`."""

    def __init__(self, required, budget):
        super().__init__(f"The system prompt and the question need {required} tokens, above the {budget}-token budget")
        self.required = required
        self.budget = budget


def compress_text(text, max_tokens):
    if count_tokens(text) <= max_tokens:
        return text
    kept = ""
    for sentence in re.split(r"(?<=[.!?])\s+", text):
        candidate = sentence if kept == "" else f"{kept} {sentence}"
        if count_tokens(candidate) > max_tokens:
            break
        kept = candidate
    return text[: max_tokens * 4] if kept == "" else kept


def render_documents(documents):
    return "\n".join(f'<document id="{document["id"]}">\n{document["text"]}\n</document>' for document in documents)


def final_message(question, documents):
    return {"role": "user", "content": question if not documents else f"{render_documents(documents)}\n\n{question}"}


def to_turns(history):
    return [history[index : index + 2] for index in range(0, len(history), 2)]


def build_context(*, system, history, question, documents, budget, min_score=0, max_document_tokens=math.inf):
    system_message = {"role": "system", "content": system}

    def assemble(turns, chosen):
        return [system_message, *[message for turn in turns for message in turn], final_message(question, list(reversed(chosen)))]

    required = count_tokens(assemble([], []))
    if required > budget:
        raise ContextBudgetError(required, budget)
    dropped_document_ids = [document["id"] for document in documents if document["score"] < min_score]
    relevant = [document for document in documents if document["score"] >= min_score]
    compressed_document_ids = []
    ranked = []
    for document in sorted(relevant, key=lambda document: -document["score"]):
        text = compress_text(document["text"], max_document_tokens)
        if text != document["text"]:
            compressed_document_ids.append(document["id"])
        ranked.append({**document, "text": text})
    chosen = []
    for document in ranked:
        if count_tokens(assemble([], [*chosen, document])) <= budget:
            chosen.append(document)
        else:
            dropped_document_ids.append(document["id"])
    turns = to_turns(history)
    kept_turns = []
    for turn in reversed(turns):
        if count_tokens(assemble([turn, *kept_turns], chosen)) > budget:
            break
        kept_turns.insert(0, turn)
    messages = assemble(kept_turns, chosen)
    return {
        "messages": messages,
        "tokens": count_tokens(messages),
        "includedDocumentIds": [document["id"] for document in reversed(chosen)],
        "droppedDocumentIds": dropped_document_ids,
        "compressedDocumentIds": compressed_document_ids,
        "keptTurns": len(kept_turns),
        "droppedTurns": len(turns) - len(kept_turns),
    }


async def answer_with_context(model, context_input, max_output_tokens):
    context = build_context(**context_input, budget=model.context_window - max_output_tokens)
    response = await model.generate({"messages": context["messages"], "maxTokens": max_output_tokens})
    return {"text": response["text"], "context": context}
