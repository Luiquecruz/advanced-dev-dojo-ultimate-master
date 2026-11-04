import math
import time

from dojo_ai import count_tokens


class BudgetExceededError(Exception):
    """A call refused before sending because its worst case does not fit the `scope` budget: "request" or "session"."""

    def __init__(self, scope, message):
        super().__init__(message)
        self.scope = scope


def system_clock():
    return time.time_ns() // 1_000_000


def estimate_cost(messages, max_tokens, pricing, safety_margin=0):
    # TODO: count input tokens with count_tokens(messages), add the safety margin (round up with math.ceil) and price the worst case (every allowed output token)
    return {"inputTokens": 0, "maxOutputTokens": max_tokens, "maxCost": 0}


class BudgetedClient:
    """A model client that refuses calls whose worst case exceeds the request or session budget."""

    def __init__(self, model, pricing, max_request_cost, max_session_cost, safety_margin=0.2, now=system_clock):
        self.model = model
        self.pricing = pricing
        self.max_request_cost = max_request_cost
        self.max_session_cost = max_session_cost
        self.safety_margin = safety_margin
        self.now = now
        self.totals = {"requests": 0, "inputTokens": 0, "outputTokens": 0, "cost": 0, "latenciesMs": []}

    async def send(self, messages, max_tokens):
        # TODO: estimate with the safety margin and raise BudgetExceededError("request" | "session", ...) before calling the model when the worst case does not fit
        # TODO: time the call with self.now(), then add the provider's usage and the latency to the totals
        response = await self.model.generate({"messages": messages, "maxTokens": max_tokens})
        return {"text": response["text"], "usage": response["usage"], "estimatedCost": 0, "latencyMs": 0}

    def report(self):
        return {**self.totals, "latenciesMs": list(self.totals["latenciesMs"])}


def create_budgeted_client(model, pricing, max_request_cost, max_session_cost, safety_margin=0.2, now=system_clock):
    return BudgetedClient(model, pricing, max_request_cost, max_session_cost, safety_margin, now)
