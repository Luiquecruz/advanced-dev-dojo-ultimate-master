import json

JSON_FORMAT = {"type": "json"}


class GateError(Exception):
    """Raised when a chain step did not finish normally or its gate rejected the output."""

    def __init__(self, step, output):
        super().__init__(f'Step "{step}" did not pass its gate')
        self.step = step
        self.output = output


async def prompt_chain(model, input, steps):
    # TODO: run the steps in order, feeding each output into the next prompt; raise a GateError when a reply did not finish with "stop" or its gate rejects it
    outputs = []
    previous = input
    for step in steps:
        response = await model.generate({"messages": [{"role": "user", "content": step["prompt"](previous)}]})
        outputs.append(response["text"])
        previous = response["text"]
    return {"output": previous, "outputs": outputs}


async def route(model, input, routes, fallback):
    # TODO: classify with a JSON request that lists every route, fall back on any unusable answer, then answer with the chosen route's system prompt
    response = await model.generate({
        "messages": [
            {"role": "system", "content": routes[fallback]["system"]},
            {"role": "user", "content": input},
        ],
    })
    return {"route": fallback, "text": response["text"]}


async def parallel_sections(model, input, sections):
    # TODO: send every section at the same time instead of one after another
    result = {}
    for section in sections:
        response = await model.generate({
            "messages": [
                {"role": "system", "content": section["instruction"]},
                {"role": "user", "content": input},
            ],
        })
        result[section["name"]] = response["text"]
    return result


async def vote(model, prompt, voters):
    # TODO: ask every voter in parallel for JSON {"label"}, normalize labels, count abstentions, and return None on a tie
    response = await model.generate({"messages": [{"role": "user", "content": prompt}], "responseFormat": JSON_FORMAT})
    label = str(json.loads(response["text"])["label"])
    return {"verdict": label, "votes": {label: 1}, "abstentions": 0}


async def evaluator_optimizer(model, task, max_rounds):
    # TODO: alternate draft and JSON evaluation for at most max_rounds rounds, sending the previous draft and the feedback back to the writer
    draft = await model.generate({"messages": [{"role": "user", "content": task}]})
    return {"text": draft["text"], "rounds": 1, "accepted": True, "feedback": []}
