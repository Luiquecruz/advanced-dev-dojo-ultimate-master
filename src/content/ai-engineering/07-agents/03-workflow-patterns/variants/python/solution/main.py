import asyncio
import json

UNPARSABLE_EVALUATION = "The evaluation could not be parsed."
JSON_FORMAT = {"type": "json"}


class GateError(Exception):
    """Raised when a chain step did not finish normally or its gate rejected the output."""

    def __init__(self, step, output):
        super().__init__(f'Step "{step}" did not pass its gate')
        self.step = step
        self.output = output


def parse_json(text):
    try:
        return json.loads(text)
    except ValueError:
        return None


def field(value, key):
    return value.get(key) if isinstance(value, dict) else None


async def prompt_chain(model, input, steps):
    outputs = []
    previous = input
    for step in steps:
        response = await model.generate({"messages": [{"role": "user", "content": step["prompt"](previous)}]})
        gate = step.get("gate")
        if response["finishReason"] != "stop" or (gate is not None and not gate(response["text"])):
            raise GateError(step["name"], response["text"])
        outputs.append(response["text"])
        previous = response["text"]
    return {"output": previous, "outputs": outputs}


async def route(model, input, routes, fallback):
    catalog = "\n".join(f"- {name}: {definition['description']}" for name, definition in routes.items())
    classification = await model.generate({
        "messages": [
            {"role": "system", "content": f'Choose the route for the user\'s message. Reply with JSON {{"route": "<name>"}} using one of these names:\n{catalog}'},
            {"role": "user", "content": input},
        ],
        "responseFormat": JSON_FORMAT,
    })
    chosen = field(parse_json(classification["text"]), "route")
    name = chosen if isinstance(chosen, str) and chosen in routes else fallback
    response = await model.generate({
        "messages": [
            {"role": "system", "content": routes[name]["system"]},
            {"role": "user", "content": input},
        ],
    })
    return {"route": name, "text": response["text"]}


async def parallel_sections(model, input, sections):
    responses = await asyncio.gather(*(
        model.generate({
            "messages": [
                {"role": "system", "content": section["instruction"]},
                {"role": "user", "content": input},
            ],
        })
        for section in sections
    ))
    return {section["name"]: response["text"] for section, response in zip(sections, responses)}


def label_of(response):
    label = field(parse_json(response["text"]), "label")
    return label.strip().lower() if isinstance(label, str) and label.strip() != "" else None


async def vote(model, prompt, voters):
    ballots = await asyncio.gather(
        *(model.generate({"messages": [{"role": "user", "content": prompt}], "responseFormat": JSON_FORMAT}) for _ in range(voters)),
        return_exceptions=True,
    )
    votes = {}
    abstentions = 0
    for ballot in ballots:
        label = None if isinstance(ballot, BaseException) else label_of(ballot)
        if label is None:
            abstentions += 1
        else:
            votes[label] = votes.get(label, 0) + 1
    ranking = sorted(votes.items(), key=lambda entry: entry[1], reverse=True)
    is_clear_winner = len(ranking) > 0 and (len(ranking) == 1 or ranking[0][1] > ranking[1][1])
    return {"verdict": ranking[0][0] if is_clear_winner else None, "votes": votes, "abstentions": abstentions}


def evaluation_of(response):
    evaluation = parse_json(response["text"])
    passed = field(evaluation, "pass")
    feedback = field(evaluation, "feedback")
    if not isinstance(passed, bool):
        return {"pass": False, "feedback": UNPARSABLE_EVALUATION}
    return {"pass": passed, "feedback": feedback if isinstance(feedback, str) else ""}


async def evaluator_optimizer(model, task, max_rounds):
    feedback = []
    draft = ""
    for round_number in range(1, max_rounds + 1):
        if round_number == 1:
            messages = [{"role": "user", "content": task}]
        else:
            messages = [
                {"role": "user", "content": task},
                {"role": "assistant", "content": draft},
                {"role": "user", "content": f"Revise the draft. Feedback: {feedback[-1]}"},
            ]
        draft = (await model.generate({"messages": messages}))["text"]
        evaluation = evaluation_of(await model.generate({
            "messages": [
                {"role": "system", "content": 'Evaluate the draft against the task. Reply with JSON {"pass": boolean, "feedback": string}.'},
                {"role": "user", "content": f"Task: {task}\n\nDraft:\n{draft}"},
            ],
            "responseFormat": JSON_FORMAT,
        }))
        if evaluation["pass"]:
            return {"text": draft, "rounds": round_number, "accepted": True, "feedback": feedback}
        feedback.append(evaluation["feedback"])
    return {"text": draft, "rounds": max_rounds, "accepted": False, "feedback": feedback}
