from dojo_ai import count_tokens

SUMMARY_PREFIX = "Summary of the earlier conversation:"

SUMMARIZER_PROMPT = (
    "You maintain the running summary of a conversation. Merge the previous summary and the new messages into one updated summary. "
    "Keep names, numbers, decisions and open questions. Write plain sentences, no preamble."
)


def build_context(system, summary, history, max_tokens, keep_recent):
    head = [{"role": "system", "content": system}]
    if summary:
        head.append({"role": "system", "content": f"{SUMMARY_PREFIX} {summary}"})
    start = len(history) - min(keep_recent, len(history))
    while start > 0 and count_tokens(head + history[start - 1:]) <= max_tokens:
        start -= 1
    return {"messages": head + history[start:], "overflow": history[:start]}


async def summarize(model, previous_summary, messages, max_tokens=300):
    previous = f"Previous summary:\n{previous_summary}\n\n" if previous_summary else ""
    transcript = "\n".join(f"{message['role']}: {message['content']}" for message in messages)
    try:
        response = await model.generate({
            "messages": [
                {"role": "system", "content": SUMMARIZER_PROMPT},
                {"role": "user", "content": f"{previous}New messages:\n{transcript}"},
            ],
            "maxTokens": max_tokens,
        })
    except Exception:
        return None
    text = response["text"].strip()
    return text if response["finishReason"] == "stop" and text else None


class ConversationMemory:
    """Sliding window over the history plus a running summary of the messages folded out of it."""

    def __init__(self, model, system, max_tokens, keep_recent, summary_max_tokens=300):
        self.model = model
        self.system = system
        self.max_tokens = max_tokens
        self.keep_recent = keep_recent
        self.summary_max_tokens = summary_max_tokens
        self.summary = ""
        self.history = []

    def window(self):
        return build_context(self.system, self.summary, self.history, self.max_tokens, self.keep_recent)

    def add(self, message):
        self.history.append(dict(message))

    def context(self):
        return self.window()["messages"]

    async def compact(self):
        overflow = self.window()["overflow"]
        if not overflow:
            return {"folded": 0, "summarized": False}
        updated = await summarize(self.model, self.summary, overflow, self.summary_max_tokens)
        if updated is None:
            return {"folded": 0, "summarized": False}
        self.summary = updated
        self.history = self.history[len(overflow):]
        return {"folded": len(overflow), "summarized": True}

    def state(self):
        return {"summary": self.summary, "history": [dict(message) for message in self.history]}


def create_conversation_memory(model, system, max_tokens, keep_recent, summary_max_tokens=300):
    return ConversationMemory(model, system, max_tokens, keep_recent, summary_max_tokens)
