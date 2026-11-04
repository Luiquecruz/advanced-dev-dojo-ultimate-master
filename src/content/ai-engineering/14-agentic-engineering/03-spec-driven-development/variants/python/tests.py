from dojo_ai import create_model

SPEC = """# Spec: Password reset

Users who forget their password reset it by email. REQ-9 was removed in review.

## Requirements
- REQ-1: A user can request a reset link with their email address.
- REQ-2: A reset link expires 30 minutes after it is issued.
  * REQ-3:   A used link cannot be used again.
- REQ-4: The response never reveals whether an email address has an account.

## Out of scope
- Resetting by SMS."""

TASKS = """## Tasks
- [x] TASK-1: Add the reset request endpoint (REQ-1, REQ-4, REQ-1)
- [ ] TASK-2: Store reset tokens with an expiry (REQ-2)
* [X] TASK-3: Add a dark mode toggle
- [ ] TASK-4: Migrate the legacy tokens table (REQ-7)
- Talk to the design team about TASK-5 later"""

TESTS = [
    "TASK-1 sends a reset email to a known address",
    "REQ-4: answers the same way for unknown addresses",
    "TASK-2 rejects a token after 30 minutes",
    "renders the reset form",
    "TASK-9 cleans up expired tokens",
    "REQ-12 rate limits reset requests",
]

PLAN = {
    "tasks": [
        {"id": "TASK-1", "text": "Add the reset request endpoint", "requirements": ["REQ-1", "REQ-4"]},
        {"id": "TASK-2", "text": "Store reset tokens with an expiry", "requirements": ["REQ-2"]},
        {"id": "TASK-3", "text": "Mark tokens as used", "requirements": ["REQ-3"]},
    ],
}


@test("parse_requirements reads REQ list items in order, ignores prose and other items, and rejects duplicate ids")
async def _():
    assert mod.parse_requirements(SPEC) == [
        {"id": "REQ-1", "text": "A user can request a reset link with their email address."},
        {"id": "REQ-2", "text": "A reset link expires 30 minutes after it is issued."},
        {"id": "REQ-3", "text": "A used link cannot be used again."},
        {"id": "REQ-4", "text": "The response never reveals whether an email address has an account."},
    ]
    assert mod.parse_requirements("# Empty\n\nNothing here yet.") == []
    error = await capture_error(lambda: mod.parse_requirements("- REQ-1: Login\n- REQ-2: Logout\n- REQ-1: Login again"))
    assert isinstance(error, mod.SpecError)
    assert "REQ-1" in str(error)


@test("parse_tasks reads checkboxes, task ids and unique requirement references, and rejects duplicate ids")
async def _():
    assert mod.parse_tasks(TASKS) == [
        {"id": "TASK-1", "text": "Add the reset request endpoint (REQ-1, REQ-4, REQ-1)", "done": True, "requirements": ["REQ-1", "REQ-4"]},
        {"id": "TASK-2", "text": "Store reset tokens with an expiry (REQ-2)", "done": False, "requirements": ["REQ-2"]},
        {"id": "TASK-3", "text": "Add a dark mode toggle", "done": True, "requirements": []},
        {"id": "TASK-4", "text": "Migrate the legacy tokens table (REQ-7)", "done": False, "requirements": ["REQ-7"]},
    ]
    error = await capture_error(lambda: mod.parse_tasks("- [ ] TASK-1: One\n- [x] TASK-1: Two"))
    assert isinstance(error, mod.SpecError)
    assert "TASK-1" in str(error)


@test("find_references returns whole requirement and task ids, unique and in order of first appearance")
def _():
    assert mod.find_references("TASK-2 and REQ-12 cover REQ-1, then TASK-2 again and REQ-1") == {"requirements": ["REQ-12", "REQ-1"], "tasks": ["TASK-2"]}
    assert mod.find_references("XREQ-1, REQ-1a, PRE-TASK-3 and REQ- are not ids") == {"requirements": [], "tasks": []}
    assert mod.find_references("(REQ-3) [TASK-10]: done") == {"requirements": ["REQ-3"], "tasks": ["TASK-10"]}


