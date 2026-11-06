Build the part of an AI gateway that runs before any model is called: a semantic cache that is scoped, so one tenant never receives another tenant's answer, and a `complete` coroutine that serves cache hits and falls back across providers on retryable errors. There is no network and no model here: `embed` and the providers are plain objects that the tests inject.

```python
request = {
    "tenant": "acme",
    "model": "small",
    "system_prompt": "You are the Acme support assistant.",
    "prompt": "How do I reset my password?",
}

class ProviderError(Exception):                       # already written in the starter
    def __init__(self, status: int, message: str | None = None): ...   # .status holds the HTTP status

class Provider(Protocol):                             # every provider has a name and an async call
    name: str
    async def call(self, request: dict) -> str: ...

def cosine_similarity(a: list[float], b: list[float]) -> float: ...   # already written in the starter
def scope_key(*, tenant: str, model: str, system_prompt: str) -> str: ...

class SemanticCache:
    def __init__(self, *, threshold: float, embed: Callable[[str], list[float]]): ...
    def lookup(self, scope: str, prompt: str) -> str | None: ...
    def store(self, scope: str, prompt: str, answer: str) -> None: ...

class Gateway:
    def __init__(self, *, providers: list[Provider], cache: SemanticCache): ...
    async def complete(self, request: dict) -> dict: ...   # {"answer": str, "provider": str, "cached": bool}
```

**`scope_key(tenant=..., model=..., system_prompt=...)`** returns `json.dumps([tenant, model, system_prompt], separators=(",", ":"))`, for example `'["acme","small","Be brief."]'`. Every field changes the key, and a field that contains a separator such as `|` cannot collide with another combination of fields.

**`SemanticCache(threshold=..., embed=...)`** starts empty.

- `store(scope, prompt, answer)` calls `embed(prompt)` once and keeps the vector together with the scope and the answer.
- `lookup(scope, prompt)` calls `embed(prompt)` at most once and compares that vector, with `cosine_similarity`, against the entries stored under **exactly the same `scope` string**, and only those. It returns the answer of the **most similar** entry when its similarity is at least `threshold` (`>=`), otherwise `None` (no entry in the scope, or the best one is below the threshold). The first entry stored wins a tie. Stored prompts are never embedded again.

**`Gateway(providers=..., cache=...)`** has one coroutine, `await complete(request)`, which:

1. Looks up `request["prompt"]` under the scope key of the request's `tenant`, `model` and `system_prompt`. On a hit it returns `{"answer": ..., "provider": "cache", "cached": True}` without calling any provider.
2. Otherwise awaits `provider.call(request)` for each provider in order. The first answer is stored in the cache under the same scope and prompt, and `complete` returns `{"answer": ..., "provider": <that provider's name>, "cached": False}`.
3. Treats an exception as **retryable** when it is a `ProviderError` whose `status` is `429` or from `500` to `599`, or a `TimeoutError` (what `asyncio.timeout` raises when a call takes too long). After a retryable exception it moves to the next provider. Any other exception (a `ProviderError` with status `400`, a `ValueError`) is re-raised at once, and the remaining providers are not called. When every provider fails with a retryable exception, `complete` raises the **last** one. A failed request stores nothing.

Matching on prompt similarity alone is not enough: an entry stored for one tenant, model or system prompt must never answer another. In production `embed` is a call to an embedding model and each provider is an HTTP client with a timeout and a circuit breaker; here they are plain objects, so the tests control every result.
