import inspect
import json
from collections.abc import Callable
from dataclasses import dataclass

from orders import ORDERS
from schema import Email, Enum, Integer, Object, to_json_schema


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


def parameters_of(input):
    parameters = to_json_schema(input)
    del parameters["$schema"]
    return parameters


def describe_issues(issues):
    return "\n".join(f"- {'.'.join(str(key) for key in issue.path) or '(root)'}: {issue.message}" for issue in issues)


def define_tool(name, description, input, run):
    async def call(raw_arguments):
        try:
            raw = json.loads(raw_arguments)
        except ValueError:
            return f"Error: arguments for {name} must be a JSON object, and this text is not valid JSON."
        parsed = input.safe_parse(raw)
        if not parsed.success:
            return f"Error: invalid arguments for {name}.\n{describe_issues(parsed.issues)}"
        try:
            result = run(parsed.data)
            if inspect.isawaitable(result):
                result = await result
        except ToolError as error:
            return f"Error: {error}\nHint: {error.hint}" if error.hint else f"Error: {error}"
        except Exception:
            return f"Error: {name} failed unexpectedly. Try again later, or tell the user the lookup is unavailable."
        return result if isinstance(result, str) else json.dumps(result)

    return DefinedTool(definition={"name": name, "description": description, "parameters": parameters_of(input)}, call=call)


search_orders_input = Object(
    {
        "customerEmail": Email(description="Email address the customer used at checkout."),
        "status": Enum(["pending", "shipped", "delivered", "cancelled"], optional=True, description="Only return orders in this status. Omit to include every status."),
        "limit": Integer(minimum=1, maximum=20, default=5, description="Maximum number of orders to return, most recent first (1 to 20, default 5)."),
    },
    strict=True,
)


def find_orders(arguments):
    customer_email = arguments["customerEmail"]
    status = arguments.get("status")
    limit = arguments["limit"]
    customer_orders = [order for order in ORDERS if order["customerEmail"] == customer_email.lower()]
    if not customer_orders:
        raise ToolError(f"No customer with the email {customer_email}.", "Ask the customer to confirm the email address they used at checkout.")
    matching = sorted((order for order in customer_orders if status is None or order["status"] == status), key=lambda order: order["placedAt"], reverse=True)
    orders = [{"id": order["id"], "status": order["status"], "total": order["total"], "placedAt": order["placedAt"]} for order in matching[:limit]]
    result = {"orders": orders, "total": len(matching), "truncated": len(matching) > limit}
    if result["truncated"]:
        result["hint"] = f"Showing the {limit} most recent of {len(matching)} orders. Filter by status or raise limit (up to 20) to see more."
    return result


search_orders = define_tool(
    name="search_orders",
    description=(
        "Find a customer's orders by the email used at checkout, most recent first. Returns each order's id, status, total and date, "
        "plus how many orders matched. Use it before answering any question about a customer's orders."
    ),
    input=search_orders_input,
    run=find_orders,
)
