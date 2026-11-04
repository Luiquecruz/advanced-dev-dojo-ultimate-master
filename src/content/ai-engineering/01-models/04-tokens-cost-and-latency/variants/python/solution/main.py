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
    input_tokens = math.ceil(count_tokens(messages) * (1 + safety_margin))
    max_cost = (input_tokens * pricing["inputPerMillion"] + max_tokens * pricing["outputPerMillion"]) / 1_000_000
    return {"inputTokens": input_tokens, "maxOutputTokens": max_tokens, "maxCost": max_cost}


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
        estimate = estimate_cost(messages, max_tokens, self.pricing, self.safety_margin)
        if estimate["maxCost"] > self.max_request_cost:
            raise BudgetExceededError("request", f"Request could cost ${estimate['maxCost']}, above the ${self.max_request_cost} request limit")
        if self.totals["cost"] + estimate["maxCost"] > self.max_session_cost:
            raise BudgetExceededError("session", f"Request could cost ${estimate['maxCost']} with ${self.max_session_cost - self.totals['cost']} left in the session")
        started_at = self.now()
        response = await self.model.generate({"messages": messages, "maxTokens": max_tokens})
        latency_ms = self.now() - started_at
        usage = response["usage"]
        self.totals["requests"] += 1
        self.totals["inputTokens"] += usage["inputTokens"]
        self.totals["outputTokens"] += usage["outputTokens"]
        self.totals["cost"] += usage["cost"]
        self.totals["latenciesMs"].append(latency_ms)
        return {"text": response["text"], "usage": usage, "estimatedCost": estimate["maxCost"], "latencyMs": latency_ms}

    def report(self):
        return {**self.totals, "latenciesMs": list(self.totals["latenciesMs"])}


def create_budgeted_client(model, pricing, max_request_cost, max_session_cost, safety_margin=0.2, now=system_clock):
    return BudgetedClient(model, pricing, max_request_cost, max_session_cost, safety_margin, now)
