"""Scripts the fake model from tests and demos: `fake_model`, `respond` and `for_each_seed`."""

import inspect

from pyodide.ffi import JsProxy, create_proxy, jsnull

from dojo_ai import _to_js, _to_py
import _dojo_ai_bridge as _bridge

__all__ = ["fake_model", "for_each_seed", "respond"]

_js_fake_model = _bridge.testing.fakeModel
_js_respond = _bridge.testing.respond


class BehaviorContext:
    """What a dynamic behavior sees: the `request` dict, the `call_index`, a seeded `random()` and `pick(items)`."""

    def __init__(self, js_context):
        self._context = js_context
        self.request = _without_missing(_to_py(js_context.request))
        self.call_index = js_context.callIndex

    def random(self):
        return self._context.random()

    def pick(self, items):
        return items[int(self.random() * len(items))]


def _json_value(value):
    """Converts JSON-like data for the model, keeping nested `None` as JSON `null` instead of dropping the key."""
    if isinstance(value, dict):
        return {key: jsnull if item is None else _json_value(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [jsnull if item is None else _json_value(item) for item in value]
    return value


def _without_missing(record):
    return {key: value for key, value in record.items() if value is not None}


def _behavior(behavior):
    if isinstance(behavior, JsProxy):
        return behavior
    if callable(behavior):
        return create_proxy(lambda js_context: _to_js(behavior(BehaviorContext(js_context))))
    return _to_js(behavior)


def _optional_behavior(behavior):
    return None if behavior is None else _behavior(behavior)


class _ModelQueue:
    def __init__(self, name):
        self._name = name

    def reply(self, *behaviors):
        _js_fake_model.forModel(self._name).reply(*[_behavior(behavior) for behavior in behaviors])
        return fake_model


class FakeModel:
    """The scripted fake model. Every method returns the model so calls can be chained."""

    def reply(self, *behaviors):
        """Queues replies, consumed in order."""
        _js_fake_model.reply(*[_behavior(behavior) for behavior in behaviors])
        return self

    def for_model(self, name):
        """Queues replies for one model name; checked before the shared queue."""
        return _ModelQueue(name)

    def handle(self, handler):
        """Answers dynamically when the queue is empty: `handler(request, context)` returns a behavior or None."""
        _js_fake_model.handle(create_proxy(lambda js_request, js_context: _optional_behavior(handler(_without_missing(_to_py(js_request)), BehaviorContext(js_context)))))
        return self

    def seed(self, value):
        _js_fake_model.seed(value)
        return self

    def configure(self, *, model=None, context_window=None, latency_ms=None, pricing=None, tokenizer_drift=None):
        """Changes the model name, context window, default latency, prices (`inputPerMillion`, `outputPerMillion`) or tokenizer drift."""
        config = {"model": model, "contextWindow": context_window, "latencyMs": latency_ms, "pricing": pricing, "tokenizerDrift": tokenizer_drift}
        _js_fake_model.configure(_to_js({key: value for key, value in config.items() if value is not None}))
        return self

    def replay(self, cassette):
        """Queues replies recorded from a real model: `{"model", "recordedAt", "replies"}`."""
        _js_fake_model.replay(_to_js(cassette))
        return self

    @property
    def requests(self):
        """Every request received, as dicts."""
        return [_without_missing(request) for request in _to_py(_js_fake_model.requests)]

    @property
    def responses(self):
        """Every successful response returned, in order."""
        return _to_py(_js_fake_model.responses)

    @property
    def pending(self):
        """Replies still queued."""
        return _js_fake_model.pending

    def reset(self):
        _js_fake_model.reset()
        return self


fake_model = FakeModel()


class _Respond:
    """Builders for scripted behaviors."""

    def text(self, text):
        return _js_respond.text(_to_js(text))

    def json(self, value):
        return _js_respond.json(_to_js(_json_value(value)))

    def malformed_json(self, value=None):
        return _js_respond.malformedJson(_to_js(_json_value(value)))

    def tool_call(self, name, arguments=None):
        return _js_respond.toolCall(name, _to_js(_json_value(arguments)))

    def tool_calls(self, calls):
        return _js_respond.toolCalls(_to_js(_json_value(calls)))

    def invalid_tool_arguments(self, name):
        return _js_respond.invalidToolArguments(name)

    def unknown_tool(self, name=None):
        return _js_respond.unknownTool(name)

    def refusal(self, text=None):
        return _js_respond.refusal(text)

    def content_filter(self, text=None):
        return _js_respond.contentFilter(text)

    def truncated(self, text, keep_ratio=None):
        return _js_respond.truncated(text, keep_ratio)

    def error(self, status, retry_after_ms=None, message=None):
        options = {"retryAfterMs": retry_after_ms, "message": message}
        return _js_respond.error(status, _to_js({key: value for key, value in options.items() if value is not None}))

    def context_length(self):
        return _js_respond.contextLength()

    def fail_mid_stream(self, text, status=None, after_chunks=None):
        options = {"status": status, "afterChunks": after_chunks}
        return _js_respond.failMidStream(text, _to_js({key: value for key, value in options.items() if value is not None}))

    def slow(self, delay_ms, behavior):
        return _js_respond.slow(delay_ms, _behavior(behavior))

    def one_of(self, behaviors):
        return _js_respond.oneOf(_to_js([_behavior(behavior) for behavior in behaviors]))

    def sometimes(self, probability, behavior, otherwise):
        return _js_respond.sometimes(probability, _behavior(behavior), _behavior(otherwise))


respond = _Respond()


async def for_each_seed(count, run):
    """Resets and seeds the model, then runs `run(seed)` (or `run()`) once per seed from 1 to `count`, naming the failing seed."""
    takes_seed = len(inspect.signature(run).parameters) > 0
    for seed in range(1, count + 1):
        fake_model.reset().seed(seed)
        try:
            outcome = run(seed) if takes_seed else run()
            if inspect.isawaitable(outcome):
                await outcome
        except BaseException as error:
            error.add_note(f"Failed with seed {seed}")
            raise
