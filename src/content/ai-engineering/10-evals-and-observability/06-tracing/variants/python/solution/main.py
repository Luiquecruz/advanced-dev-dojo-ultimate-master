import inspect
import json
import secrets
import time
from dataclasses import dataclass, field


def current_time_ms():
    return time.time_ns() // 1_000_000


def compact_json(value):
    return json.dumps(value, separators=(",", ":"))


@dataclass
class Span:
    """One timed operation of a trace; recorded in its tracer when it ends."""

    trace_id: str
    span_id: str
    parent_span_id: str | None
    name: str
    kind: str
    start_ms: int
    end_ms: int | None
    status: str
    attributes: dict
    tracer: "Tracer" = field(repr=False, compare=False)

    def set_attribute(self, key, value):
        self.attributes[key] = value

    def end(self, status=None):
        if self.end_ms is not None:
            return
        self.end_ms = self.tracer.now()
        if status is not None:
            self.status = status
        self.tracer.spans.append(self)


class Tracer:
    """Starts spans and keeps the finished ones in `spans`, in the order they ended."""

    def __init__(self, now, capture_content, new_id):
        self.now = now
        self.capture_content = capture_content
        self.new_id = new_id
        self.spans = []

    def start_span(self, name, *, parent=None, kind="internal", attributes=None):
        return Span(
            trace_id=self.new_id(16) if parent is None else parent.trace_id,
            span_id=self.new_id(8),
            parent_span_id=None if parent is None else parent.span_id,
            name=name,
            kind=kind,
            start_ms=self.now(),
            end_ms=None,
            status="unset",
            attributes=dict(attributes or {}),
            tracer=self,
        )


def create_tracer(*, now=current_time_ms, capture_content=False, new_id=secrets.token_hex):
    return Tracer(now, capture_content, new_id)


def error_type(error):
    code = getattr(error, "code", None)
    return code if isinstance(code, str) else type(error).__name__


class TracedModel:
    """A model client that records one client span per `generate` call."""

    def __init__(self, model, tracer, provider, parent):
        self.model = model
        self.tracer = tracer
        self.provider = provider
        self.parent = parent
        self.name = model.name

    async def generate(self, request):
        request_model = request["model"] if request.get("model") is not None else self.model.name
        span = self.tracer.start_span(
            f"chat {request_model}",
            parent=self.parent,
            kind="client",
            attributes={"gen_ai.operation.name": "chat", "gen_ai.provider.name": self.provider, "gen_ai.request.model": request_model},
        )
        if request.get("maxTokens") is not None:
            span.set_attribute("gen_ai.request.max_tokens", request["maxTokens"])
        if request.get("temperature") is not None:
            span.set_attribute("gen_ai.request.temperature", request["temperature"])
        if self.tracer.capture_content:
            span.set_attribute("gen_ai.input.messages", compact_json(request["messages"]))
        try:
            response = await self.model.generate(request)
        except Exception as error:
            span.set_attribute("error.type", error_type(error))
            span.end("error")
            raise
        span.set_attribute("gen_ai.response.id", response["id"])
        span.set_attribute("gen_ai.response.model", response["model"])
        span.set_attribute("gen_ai.response.finish_reasons", [response["finishReason"]])
        span.set_attribute("gen_ai.usage.input_tokens", response["usage"]["inputTokens"])
        span.set_attribute("gen_ai.usage.output_tokens", response["usage"]["outputTokens"])
        if self.tracer.capture_content:
            span.set_attribute("gen_ai.output.messages", compact_json([{"role": "assistant", "content": response["text"], "toolCalls": response["toolCalls"]}]))
        span.end("ok")
        return response


def traced_model(model, tracer, *, provider, parent=None):
    return TracedModel(model, tracer, provider, parent)


def traced_tool(tool, tracer, *, parent=None):
    async def execute(arguments, call_id=None):
        span = tracer.start_span(
            f"execute_tool {tool['name']}",
            parent=parent,
            kind="internal",
            attributes={"gen_ai.operation.name": "execute_tool", "gen_ai.tool.name": tool["name"], "gen_ai.tool.description": tool["description"]},
        )
        if call_id is not None:
            span.set_attribute("gen_ai.tool.call.id", call_id)
        if tracer.capture_content:
            span.set_attribute("gen_ai.tool.call.arguments", compact_json(arguments))
        try:
            result = tool["execute"](arguments, call_id)
            if inspect.isawaitable(result):
                result = await result
        except Exception as error:
            span.set_attribute("error.type", error_type(error))
            span.end("error")
            raise
        if tracer.capture_content:
            span.set_attribute("gen_ai.tool.call.result", result if isinstance(result, str) else compact_json(result))
        span.end("ok")
        return result

    return {**tool, "execute": execute}


def number_attribute(span, key):
    value = span.attributes.get(key)
    return value if isinstance(value, (int, float)) and not isinstance(value, bool) else 0


def summarize_trace(spans, trace_id, pricing):
    trace_spans = [span for span in spans if span.trace_id == trace_id]
    model_spans = [span for span in trace_spans if span.attributes.get("gen_ai.operation.name") == "chat"]
    unpriced_models = []
    cost_usd = 0
    for span in model_spans:
        model = str(span.attributes.get("gen_ai.response.model", span.attributes.get("gen_ai.request.model")))
        price = pricing.get(model)
        if price is None:
            if model not in unpriced_models:
                unpriced_models.append(model)
            continue
        input_cost = number_attribute(span, "gen_ai.usage.input_tokens") * price["inputPerMillion"]
        output_cost = number_attribute(span, "gen_ai.usage.output_tokens") * price["outputPerMillion"]
        cost_usd += (input_cost + output_cost) / 1_000_000
    starts = [span.start_ms for span in trace_spans]
    ends = [span.start_ms if span.end_ms is None else span.end_ms for span in trace_spans]
    return {
        "traceId": trace_id,
        "spans": len(trace_spans),
        "modelCalls": len(model_spans),
        "toolCalls": sum(1 for span in trace_spans if span.attributes.get("gen_ai.operation.name") == "execute_tool"),
        "errors": sum(1 for span in trace_spans if span.status == "error"),
        "inputTokens": sum(number_attribute(span, "gen_ai.usage.input_tokens") for span in model_spans),
        "outputTokens": sum(number_attribute(span, "gen_ai.usage.output_tokens") for span in model_spans),
        "costUsd": cost_usd,
        "durationMs": 0 if not trace_spans else max(ends) - min(starts),
        "unpricedModels": unpriced_models,
    }
