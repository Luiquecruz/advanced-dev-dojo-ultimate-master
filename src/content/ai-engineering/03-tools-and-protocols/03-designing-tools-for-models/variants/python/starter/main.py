import json
from collections.abc import Callable
from dataclasses import dataclass

from orders import ORDERS
from schema import Integer, Object, String


class ToolError(Exception):
    """A failure the model can fix: a message written for the model and an optional hint about the next step."""

    def __init__(self, message, hint=None):
        super().__init__(message)
        self.hint = hint


@dataclass
class DefinedTool:
    """A tool ready for a model: the `definition` to offer and `await call(raw_arguments)` to answer a tool call."""

    definition: dict
    call: Callable


def define_tool(name, description, input, run):
    async def call(raw_arguments):
        # TODO: never raise: broken JSON, schema failures (one "- path: message" line per issue), ToolError and unexpected errors all become "Error: ..." strings
        result = run(json.loads(raw_arguments))
        return json.dumps(result)

    # TODO: derive parameters from the schema with to_json_schema(input), without the "$schema" key
    return DefinedTool(definition={"name": name, "description": description, "parameters": {"type": "object"}}, call=call)


# TODO: describe every field, reject unknown keys, accept only emails and the four statuses, bound limit to 1..20 with a default of 5
search_orders_input = Object(
    {
        "customerEmail": String(),
        "status": String(optional=True),
        "limit": Integer(optional=True),
    },
)


def find_orders(arguments):
    # TODO: unknown customer -> ToolError with a hint; most recent first; only id, status, total, placedAt; total, truncated and a hint when truncated
    return [order for order in ORDERS if order["customerEmail"] == arguments["customerEmail"] and arguments.get("status") in (None, order["status"])]


search_orders = define_tool(
    name="search_orders",
    # TODO: say what the tool returns and when to use it
    description="Searches orders.",
    input=search_orders_input,
    run=find_orders,
)
