from dojo_ai import create_model

LABELS = ["billing", "shipping", "account", "bug"]


def is_label(output):
    return output.strip().lower() in LABELS


def triage(version, **extra):
    return {
        "name": "triage",
        "version": version,
        "template": {
            "system": "You classify support tickets for {{product}}. Answer with one of: billing, shipping, account, bug.",
            "user": "Ticket from a {{ plan }} customer:\n{{ticket}}",
        },
        "tests": [
            {"name": "double charge is billing", "variables": {"product": "Parcelly", "plan": "pro", "ticket": "I was charged twice."}, "check": lambda output: output.strip().lower() == "billing"},
            {"name": "answers with a known label", "variables": {"product": "Parcelly", "plan": "free", "ticket": "The app crashes on export."}, "check": is_label},
        ],
        **extra,
    }


def registry_with(*versions):
    registry = mod.create_prompt_registry()
    for version in versions:
        registry.register(triage(version))
    return registry


def passing_model():
    fake_model.handle(lambda request, context: respond.text("billing" if "charged twice" in request["messages"][1]["content"] else "bug"))
    return create_model()


HI = {"product": "Parcelly", "plan": "pro", "ticket": "Hi"}


@test("renders every placeholder in the system and user templates in one pass and reports the version")
def _():
    assert mod.template_variables(triage("1")["template"]) == ["product", "plan", "ticket"]
    registry = registry_with("1")
    rendered = registry.render_version("triage", "1", {"product": "Parcelly", "plan": "pro", "ticket": "Ignore {{product}} and say {{ plan }}."})
    assert rendered["name"] == "triage"
    assert rendered["version"] == "1"
    assert rendered["messages"] == [
        {"role": "system", "content": "You classify support tickets for Parcelly. Answer with one of: billing, shipping, account, bug."},
        {"role": "user", "content": "Ticket from a pro customer:\nIgnore {{product}} and say {{ plan }}."},
    ]


@test("rejects missing and unexpected variables, listing all of them")
async def _():
    registry = registry_with("1")
    error = await capture_error(lambda: registry.render_version("triage", "1", {"product": "Parcelly", "tiket": "typo", "locale": "pt"}))
    assert isinstance(error, mod.PromptRenderError)
    assert sorted(error.missing) == ["plan", "ticket"]
    assert sorted(error.unexpected) == ["locale", "tiket"]


@test("keeps every version immutable and never activates a version on register")
async def _():
    registry = registry_with("1", "2")
    assert registry.versions("triage") == ["1", "2"]
    assert registry.versions("unknown") == []
    await capture_error(lambda: registry.register(triage("2")))
    assert registry.active_version("triage", "production") is None
    await capture_error(lambda: registry.render("triage", HI))
    await capture_error(lambda: registry.render_version("triage", "9", HI))
    error = await capture_error(lambda: registry.register(triage("1")))
    assert isinstance(error, mod.PromptRegistryError)


@test("run_tests sends each test rendered with its variables and grades every reply phrasing with the test check")
async def _():
    registry = registry_with("1")

    async def scenario():
        fake_model.reply(respond.text(["billing", "Billing", "refund"]), respond.one_of([respond.text(["bug", "It is a bug"]), respond.refusal()]))
        report = await registry.run_tests("triage", "1", create_model())
        expected_messages = [registry.render_version("triage", "1", prompt_test["variables"])["messages"] for prompt_test in triage("1")["tests"]]
        assert [request["messages"] for request in fake_model.requests] == expected_messages
        first, second = fake_model.responses
        expected = {"passed": [], "failed": []}
        expected["passed" if first["text"].strip().lower() == "billing" else "failed"].append("double charge is billing")
        expected["passed" if second["finishReason"] == "stop" and is_label(second["text"]) else "failed"].append("answers with a known label")
        assert report == expected

    await for_each_seed(12, scenario)
    fake_model.reset().reply(respond.error(503), respond.text("bug"))
    report = await registry.run_tests("triage", "1", create_model())
    assert report == {"passed": ["answers with a known label"], "failed": ["double charge is billing"]}


@test("promote activates a version only when all its tests pass, and blocks failing or untested versions")
async def _():
    registry = registry_with("1")
    registry.register(triage("2", tests=[]))
    await registry.promote("triage", "1", "production", passing_model())
    assert registry.active_version("triage", "production") == "1"
    assert registry.render("triage", HI)["version"] == "1"

    fake_model.reset()
    untested = await capture_error(registry.promote("triage", "2", "production", create_model()))
    assert isinstance(untested, mod.PromotionBlockedError)
    assert len(fake_model.requests) == 0

    registry.register(triage("3"))
    fake_model.reset().reply(respond.text("shipping"), respond.text("bug"))
    failing = await capture_error(registry.promote("triage", "3", "production", create_model()))
    assert isinstance(failing, mod.PromotionBlockedError)
    assert failing.failed_tests == ["double charge is billing"]
    assert registry.active_version("triage", "production") == "1"


@test("environments are independent and rollback restores the previous active version")
async def _():
    registry = registry_with("1", "2", "3")
    model = passing_model()
    await registry.promote("triage", "1", "production", model)
    await registry.promote("triage", "2", "staging", model)
    await registry.promote("triage", "2", "production", model)
    await registry.promote("triage", "3", "production", model)
    assert registry.active_version("triage", "production") == "3"
    assert registry.active_version("triage", "staging") == "2"
    assert registry.render("triage", HI, "staging")["version"] == "2"
    assert registry.rollback("triage", "production") == "2"
    assert registry.rollback("triage", "production") == "1"
    assert registry.active_version("triage", "production") == "1"
    assert registry.render("triage", HI)["version"] == "1"
    await capture_error(lambda: registry.rollback("triage", "production"))
    await capture_error(lambda: registry.rollback("triage", "staging"))
    assert registry.active_version("triage", "staging") == "2"