@test("build_traceability builds one row per requirement with the tasks that implement it and the tests that verify it directly or through a task")
def _():
    report = mod.build_traceability(spec=SPEC, tasks=TASKS, tests=TESTS)
    assert report["rows"] == [
        {"requirement": "REQ-1", "tasks": ["TASK-1"], "tests": ["TASK-1 sends a reset email to a known address"], "status": "covered"},
        {"requirement": "REQ-2", "tasks": ["TASK-2"], "tests": ["TASK-2 rejects a token after 30 minutes"], "status": "covered"},
        {"requirement": "REQ-3", "tasks": [], "tests": [], "status": "unplanned"},
        {"requirement": "REQ-4", "tasks": ["TASK-1"], "tests": ["TASK-1 sends a reset email to a known address", "REQ-4: answers the same way for unknown addresses"], "status": "covered"},
    ]
    untested = mod.build_traceability(spec=SPEC, tasks=TASKS, tests=["TASK-1 sends a reset email"])
    assert [row["status"] for row in untested["rows"]] == ["covered", "untested", "unplanned", "covered"]
    assert untested["uncoveredRequirements"] == ["REQ-2", "REQ-3"]


@test("build_traceability reports uncovered requirements, orphan tasks, tests without a requirement, unknown references and coverage")
def _():
    report = mod.build_traceability(spec=SPEC, tasks=TASKS, tests=TESTS)
    assert report["uncoveredRequirements"] == ["REQ-3"]
    assert report["orphanTasks"] == ["TASK-3", "TASK-4"]
    assert report["testsWithoutRequirement"] == ["renders the reset form", "TASK-9 cleans up expired tokens", "REQ-12 rate limits reset requests"]
    assert report["unknownReferences"] == [
        {"from": "TASK-4", "id": "REQ-7"},
        {"from": "TASK-9 cleans up expired tokens", "id": "TASK-9"},
        {"from": "REQ-12 rate limits reset requests", "id": "REQ-12"},
    ]
    assert report["coverage"] == approx(0.75, abs=1e-9)

    from_list = mod.build_traceability(spec=SPEC, tasks=mod.parse_tasks(TASKS), tests=TESTS)
    assert from_list == report
    empty = mod.build_traceability(spec="# Nothing yet", tasks="", tests=[])
    assert empty == {"rows": [], "uncoveredRequirements": [], "orphanTasks": [], "testsWithoutRequirement": [], "unknownReferences": [], "coverage": 0}


@test("plan_tasks asks for a JSON plan, retries a malformed reply with feedback and returns the tasks as not done")
async def _():
    async def scenario():
        fake_model.reply(respond.malformed_json(PLAN), respond.json(PLAN))
        tasks = await mod.plan_tasks(create_model(), SPEC)
        assert tasks == [{**task, "done": False} for task in PLAN["tasks"]]
        assert len(fake_model.requests) <= 2
        first = fake_model.requests[0]
        assert first["responseFormat"] == {"type": "json"}
        assert any(message["role"] == "user" and "A used link cannot be used again." in message["content"] for message in first["messages"])
        if len(fake_model.requests) == 2:
            retry = fake_model.requests[1]["messages"]
            assert len(retry) > len(first["messages"])
            assert retry[-1]["role"] == "user"
            assert "Invalid plan" in retry[-1]["content"]

    await for_each_seed(12, scenario)


@test("plan_tasks rejects plans with the wrong shape, stops after max_attempts, and its plan feeds the traceability matrix")
async def _():
    fake_model.reply(respond.json({"tasks": []}), respond.json({"tasks": [{"id": "step one", "text": "Do it", "requirements": []}]}), respond.json(PLAN))
    error = await capture_error(mod.plan_tasks(create_model(), SPEC))
    assert isinstance(error, mod.SpecError)
    assert len(fake_model.requests) == 2

    fake_model.reset().reply(
        respond.json({"steps": []}),
        respond.json({"tasks": [{"id": "TASK-1", "text": "", "requirements": ["REQ-1"]}]}),
        respond.json({"tasks": [{"id": "TASK-1", "text": "Endpoint", "requirements": "REQ-1"}]}),
        respond.json(PLAN),
    )
    retried = await mod.plan_tasks(create_model(), SPEC, max_attempts=4)
    assert len(retried) == 3
    assert len(fake_model.requests) == 4

    fake_model.reset().reply(respond.json({"tasks": [*PLAN["tasks"], {"id": "TASK-4", "text": "Send an SMS code", "requirements": ["REQ-8"]}]}))
    planned = await mod.plan_tasks(create_model(), SPEC)
    report = mod.build_traceability(spec=SPEC, tasks=planned, tests=[])
    assert [row["status"] for row in report["rows"]] == ["untested", "untested", "untested", "untested"]
    assert report["orphanTasks"] == ["TASK-4"]
    assert report["unknownReferences"] == [{"from": "TASK-4", "id": "REQ-8"}]
