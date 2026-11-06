import asyncio
import json
import math
import re
from typing import Callable, Protocol


class ProviderError(Exception):
    def __init__(self, status: int, message: str | None = None):
        super().__init__(message or f"provider answered {status}")
        self.status = status


class Provider(Protocol):
    name: str

    async def call(self, request: dict) -> str: ...


def _dot(a: list[float], b: list[float]) -> float:
    return sum(x * y for x, y in zip(a, b))


def cosine_similarity(a: list[float], b: list[float]) -> float:
    lengths = math.sqrt(_dot(a, a)) * math.sqrt(_dot(b, b))
    return 0.0 if lengths == 0 else _dot(a, b) / lengths


def scope_key(*, tenant: str, model: str, system_prompt: str) -> str:
    return json.dumps([tenant, model, system_prompt], separators=(",", ":"))


class SemanticCache:
    def __init__(self, *, threshold: float, embed: Callable[[str], list[float]]):
        self._threshold = threshold
        self._embed = embed
        self._entries: list[dict] = []

    def lookup(self, scope: str, prompt: str) -> str | None:
        candidates = [entry for entry in self._entries if entry["scope"] == scope]
        if not candidates:
            return None
        vector = self._embed(prompt)
        best = None
        best_similarity = -math.inf
        for entry in candidates:
            similarity = cosine_similarity(vector, entry["vector"])
            if similarity > best_similarity:
                best, best_similarity = entry, similarity
        if best is None or best_similarity < self._threshold:
            return None
        return best["answer"]

    def store(self, scope: str, prompt: str, answer: str) -> None:
        self._entries.append({"scope": scope, "vector": self._embed(prompt), "answer": answer})


def _is_retryable(error: Exception) -> bool:
    if isinstance(error, TimeoutError):
        return True
    return isinstance(error, ProviderError) and (error.status == 429 or 500 <= error.status <= 599)


class Gateway:
    def __init__(self, *, providers: list[Provider], cache: SemanticCache):
        self._providers = providers
        self._cache = cache

    async def complete(self, request: dict) -> dict:
        scope = scope_key(tenant=request["tenant"], model=request["model"], system_prompt=request["system_prompt"])
        hit = self._cache.lookup(scope, request["prompt"])
        if hit is not None:
            return {"answer": hit, "provider": "cache", "cached": True}
        last_error: Exception = RuntimeError("no provider configured")
        for provider in self._providers:
            try:
                answer = await provider.call(request)
            except Exception as error:
                if not _is_retryable(error):
                    raise
                last_error = error
                continue
            self._cache.store(scope, request["prompt"], answer)
            return {"answer": answer, "provider": provider.name, "cached": False}
        raise last_error


DEMO_VOCABULARY = ["reset", "password", "refund", "order"]


def demo_embed(text: str) -> list[float]:
    words = re.findall(r"[a-z]+", text.lower())
    return [words.count(term) for term in DEMO_VOCABULARY]


class DemoProvider:
    def __init__(self, name: str, error: Exception | None = None):
        self.name = name
        self._error = error

    async def call(self, request: dict) -> str:
        if self._error is not None:
            raise self._error
        return f"{self.name} answers: {request['prompt']}"


async def main():
    gateway = Gateway(
        providers=[DemoProvider("primary", error=ProviderError(503, "overloaded")), DemoProvider("secondary")],
        cache=SemanticCache(threshold=0.8, embed=demo_embed),
    )
    request = {
        "tenant": "acme",
        "model": "small",
        "system_prompt": "You are the Acme support assistant.",
        "prompt": "How do I reset my password?",
    }
    try:
        print(await gateway.complete(request))
        print(await gateway.complete({**request, "prompt": "password reset, please"}))
        print(await gateway.complete({**request, "tenant": "globex"}))
    except Exception as error:
        print("request failed:", error)


if __name__ == "__main__":
    asyncio.run(main())
