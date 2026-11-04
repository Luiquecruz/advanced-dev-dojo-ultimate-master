import json

from dojo_ai import create_model


class Spy:
    """Records every call and delegates to the implementation."""

    def __init__(self, implementation):
        self.implementation = implementation
        self.calls = []

    def __call__(self, *arguments):
        self.calls.append(list(arguments))
        return self.implementation(*arguments)


def weather_tools():
    get_weather = Spy(lambda arguments: {"city": arguments["city"], "temperatureC": 20 if arguments["city"] == "Lisbon" else 9})
    convert = Spy(lambda arguments: f"{arguments['celsius'] * 1.8 + 32:g} F")
    tools = [
        {
            "name": "get_weather",
            "description": "Current weather for a city",
            "parameters": {"type": "object", "properties": {"city": {"type": "string"}}, "required": ["city"]},
            "execute": get_weather,
        },
        {
            "name": "convert",
            "description": "Convert Celsius to Fahrenheit",
            "parameters": {"type": "object", "properties": {"celsius": {"type": "number"}}, "required": ["celsius"]},
            "execute": convert,
        },
    ]
    return tools, get_weather, convert


def tool_messages(request):
    return [message for message in request["messages"] if message["role"] == "tool"]


@test("returns the final answer when the model replies without tool calls, offering every tool and sending the system prompt and task")
async def _():
    tools, _get_weather, _convert = weather_tools()
    fake_model.reply(respond.text("It is sunny."))
    result = await mod.run_agent(create_model(), system="You are a weather assistant.", task="Weather in Lisbon?", tools=tools, max_steps=5)
    assert result["status"] == "done"
    assert result["answer"] == "It is sunny."
    assert result["steps"] == 1
    assert len(fake_model.requests) == 1
    request = fake_model.requests[0]
    assert request["messages"] == [
        {"role": "system", "content": "You are a weather assistant."},
        {"role": "user", "content": "Weather in Lisbon?"},
    ]
    assert [tool["name"] for tool in request["tools"]] == ["get_weather", "convert"]
    assert request["tools"][0]["parameters"] == tools[0]["parameters"]


@test("executes a tool call with the parsed arguments and sends the assistant turn and the tool result back before the next call")
async def _():
    tools, get_weather, _convert = weather_tools()
    fake_model.reply(respond.tool_call("get_weather", {"city": "Lisbon"}), respond.text("20 degrees in Lisbon."))
    result = await mod.run_agent(create_model(), task="Weather in Lisbon?", tools=tools, max_steps=5)
    assert get_weather.calls == [[{"city": "Lisbon"}]]
    assert result["status"] == "done"
    assert result["answer"] == "20 degrees in Lisbon."
    assert result["steps"] == 2
    second = fake_model.requests[1]
    call_id = fake_model.responses[0]["toolCalls"][0]["id"]
    assert second["messages"][0] == {"role": "user", "content": "Weather in Lisbon?"}
    assert second["messages"][1]["role"] == "assistant"
    assert second["messages"][1]["toolCalls"] == fake_model.responses[0]["toolCalls"]
    assert tool_messages(second) == [{"role": "tool", "toolCallId": call_id, "content": json.dumps({"city": "Lisbon", "temperatureC": 20})}]
    assert [message["role"] for message in result["messages"]] == ["user", "assistant", "tool", "assistant"]


@test("runs every tool call of one response in order, one tool message per call id, and passes string results through unchanged")
async def _():
    tools, get_weather, convert = weather_tools()
    fake_model.reply(
        respond.tool_calls([
            {"name": "get_weather", "arguments": {"city": "Oslo"}},
            {"name": "convert", "arguments": {"celsius": 10}},
        ]),
        respond.text("Oslo is cold."),
    )
    await mod.run_agent(create_model(), task="Weather in Oslo, in Fahrenheit?", tools=tools, max_steps=5)
    assert len(get_weather.calls) == 1
    assert [{"celsius": 10}] in convert.calls
    ids = [call["id"] for call in fake_model.responses[0]["toolCalls"]]
    results = tool_messages(fake_model.requests[1])
    assert [message["toolCallId"] for message in results] == ids
    assert results[1]["content"] == "50 F"


@test("survives invalid arguments and unknown tools: no tool runs, the model gets an error result for that call id, and the loop continues")
async def _():
    async def scenario():
        tools, get_weather, convert = weather_tools()
        fake_model.reply(
            respond.one_of([respond.invalid_tool_arguments("get_weather"), respond.unknown_tool(), respond.unknown_tool("send_email")]),
            respond.text("Sorry, let me answer directly."),
        )
        result = await mod.run_agent(create_model(), task="Weather?", tools=tools, max_steps=5)
        assert get_weather.calls == []
        assert convert.calls == []
        failure = tool_messages(fake_model.requests[1])[0]
        assert failure["toolCallId"] == fake_model.responses[0]["toolCalls"][0]["id"]
        assert failure["content"].startswith("Error:")
        assert result["status"] == "done"

    await for_each_seed(12, scenario)


@test("turns a tool that raises into an error result containing its message, without crashing the loop")
async def _():
    def unavailable(arguments):
        raise RuntimeError("weather service unavailable")

    flaky = Spy(unavailable)
    tools = [{"name": "get_weather", "description": "Weather", "parameters": {"type": "object"}, "execute": flaky}]
    fake_model.reply(respond.tool_call("get_weather", {"city": "Rome"}), respond.text("I could not fetch the weather."))
    result = await mod.run_agent(create_model(), task="Weather in Rome?", tools=tools, max_steps=3)
    failure = tool_messages(fake_model.requests[1])[0]
    assert failure["content"].startswith("Error:")
    assert "weather service unavailable" in failure["content"]
    assert result["status"] == "done"


@test("stops with max_steps after exactly max_steps model calls when the model never gives a final answer")
async def _():
    tools, get_weather, _convert = weather_tools()
    fake_model.handle(lambda request, context: respond.tool_call("get_weather", {"city": "Lisbon"}))
    result = await mod.run_agent(create_model(), task="Weather?", tools=tools, max_steps=4)
    assert result["status"] == "max_steps"
    assert result["answer"] is None
    assert result["steps"] == 4
    assert len(fake_model.requests) == 4
    assert len(get_weather.calls) == 4


@test("stops with refused on a refusal or content filter, and reaches the answer across seeds when the model reacts to tool results")
async def _():
    async def refused_scenario():
        fake_model.reply(respond.one_of([respond.refusal(), respond.content_filter()]), respond.text("should not be requested"))
        tools, _get_weather, _convert = weather_tools()
        result = await mod.run_agent(create_model(), task="Something risky", tools=tools, max_steps=5)
        assert result["status"] == "refused"
        assert result["answer"] is None
        assert len(fake_model.requests) == 1

    await for_each_seed(6, refused_scenario)

    def react_to_results(request, context):
        results = tool_messages(request)
        if len(results) == 0:
            return respond.tool_call("get_weather", {"city": "Lisbon"})
        if len(results) == 1:
            return respond.tool_call("convert", {"celsius": json.loads(results[0]["content"])["temperatureC"]})
        return respond.text([f"It is {results[1]['content']} in Lisbon.", f"Lisbon: {results[1]['content']}."])

    async def answered_scenario():
        tools, _get_weather, _convert = weather_tools()
        fake_model.handle(react_to_results)
        result = await mod.run_agent(create_model(), task="Weather in Lisbon in Fahrenheit?", tools=tools, max_steps=6)
        assert result["status"] == "done"
        assert result["steps"] == 3
        assert "68 F" in result["answer"]

    await for_each_seed(12, answered_scenario)
