from dojo_ai import create_model

from agent import *
from briefing import *
from evals import *
from governance import *
from mcp import *
from policy import *
from retrieval import *

MODEL_ID = "dojo-fake-1-2026-10-01"
DEFAULT_BUDGET = {"maxSteps": 6, "maxCostUsd": 0.05}
EVAL_THRESHOLD = 0.8


class SupportAssistant:
    """The wired copilot: `support` (server and logs), `client` (MCP) and `await ask(question)`."""

    def __init__(self, model, approve, budget):
        self.model = model
        self.approve = approve
        self.budget = budget
        self.support = create_support_server(retriever=create_retriever(DOCUMENTS), invoices=INVOICES)
        self.client = create_mcp_client(self.support.server)

    async def ask(self, question):
        return await run_agent(question, model=self.model, client=self.client, policy=SUPPORT_POLICY, approve=self.approve, budget=self.budget)


def create_support_assistant(*, model=None, approve=None, budget=DEFAULT_BUDGET):
    return SupportAssistant(create_model(model=MODEL_ID) if model is None else model, approve, budget)


async def evaluate_assistant(assistant):
    return await run_evals(GOLDEN_SET, assistant.ask, threshold=EVAL_THRESHOLD)
