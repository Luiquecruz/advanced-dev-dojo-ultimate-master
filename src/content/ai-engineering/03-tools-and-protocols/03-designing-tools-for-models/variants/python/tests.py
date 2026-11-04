import json
import re

from dojo_ai import create_model
from schema import Integer, Object, String

TRACEBACK_LINE = re.compile(r'Traceback|File ".*", line \d+')


class Spy:
    """Records every call and delegates to the implementation."""

    def __init__(self, implementation):
        self.implementation = implementation
        self.calls = []

    def __call__(self, *arguments):
        self.calls.append(list(arguments))
        return self.implementation(*arguments)


def sunny_forecast(arguments):
    return {"city": arguments["city"], "forecast": ["sunny"] * arguments["days"]}


def weather_tool(run=None):
    run = run or Spy(sunny_forecast)
    tool = mod.define_tool(
        name="get_forecast",
        description="Daily weather forecast for a city, up to seven days ahead.",
        input=Object(
            {
                "city": String(min_length=2, description="City name"),
                "days": Integer(minimum=1, maximum=7, default=3, description="Days ahead"),
            },
            strict=True,
        ),
        run=run,
    )
    return tool, run


async def search(arguments):
    return await mod.search_orders.call(arguments if isinstance(arguments, str) else json.dumps(arguments))


def raise_unknown_city(arguments):
    raise mod.ToolError('Unknown city "Atlantis".', 'Use a real city name, such as "Lisbon".')


def raise_connection_error(arguments):
    raise ConnectionRefusedError("connect ECONNREFUSED 10.0.0.5:5432 user=forecast_admin")


@test("define_tool derives JSON Schema parameters from the schema, with defaults optional and no $schema key")
def _():
    tool, _ = weather_tool()
    assert tool.definition["name"] == "get_forecast"
    assert tool.definition["description"] == "Daily weather forecast for a city, up to seven days ahead."
    parameters = tool.definition["parameters"]
    assert parameters["type"] == "object"
    assert "$schema" not in parameters
    assert parameters.get("required") == ["city"]
    assert parameters.get("additionalProperties") is False
    days = parameters["properties"]["days"]
    expected = {"type": "integer", "minimum": 1, "maximum": 7, "default": 3, "description": "Days ahead"}
    assert expected.items() <= days.items()


@test("call runs the tool with validated arguments (defaults applied) and returns strings as is and other values as JSON")
async def _():
    tool, run = weather_tool()
    assert json.loads(await tool.call('{"city":"Lisbon"}')) == {"city": "Lisbon", "forecast": ["sunny", "sunny", "sunny"]}
    assert run.calls == [[{"city": "Lisbon", "days": 3}]]
    text_tool = mod.define_tool(name="echo", description="Echo the text back.", input=Object({"text": String()}), run=lambda arguments: arguments["text"])
    assert await text_tool.call('{"text":"plain words"}') == "plain words"


@test("call answers broken JSON and schema violations with an error the model can act on, naming every invalid field, without running the tool")
async def _():
    tool, run = weather_tool()
    fake_model.reply(respond.invalid_tool_arguments("get_forecast"))
    broken_arguments = (await create_model().generate({"messages": [{"role": "user", "content": "Weather?"}]}))["toolCalls"][0]["arguments"]
    broken = await tool.call(broken_arguments)
    assert broken.startswith("Error")
    assert "get_forecast" in broken

    invalid = await tool.call('{"city":"X","days":9,"units":"kelvin"}')
    assert invalid.startswith("Error")
    assert "get_forecast" in invalid
    assert re.search(r"^- city: ", invalid, re.MULTILINE)
    assert re.search(r"^- days: ", invalid, re.MULTILINE)
    assert "units" in invalid
    listed = await tool.call("[1, 2]")
    assert listed.startswith("Error")
    assert run.calls == []


@test("call passes a ToolError message and hint to the model, and hides the details of unexpected failures")
async def _():
    expected, _ = weather_tool(Spy(raise_unknown_city))
    known = await expected.call('{"city":"Atlantis"}')
    assert known.startswith("Error")
    assert 'Unknown city "Atlantis".' in known
    assert "Use a real city name" in known

    crashing, _ = weather_tool(Spy(raise_connection_error))
    unexpected = await crashing.call('{"city":"Lisbon"}')
    assert unexpected.startswith("Error")
    assert "get_forecast" in unexpected
    assert "10.0.0.5" not in unexpected
    assert "forecast_admin" not in unexpected
    assert not TRACEBACK_LINE.search(unexpected)


@test("search_orders is described for the model: snake_case name, a useful description, every field described, unknown keys rejected, limit bounded")
def _():
    definition = mod.search_orders.definition
    assert definition["name"] == "search_orders"
    assert len(definition["description"]) >= 60
    parameters = definition["parameters"]
    properties = parameters["properties"]
    assert sorted(properties) == ["customerEmail", "limit", "status"]
    assert parameters.get("required") == ["customerEmail"]
    assert parameters.get("additionalProperties") is False
    for name, property in properties.items():
        assert len(property.get("description") or "") >= 10, f"{name} needs a description of at least 10 characters"
    assert properties["status"].get("enum") == ["pending", "shipped", "delivered", "cancelled"]
    assert {"minimum": 1, "maximum": 20, "default": 5}.items() <= properties["limit"].items()


@test("search_orders returns only the fields the model needs, most recent first, with the match count and a hint when the list is truncated")
async def _():
    result = json.loads(await search({"customerEmail": "Ada@Example.com"}))
    assert result["total"] == 12
    assert result["truncated"] is True
    assert [order["id"] for order in result["orders"]] == ["A-1012", "A-1011", "A-1010", "A-1009", "A-1008"]
    for order in result["orders"]:
        assert sorted(order) == ["id", "placedAt", "status", "total"]
    assert isinstance(result.get("hint"), str)
    assert re.search(r"status|limit", result["hint"])
    assert not re.search(r"tok_|WH-|Picked by", json.dumps(result))

    shipped = json.loads(await search({"customerEmail": "ada@example.com", "status": "shipped"}))
    assert shipped == {
        "orders": [
            {"id": "A-1010", "status": "shipped", "total": 132, "placedAt": "2026-10-02"},
            {"id": "A-1009", "status": "shipped", "total": 89, "placedAt": "2026-09-12"},
        ],
        "total": 2,
        "truncated": False,
    }
    everything = json.loads(await search({"customerEmail": "ada@example.com", "limit": 20}))
    assert len(everything["orders"]) == 12


@test("search_orders reports invalid values, an unknown customer and an empty filter in ways the model can recover from")
async def _():
    too_many = await search({"customerEmail": "ada@example.com", "limit": 50})
    assert too_many.startswith("Error")
    assert re.search(r"^- limit: ", too_many, re.MULTILINE)
    bad_status = await search({"customerEmail": "ada@example.com", "status": "lost"})
    assert re.search(r"^- status: ", bad_status, re.MULTILINE)
    assert "shipped" in bad_status
    not_an_email = await search({"customerEmail": "not-an-email"})
    assert re.search(r"^- customerEmail: ", not_an_email, re.MULTILINE)
    wrong_key = await search({"email": "ada@example.com"})
    assert wrong_key.startswith("Error")

    unknown = await search({"customerEmail": "nobody@example.com"})
    assert unknown.startswith("Error")
    assert "nobody@example.com" in unknown
    assert re.search(r"Hint: .{10,}", unknown)

    empty = json.loads(await search({"customerEmail": "linus@example.com", "status": "pending"}))
    assert empty == {"orders": [], "total": 0, "truncated": False}
