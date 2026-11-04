from dojo_ai import count_tokens

SUMMARY_PREFIX = "Summary of the earlier conversation:"

SUMMARIZER_PROMPT = (
    "You maintain the running summary of a conversation. Merge the previous summary and the new messages into one updated summary. "
    "Keep names, numbers, decisions and open questions. Write plain sentences, no preamble."
)


def build_context(system, summary, history, max_tokens, keep_recent):
    # TODO: system message, then the summary message when there is one, then the longest recent suffix of history that fits max_tokens (count_tokens), never fewer than keep_recent messages
    return {"messages": [{"role": "system", "content": system}, *history], "overflow": []}


async def summarize(model, previous_summary, messages, max_tokens=300):
    # TODO: one request with the previous summary and every message, limited to max_tokens; None for errors, refusals, filtered, truncated or empty replies
    response = await model.generate({"messages": [{"role": "system", "content": SUMMARIZER_PROMPT}, *messages]})
    return response["text"]


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

    def add(self, message):
        self.history.append(dict(message))

    def context(self):
        # TODO: the messages build_context keeps for the current summary and history
        return [{"role": "system", "content": self.system}, *self.history]

    async def compact(self):
        # TODO: summarize the overflow into the running summary and drop it from history, but only when the summary succeeded
        return {"folded": 0, "summarized": False}

    def state(self):
        return {"summary": self.summary, "history": [dict(message) for message in self.history]}


def create_conversation_memory(model, system, max_tokens, keep_recent, summary_max_tokens=300):
    return ConversationMemory(model, system, max_tokens, keep_recent, summary_max_tokens)
