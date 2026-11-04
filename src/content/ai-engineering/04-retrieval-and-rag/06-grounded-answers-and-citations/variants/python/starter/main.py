def build_context(passages, *, min_score=0.3, max_passages=4):
    # TODO: keep passages with score >= min_score, best first, at most max_passages, numbered from 1; render "[n] (source) text" blocks
    return {"sources": [], "context": ""}


def extract_citations(text):
    # TODO: the unique numbers of every [n] marker, in order of first appearance
    raise NotImplementedError


async def answer_with_citations(model, question, passages, *, min_score=0.3, max_passages=4):
    # TODO: refuse without evidence, ask with numbered sources, validate citations, ask again once with feedback, withhold ungrounded answers
    response = await model.generate({"messages": [{"role": "user", "content": question}]})
    return {"status": "answered", "answer": response["text"], "citations": [], "attempts": 1}
