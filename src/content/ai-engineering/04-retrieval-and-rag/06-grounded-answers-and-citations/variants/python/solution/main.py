import re

MAX_ATTEMPTS = 2

SYSTEM_PROMPT = " ".join([
    "You answer questions about Brightdesk using only the numbered sources provided.",
    "Cite the source of every claim with its number in square brackets, like [1] or [2].",
    "Never cite a number that is not in the list. If the sources do not answer the question, say so without citing anything.",
])


def build_context(passages, *, min_score=0.3, max_passages=4):
    eligible = sorted((passage for passage in passages if passage["score"] >= min_score), key=lambda passage: passage["score"], reverse=True)
    sources = [
        {"number": position + 1, "id": passage["id"], "source": passage["source"], "text": passage["text"]}
        for position, passage in enumerate(eligible[:max_passages])
    ]
    context = "\n\n".join(f"[{source['number']}] ({source['source']}) {source['text']}" for source in sources)
    return {"sources": sources, "context": context}


def extract_citations(text):
    return list(dict.fromkeys(int(number) for number in re.findall(r"\[(\d+)\]", text)))


async def answer_with_citations(model, question, passages, *, min_score=0.3, max_passages=4):
    built = build_context(passages, min_score=min_score, max_passages=max_passages)
    sources = built["sources"]
    if not sources:
        return {"status": "no_evidence", "answer": None, "citations": [], "attempts": 0}
    valid_numbers = [source["number"] for source in sources]
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"Sources:\n\n{built['context']}\n\nQuestion: {question}"},
    ]
    for attempt in range(1, MAX_ATTEMPTS + 1):
        response = await model.generate({"messages": messages})
        cited = extract_citations(response["text"])
        invalid = [number for number in cited if number not in valid_numbers]
        if response["finishReason"] == "stop" and cited and not invalid:
            citations = [{"number": number, "id": sources[number - 1]["id"], "source": sources[number - 1]["source"]} for number in cited]
            return {"status": "answered", "answer": response["text"], "citations": citations, "attempts": attempt}
        if invalid:
            problem = f"You cited [{'], ['.join(str(number) for number in invalid)}], which is not a provided source."
        else:
            problem = "Your answer did not cite any provided source."
        valid_list = ", ".join(f"[{number}]" for number in valid_numbers)
        messages = [
            *messages,
            {"role": "assistant", "content": response["text"]},
            {"role": "user", "content": f"{problem} Answer again using only sources {valid_list}, citing one after every claim."},
        ]
    return {"status": "ungrounded", "answer": None, "citations": [], "attempts": MAX_ATTEMPTS}
