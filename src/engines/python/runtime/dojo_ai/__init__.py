"""Provider-agnostic fake model client for Python lessons, backed by the same fake provider as the Node.js engine."""

from js import Object
from pyodide.ffi import JsException, JsProxy, to_js

import _dojo_ai_bridge as _bridge

__all__ = ["Model", "ModelError", "cosine_similarity", "count_tokens", "create_model", "embed"]


def _to_js(value):
    return to_js(value, dict_converter=Object.fromEntries)


def _to_py(value):
    return value.to_py() if isinstance(value, JsProxy) else value


class ModelError(Exception):
    """Error a model provider returns: `status` (HTTP code), `code` and, for rate limits, `retry_after_ms`."""

    def __init__(self, status, code, message, retry_after_ms=None):
        super().__init__(message)
        self.status = status
        self.code = code
        self.retry_after_ms = retry_after_ms

    def __repr__(self):
        return f"ModelError(status={self.status}, code={self.code!r}, message={str(self)!r})"


def _translate(error):
    """Turns a JavaScript ModelError into the Python ModelError and leaves any other error unchanged."""
    js_error = error.js_error
    if js_error.name == "ModelError":
        return ModelError(js_error.status, js_error.code, js_error.message, js_error.retryAfterMs)
    return error


class Model:
    """A chat model: `generate(request)` returns a response dict, `stream(request)` yields chunk dicts."""

    def __init__(self, js_model):
        self._model = js_model

    @property
    def name(self):
        return self._model.name

    @property
    def context_window(self):
        return self._model.contextWindow

    async def generate(self, request):
        try:
            return _to_py(await self._model.generate(_to_js(request)))
        except JsException as error:
            raise _translate(error) from None

    async def stream(self, request):
        try:
            async for chunk in self._model.stream(_to_js(request)):
                yield _to_py(chunk)
        except JsException as error:
            raise _translate(error) from None


def create_model(model=None):
    """Creates a client for the fake model (`dojo-fake-1` unless another name is given)."""
    return Model(_bridge.createModel(_to_js({} if model is None else {"model": model})))


def count_tokens(value):
    """Approximates the tokens of a text or a list of messages (one token per four characters plus 4 per message)."""
    return _bridge.countTokens(_to_js(value))


def embed(value, dimensions=64):
    """Deterministic bag-of-words embedding of a text (a vector) or a list of texts (a list of vectors)."""
    return _to_py(_bridge.embed(_to_js(value), _to_js({"dimensions": dimensions})))


def cosine_similarity(left, right):
    """Cosine similarity of two vectors of the same length."""
    return _bridge.cosineSimilarity(_to_js(left), _to_js(right))
