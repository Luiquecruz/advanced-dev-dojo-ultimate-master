Build the four workflow patterns as small functions. Each receives a `model` with `await model.generate(request)` (the tests pass `create_model()` from `dojo_ai`) and makes every decision in code: the model fills in steps, your code decides what runs next.

A request is a dict `{"messages": [...], "responseFormat": ...}` (`"responseFormat"` optional); a message is `{"role": ..., "content": ...}`. "A JSON request" means `"responseFormat": {"type": "json"}`. Keys keep the provider's JSON names (camelCase); functions use Python names. Parse every JSON reply defensively: malformed text, a missing key or a wrong type is an unusable answer, never an exception.

## 1. `prompt_chain(model, input, steps)`

`steps` is a list of dicts `{"name": ..., "prompt": callable, "gate": callable}` (`"gate"` optional). Run them in order. Each step makes one call whose only message is `{"role": "user", "content": step["prompt"](previous)}`, where `previous` is `input` for the first step and the previous step's reply text afterwards.

A step fails when its reply's `"finishReason"` is not `"stop"` (truncated, refused, filtered) or when `step["gate"](text)` returns `False`. Then raise a `GateError` (already written) with `step` (the step name) and `output` (the reply text), and call no later step. On success return `{"output": ..., "outputs": [...]}`: the last reply text and every reply text in order.

## 2. `route(model, input, routes, fallback)`

`routes` maps a route name to `{"description": ..., "system": ...}`.

1. Classify with one JSON request whose messages mention every route name (and its description) and contain `input`; the expected reply is `{"route": "<name>"}`.
2. If the reply does not parse, has no string `"route"`, or names a route that is not in `routes`, use `fallback`.
3. Answer with a second call whose messages are `[{"role": "system", "content": routes[name]["system"]}, {"role": "user", "content": input}]`.

Return `{"route": ..., "text": ...}`: the route used and the second reply's text.

## 3. `parallel_sections(model, input, sections)`

Sectioning. `sections` is a list of `{"name": ..., "instruction": ...}`. Send **all** calls at once with `asyncio.gather` (do not await one before starting the next), each with messages `[{"role": "system", "content": instruction}, {"role": "user", "content": input}]`. Return a dict mapping each section name to its reply text.

## 4. `vote(model, prompt, voters)`

Voting. Send `voters` identical JSON requests at once, each with the single message `{"role": "user", "content": prompt}`. A usable ballot is a reply whose JSON has a non-empty string `"label"`; normalize it with `strip()` and `lower()`. Anything else is an **abstention**: unparsable text, a missing or non-string label, a refusal, or a call that raised an error such as `ModelError` (one failed voter must not fail the vote).

Return `{"verdict": ..., "votes": {...}, "abstentions": ...}`: `"votes"` maps each normalized label to its count, and `"verdict"` is the label with strictly the most votes, or `None` when the top labels tie or there are no usable ballots.

## 5. `evaluator_optimizer(model, task, max_rounds)`

Each round makes two calls:

- **Writer** (a plain request, no `"responseFormat"`). Round 1 sends `[{"role": "user", "content": task}]`. Later rounds send the task, the previous draft and the latest feedback, for example `[user: task, assistant: previous draft, user: "Revise the draft. Feedback: ..."]`.
- **Evaluator** (a JSON request) whose last user message contains the draft; the expected reply is `{"pass": true/false, "feedback": "..."}`. A reply without a boolean `"pass"` counts as a rejection.

When the evaluator passes, return `{"text": draft, "rounds": ..., "accepted": True, "feedback": [...]}`. After `max_rounds` rejected rounds, return the last draft with `"accepted": False` and `"rounds": max_rounds`. `"feedback"` lists the feedback of every rejected round in order (any string for an unparsable evaluation).

The tests script replies with `fake_model.handle`, telling writer and evaluator calls apart by `"responseFormat"`, and check the calls you make and what you return, never the wording.
