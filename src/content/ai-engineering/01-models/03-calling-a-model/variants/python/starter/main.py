EMPTY_USAGE = {"inputTokens": 0, "outputTokens": 0, "totalTokens": 0, "cost": 0}


def build_request(input):
    # TODO: optional system message first, then the user message; include "maxTokens" only when given
    return {"messages": [{"role": "user", "content": input["prompt"]}]}


def status_for(finish_reason):
    # TODO: "length" is truncated, "refusal" and "content_filter" are refused, everything else is complete
    return "complete"


async def complete(model, input):
    # TODO: await model.generate(...) once and return {"status", "text", "finishReason", "usage"} from the response
    return {"status": "complete", "text": "", "finishReason": "stop", "usage": EMPTY_USAGE}


async def complete_stream(model, input, on_delta=None):
    # TODO: iterate model.stream(...) with async for, forward and concatenate text deltas, read finishReason and usage from the finish chunk
    return {"status": "complete", "text": "", "finishReason": "stop", "usage": EMPTY_USAGE}
