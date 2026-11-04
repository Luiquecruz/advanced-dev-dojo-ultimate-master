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
    # TODO: keep the longest prefix of whole sentences within max_tokens; cut characters only when no sentence fits
    return text


def render_documents(documents):
    return "\n".join(f'<document id="{document["id"]}">\n{document["text"]}\n</document>' for document in documents)


def build_context(*, system, history, question, documents, budget, min_score=0, max_document_tokens=math.inf):
    # TODO: check the mandatory part, select and compress documents, add them by relevance while they fit, then add recent turns while they fit
    messages = [{"role": "system", "content": system}, *history, {"role": "user", "content": f"{render_documents(documents)}\n\n{question}"}]
    return {
        "messages": messages,
        "tokens": count_tokens(messages),
        "includedDocumentIds": [document["id"] for document in documents],
        "droppedDocumentIds": [],
        "compressedDocumentIds": [],
        "keptTurns": len(history) // 2,
        "droppedTurns": 0,
    }


async def answer_with_context(model, context_input, max_output_tokens):
    # TODO: budget the context as the model context window minus the output reserve, and pass "maxTokens"
    context = build_context(**context_input, budget=model.context_window)
    response = await model.generate({"messages": context["messages"]})
    return {"text": response["text"], "context": context}
