import re

VOCABULARY = ["reset", "password", "account", "refund", "order", "cancel"]
ACME = {"tenant": "acme", "model": "small", "system_prompt": "You are the Acme support assistant."}


def embed(text):
    words = re.findall(r"[a-z]+", text.lower())
    return [words.count(term) for term in VOCABULARY]


class FakeProvider:
    def __init__(self, name, answer="", error=None, order=None):
        self.name = name
        self.answer = answer
        self.error = error
        self.requests = []
        self.order = order if order is not None else []

    async def call(self, request):
        self.requests.append(request)
        self.order.append(self.name)
        if self.error is not None:
            raise self.error
        return self.answer


@test("the scope key encodes tenant, model and system prompt as a JSON array, so no two scopes collide")
def _():
    key = mod.scope_key(tenant="acme", model="small", system_prompt="Be brief.")
    assert key == '["acme","small","Be brief."]'
    piped_tenant = mod.scope_key(tenant="a|b", model="c", system_prompt="")
    piped_model = mod.scope_key(tenant="a", model="b|c", system_prompt="")
    assert piped_tenant != piped_model


@test("lookup returns the answer of the most similar entry once it reaches the threshold, embedding each prompt once")
def _():
    embedded = []

    def counting_embed(text):
        embedded.append(text)
        return embed(text)

    cache = mod.SemanticCache(threshold=0.8, embed=counting_embed)
    scope = mod.scope_key(**ACME)
    cache.store(scope, "How do I reset my password?", "password answer")
    cache.store(scope, "How do I reset my account password?", "account password answer")
    assert len(embedded) == 2
    best = cache.lookup(scope, "reset the password on my account")
    assert best == "account password answer"
    closest = cache.lookup(scope, "password reset, please")
    assert closest == "password answer"
    assert len(embedded) == 4
    unrelated = cache.lookup(scope, "Where is my refund?")
    assert unrelated is None
    strict = mod.SemanticCache(threshold=0.9, embed=embed)
    strict.store(scope, "How do I reset my password?", "password answer")
    below_threshold = strict.lookup(scope, "reset my account password")
    assert below_threshold is None
    # the similarity of these two prompts is exactly 0.5, so it reaches a threshold of 0.5
    boundary = mod.SemanticCache(threshold=0.5, embed=embed)
    boundary.store(scope, "Where is my refund?", "refund answer")
    at_threshold = boundary.lookup(scope, "Should I cancel my account or refund my order?")
    assert at_threshold == "refund answer"


# beginner mistake: matching on prompt similarity alone, so a cached answer leaks to another tenant, model or system prompt
@test("lookup only searches the entries stored under exactly the same scope")
def _():
    cache = mod.SemanticCache(threshold=0.8, embed=embed)
    prompt = "How do I reset my password?"
    cache.store(mod.scope_key(**ACME), prompt, "Acme: open Settings, then Security.")
    same_scope = cache.lookup(mod.scope_key(**ACME), prompt)
    assert same_scope == "Acme: open Settings, then Security."
    for other in [{**ACME, "tenant": "globex"}, {**ACME, "model": "large"}, {**ACME, "system_prompt": "Answer in French."}]:
        leaked = cache.lookup(mod.scope_key(**other), prompt)
        assert leaked is None, f"the answer stored for {ACME} was served to {other}"


@test("complete answers a miss from the first provider, stores it and serves similar prompts of the same scope from the cache")
async def _():
    primary = FakeProvider("primary", answer="primary: How do I reset my password?")
    gateway = mod.Gateway(providers=[primary], cache=mod.SemanticCache(threshold=0.8, embed=embed))
    request = {**ACME, "prompt": "How do I reset my password?"}
    first = await gateway.complete(request)
    assert first == {"answer": "primary: How do I reset my password?", "provider": "primary", "cached": False}
    assert primary.requests == [request]
    similar = await gateway.complete({**request, "prompt": "password reset, please"})
    assert similar == {"answer": "primary: How do I reset my password?", "provider": "cache", "cached": True}
    assert len(primary.requests) == 1
    other_tenant = await gateway.complete({**request, "tenant": "globex"})
    assert other_tenant == {"answer": "primary: How do I reset my password?", "provider": "primary", "cached": False}
    assert len(primary.requests) == 2


@test("complete moves to the next provider on 429, 5xx and timeouts, in order")
async def _():
    order = []
    providers = [
        FakeProvider("first", error=mod.ProviderError(429), order=order),
        FakeProvider("second", error=mod.ProviderError(500), order=order),
        FakeProvider("third", error=mod.ProviderError(503), order=order),
        FakeProvider("fourth", error=TimeoutError("provider timed out"), order=order),
        FakeProvider("backup", answer="backup answer", order=order),
    ]
    gateway = mod.Gateway(providers=providers, cache=mod.SemanticCache(threshold=0.8, embed=embed))
    try:
        result = await gateway.complete({**ACME, "prompt": "Where is my order?"})
    except TimeoutError as error:
        raise AssertionError(f"a provider's TimeoutError reached the caller instead of moving to the next provider: {error}") from None
    assert result == {"answer": "backup answer", "provider": "backup", "cached": False}
    assert order == ["first", "second", "third", "fourth", "backup"]


@test("complete hands a non-retryable error straight to the caller, reports the last error when every provider fails, and caches no failure")
async def _():
    cache = mod.SemanticCache(threshold=0.8, embed=embed)
    request = {**ACME, "prompt": "Cancel my order"}
    backup = FakeProvider("backup", answer="backup answer")
    for error in [mod.ProviderError(400), ValueError("invalid tool definition")]:
        gateway = mod.Gateway(providers=[FakeProvider("primary", error=error), backup], cache=cache)
        raised = await capture_error(gateway.complete(request))
        assert raised is error
    assert backup.requests == []
    last = mod.ProviderError(502)
    outage = mod.Gateway(
        providers=[FakeProvider("primary", error=mod.ProviderError(503)), FakeProvider("secondary", error=last)],
        cache=cache,
    )
    raised = await capture_error(outage.complete(request))
    assert raised is last
    recovered = mod.Gateway(providers=[FakeProvider("primary", answer="fresh answer")], cache=cache)
    result = await recovered.complete(request)
    assert result == {"answer": "fresh answer", "provider": "primary", "cached": False}
