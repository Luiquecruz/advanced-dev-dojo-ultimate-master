from dojo_ai import count_tokens, create_model

SYSTEM = 'You are the Parcelly help assistant. Answer only from the documents and say "I do not know" when they do not cover the question.'
QUESTION = "Can I get a refund for a damaged parcel?"
REFUNDS = {"id": "refunds", "score": 0.91, "text": "Refunds for damaged parcels are issued within five business days after the claim is approved. Claims need a photo of the damage. Refunds go back to the original payment method."}
CLAIMS = {"id": "claims", "score": 0.84, "text": "To open a damage claim, go to Orders, choose the parcel and press Report a problem. Claims must be opened within 14 days of delivery."}
POLICY = {
    "id": "policy",
    "score": 0.72,
    "text": "The general terms cover every parcel sent with Parcelly. " * 4 + "Liability for damage is limited to the declared value of the parcel. " * 12,
}
SHIPPING = {"id": "shipping", "score": 0.4, "text": "Standard shipping takes two to four business days within the EU."}
CAREERS = {"id": "careers", "score": 0.05, "text": "Parcelly is hiring couriers in Lisbon and Porto."}
DOCUMENTS = [CLAIMS, CAREERS, POLICY, REFUNDS, SHIPPING]
HISTORY = [
    {"role": "user", "content": "Hi, my parcel 2210 arrived today."},
    {"role": "assistant", "content": "Thanks for letting us know. How can I help with parcel 2210?"},
    {"role": "user", "content": "The box was crushed and the vase inside is broken."},
    {"role": "assistant", "content": "I am sorry to hear that. I can help you with a damage claim."},
    {"role": "user", "content": "Do I need to keep the box?"},
    {"role": "assistant", "content": "Yes, please keep the box and the packaging until the claim is closed."},
]


def render(documents):
    return "\n".join(f'<document id="{document["id"]}">\n{document["text"]}\n</document>' for document in documents)


def final_content(documents):
    return QUESTION if not documents else f"{render(documents)}\n\n{QUESTION}"


def tokens_for(history, documents):
    return count_tokens([{"role": "system", "content": SYSTEM}, *history, {"role": "user", "content": final_content(documents)}])


def pick(value, keys):
    return {key: value[key] for key in keys}


def context_input(**extra):
    return {"system": SYSTEM, "history": HISTORY, "question": QUESTION, "documents": DOCUMENTS, "min_score": 0.2, **extra}


@test("compress_text keeps whole leading sentences within the limit, and cuts characters only when no sentence fits")
def _():
    assert mod.compress_text(REFUNDS["text"], 1000) == REFUNDS["text"]
    compressed = mod.compress_text(REFUNDS["text"], 32)
    assert compressed == "Refunds for damaged parcels are issued within five business days after the claim is approved. Claims need a photo of the damage."
    assert count_tokens(compressed) <= 32
    cut = mod.compress_text(REFUNDS["text"], 5)
    assert cut == REFUNDS["text"][:20]
    assert count_tokens(cut) <= 5


@test("with room for everything: drops irrelevant documents, orders the rest most relevant last, keeps history and puts the question last")
def _():
    context = mod.build_context(**context_input(budget=2000))
    assert context["includedDocumentIds"] == ["shipping", "policy", "claims", "refunds"]
    assert context["droppedDocumentIds"] == ["careers"]
    assert [message["role"] for message in context["messages"]] == ["system", "user", "assistant", "user", "assistant", "user", "assistant", "user"]
    assert context["messages"][0] == {"role": "system", "content": SYSTEM}
    assert context["messages"][1:7] == HISTORY
    assert context["messages"][-1] == {"role": "user", "content": final_content([SHIPPING, POLICY, CLAIMS, REFUNDS])}
    assert context["tokens"] == count_tokens(context["messages"])
    assert pick(context, ["keptTurns", "droppedTurns", "compressedDocumentIds"]) == {"keptTurns": 3, "droppedTurns": 0, "compressedDocumentIds": []}


@test("under a tight budget drops the least relevant document that does not fit, but still takes a smaller one that does")
def _():
    budget = tokens_for(HISTORY, [SHIPPING, CLAIMS, REFUNDS]) + 4
    context = mod.build_context(**context_input(budget=budget))
    assert context["includedDocumentIds"] == ["shipping", "claims", "refunds"]
    assert sorted(context["droppedDocumentIds"]) == ["careers", "policy"]
    assert context["tokens"] <= budget
    assert count_tokens(context["messages"]) == context["tokens"]
    assert context["keptTurns"] == 3


@test("drops the oldest turns first, keeps each user and assistant pair together and never leaves a gap in the recent history")
def _():
    documents = [REFUNDS, CLAIMS]
    budget = tokens_for(HISTORY[4:], documents) + 3
    context = mod.build_context(**context_input(documents=documents, budget=budget))
    assert context["messages"][1:-1] == HISTORY[4:]
    assert pick(context, ["keptTurns", "droppedTurns", "includedDocumentIds"]) == {"keptTurns": 1, "droppedTurns": 2, "includedDocumentIds": ["claims", "refunds"]}

    long_middle = [HISTORY[0], HISTORY[1], HISTORY[2], {"role": "assistant", "content": "Here is everything about claims. " * 30}, HISTORY[4], HISTORY[5]]
    room_for_old_and_new = tokens_for([HISTORY[0], HISTORY[1], HISTORY[4], HISTORY[5]], documents) + 3
    gapless = mod.build_context(**context_input(documents=documents, history=long_middle, budget=room_for_old_and_new))
    assert gapless["messages"][1:-1] == [HISTORY[4], HISTORY[5]]
    assert gapless["keptTurns"] == 1


@test("compresses documents above max_document_tokens to a prefix of whole sentences and reports them")
def _():
    context = mod.build_context(**context_input(budget=2000, max_document_tokens=40))
    assert sorted(context["compressedDocumentIds"]) == ["policy", "refunds"]
    final = context["messages"][-1]["content"]
    policy_text = final.split('<document id="policy">\n')[1].split("\n</document>")[0]
    assert POLICY["text"].startswith(policy_text)
    assert count_tokens(policy_text) <= 40
    assert CLAIMS["text"] in final
    assert final.endswith(QUESTION)


@test("raises ContextBudgetError when the system prompt and the question alone exceed the budget")
async def _():
    required = tokens_for([], [])
    error = await capture_error(lambda: mod.build_context(**context_input(budget=required - 1)))
    assert isinstance(error, mod.ContextBudgetError)
    assert error.required == required
    assert error.budget == required - 1
    minimal = mod.build_context(**context_input(budget=required))
    assert minimal["messages"] == [{"role": "system", "content": SYSTEM}, {"role": "user", "content": QUESTION}]
    assert pick(minimal, ["includedDocumentIds", "keptTurns", "droppedTurns"]) == {"includedDocumentIds": [], "keptTurns": 0, "droppedTurns": 3}


@test("answer_with_context fits the request into the model context window minus the output reserve")
async def _():
    for context_window in [260, 400, 32000]:
        fake_model.reset().configure(context_window=context_window)
        fake_model.reply(respond.text(["Yes, within five business days.", "Yes. Open a claim within 14 days and keep the box."]))
        result = await mod.answer_with_context(create_model(), context_input(), 60)
        request = fake_model.requests[0]
        assert request["maxTokens"] == 60
        assert count_tokens(request["messages"]) <= context_window - 60
        assert request["messages"][-1]["content"].endswith(QUESTION)
        assert result["text"] == fake_model.responses[0]["text"]
        assert result["context"]["messages"] == request["messages"]
