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
        self.end_ms = self.tracer.now()
        if status is not None:
            self.status = status


class Tracer:
    """Starts spans and keeps the finished ones in `spans`, in the order they ended."""

    def __init__(self, now, capture_content, new_id):
        self.now = now
        self.capture_content = capture_content
        self.new_id = new_id
        self.spans = []

    def start_span(self, name, *, parent=None, kind="internal", attributes=None):
        # TODO: a root span starts a new 32-hex trace id; a child copies its parent's trace id and points to its span id; record spans when they end, once
        span = Span(
            trace_id=self.new_id(16),
            span_id=self.new_id(8),
            parent_span_id=None,
            name=name,
            kind=kind,
            start_ms=self.now(),
            end_ms=None,
            status="unset",
            attributes=attributes if attributes is not None else {},
            tracer=self,
        )
        self.spans.append(span)
        return span


def create_tracer(*, now=current_time_ms, capture_content=False, new_id=secrets.token_hex):
    return Tracer(now, capture_content, new_id)


def traced_model(model, tracer, *, provider, parent=None):
    # TODO: one client span "chat <model>" per call with the GenAI attributes, usage, error.type on failure, and content only when tracer.capture_content
    return model


def traced_tool(tool, tracer, *, parent=None):
    # TODO: one internal span "execute_tool <name>" per call with the tool attributes, error.type on failure, and arguments and result only when tracer.capture_content
    return tool


def summarize_trace(spans, trace_id, pricing):
    # TODO: roll up the spans of one trace: counts, errors, tokens, cost from the price table, duration, unpriced models
    raise NotImplementedError("summarize_trace")
