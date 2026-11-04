EMPTY_USAGE = {"inputTokens": 0, "outputTokens": 0, "totalTokens": 0, "cost": 0}


def build_request(input):
    messages = [] if input.get("system") is None else [{"role": "system", "content": input["system"]}]
    messages.append({"role": "user", "content": input["prompt"]})
    request = {"messages": messages}
    if input.get("maxTokens") is not None:
        request["maxTokens"] = input["maxTokens"]
    return request


def status_for(finish_reason):
    if finish_reason == "length":
        return "truncated"
    if finish_reason in ("refusal", "content_filter"):
        return "refused"
    return "complete"


async def complete(model, input):
    response = await model.generate(build_request(input))
    return {
        "status": status_for(response["finishReason"]),
        "text": response["text"],
        "finishReason": response["finishReason"],
        "usage": response["usage"],
    }


async def complete_stream(model, input, on_delta=None):
    text = ""
    finish_reason = "stop"
    usage = EMPTY_USAGE
    async for chunk in model.stream(build_request(input)):
        if chunk["type"] == "text":
            text += chunk["delta"]
            if on_delta is not None:
                on_delta(chunk["delta"])
        if chunk["type"] == "finish":
            finish_reason = chunk["finishReason"]
            usage = chunk["usage"]
    return {"status": status_for(finish_reason), "text": text, "finishReason": finish_reason, "usage": usage}
