import asyncio

from dojo_ai import create_model

OWNERS = {"plan": "lead", "findings:*": "researcher", "findings:pricing": "analyst", "draft": "editor"}


def user_of(request):
    return next(message["content"] for message in request["messages"] if message["role"] == "user")


@test("owner_of prefers an exact key, then the longest matching prefix pattern, and returns None for unowned keys")
def _():
    assert mod.owner_of(OWNERS, "plan") == "lead"
    assert mod.owner_of(OWNERS, "findings:latency") == "researcher"
    assert mod.owner_of(OWNERS, "findings:pricing") == "analyst"
    assert mod.owner_of({"a:*": "short", "a:b:*": "long"}, "a:b:c") == "long"
    assert mod.owner_of(OWNERS, "budget") is None
    assert mod.owner_of(OWNERS, "findings") is None


@test("only the owner writes, and only with the version it read")
def _():
    board = mod.create_blackboard(OWNERS)
    assert board.read("plan") == {"key": "plan", "value": None, "version": 0, "writer": None}
    assert board.write("lead", "plan", {"steps": ["pricing", "latency"]}, 0) == {"ok": True, "version": 1}
    assert board.read("plan") == {"key": "plan", "value": {"steps": ["pricing", "latency"]}, "version": 1, "writer": "lead"}
    assert board.write("researcher", "plan", {"steps": []}, 1) == {"ok": False, "reason": "not_owner", "currentVersion": 1}
    assert board.write("lead", "plan", {"steps": ["pricing"]}, 0) == {"ok": False, "reason": "version_conflict", "currentVersion": 1}
    assert board.write("lead", "plan", {"steps": ["pricing"]}, 2) == {"ok": False, "reason": "version_conflict", "currentVersion": 1}
    assert board.write("lead", "plan", {"steps": ["pricing", "latency", "support"]}, 1) == {"ok": True, "version": 2}
    assert board.write("intruder", "budget", 10, 0) == {"ok": False, "reason": "not_owner", "currentVersion": 0}
    assert board.write("lead", "findings:latency", "fast", 0)["ok"] is False
    assert board.write("researcher", "findings:latency", "p95 120 ms", 0) == {"ok": True, "version": 1}
    assert board.read("plan")["value"] == {"steps": ["pricing", "latency", "support"]}


@test("reads, snapshots and the log are copies that cannot change the board")
def _():
    board = mod.create_blackboard(OWNERS)
    plan = {"steps": ["pricing"]}
    board.write("lead", "plan", plan, 0)
    plan["steps"].append("mutated after write")
    read = board.read("plan")
    read["value"]["steps"].append("mutated after read")
    snapshot = board.snapshot()
    snapshot["plan"]["steps"].append("mutated snapshot")
    snapshot["extra"] = True
    log = board.log()
    log.append({"sequence": 99})
    log[0]["value"]["steps"].append("mutated log")
    log[0]["accepted"] = False
    assert board.read("plan")["value"] == {"steps": ["pricing"]}
    assert board.snapshot() == {"plan": {"steps": ["pricing"]}}
    assert len(board.log()) == 1
    assert board.log()[0]["accepted"] is True
    assert board.log()[0]["value"] == {"steps": ["pricing"]}


@test("logs every attempt in order, accepted or rejected, and rebuild replays only accepted writes")
def _():
    board = mod.create_blackboard(OWNERS)
    board.write("lead", "plan", "v1", 0)
    board.write("researcher", "plan", "hijack", 1)
    board.write("editor", "draft", "first draft", 0)
    board.write("editor", "draft", "stale edit", 0)
    board.write("lead", "plan", "v2", 1)
    log = board.log()
    assert log == [
        {"sequence": 1, "agent": "lead", "key": "plan", "value": "v1", "expectedVersion": 0, "accepted": True, "reason": None, "version": 1},
        {"sequence": 2, "agent": "researcher", "key": "plan", "value": "hijack", "expectedVersion": 1, "accepted": False, "reason": "not_owner", "version": 1},
        {"sequence": 3, "agent": "editor", "key": "draft", "value": "first draft", "expectedVersion": 0, "accepted": True, "reason": None, "version": 1},
        {"sequence": 4, "agent": "editor", "key": "draft", "value": "stale edit", "expectedVersion": 0, "accepted": False, "reason": "version_conflict", "version": 1},
        {"sequence": 5, "agent": "lead", "key": "plan", "value": "v2", "expectedVersion": 1, "accepted": True, "reason": None, "version": 2},
    ]
    assert mod.rebuild(log) == {"plan": "v2", "draft": "first draft"}
    assert mod.rebuild(list(reversed(log))) == board.snapshot()
    assert mod.rebuild([]) == {}


@test("contribute_with_model gives the model the current values and writes its reply with the version it read")
async def _():
    board = mod.create_blackboard(OWNERS)
    board.write("lead", "plan", "Compare Nimbus and Quill on pricing.", 0)
    board.write("analyst", "findings:pricing", "Nimbus $0.30/GB, Quill $0.25/GB", 0)
    fake_model.reply(respond.text("Draft: Quill is cheaper per GB."))
    result = await mod.contribute_with_model("editor", "draft", "Write the comparison draft.", board=board, model=create_model(), read_keys=["plan", "findings:pricing"], max_attempts=3)
    assert result == {"ok": True, "version": 1, "attempts": 1}
    assert board.read("draft") == {"key": "draft", "value": "Draft: Quill is cheaper per GB.", "version": 1, "writer": "editor"}
    assert fake_model.requests[0]["messages"][0] == {"role": "system", "content": mod.CONTRIBUTOR_SYSTEM}
    content = user_of(fake_model.requests[0])
    for part in ["Write the comparison draft.", "Compare Nimbus and Quill on pricing.", "Nimbus $0.30/GB, Quill $0.25/GB"]:
        assert part in content, part


@test("a concurrent write turns into a conflict that is retried with the fresh value, never a lost update")
async def _():
    board = mod.create_blackboard(OWNERS)
    board.write("editor", "draft", "v1: outline", 0)
    calls = 0

    def interfere_once(request, context):
        nonlocal calls
        calls += 1
        if calls == 1:
            board.write("editor", "draft", "v2: another editor added a pricing table", 1)
        return respond.text(f"edit {calls}")

    fake_model.handle(interfere_once)
    result = await mod.contribute_with_model("editor", "draft", "Tighten the draft.", board=board, model=create_model(), read_keys=[], max_attempts=3)
    assert result == {"ok": True, "version": 3, "attempts": 2}
    assert "v2: another editor added a pricing table" in user_of(fake_model.requests[1])
    assert [[entry["value"], entry["accepted"], entry["reason"]] for entry in board.log()] == [
        ["v1: outline", True, None],
        ["v2: another editor added a pricing table", True, None],
        ["edit 1", False, "version_conflict"],
        ["edit 2", True, None],
    ]

    def interfere_always(request, context):
        current = board.read("draft")
        board.write("editor", "draft", f"interference at {current['version']}", current["version"])
        return respond.text("always late")

    fake_model.reset().handle(interfere_always)
    exhausted = await mod.contribute_with_model("editor", "draft", "Tighten the draft.", board=board, model=create_model(), read_keys=[], max_attempts=2)
    assert exhausted == {"ok": False, "reason": "version_conflict", "attempts": 2}


@test("an agent writing a key it does not own fails at once without retrying")
async def _():
    board = mod.create_blackboard(OWNERS)
    fake_model.reply(respond.text("My plan"), respond.text("My plan again"))
    result = await mod.contribute_with_model("researcher", "plan", "Rewrite the plan.", board=board, model=create_model(), read_keys=[], max_attempts=3)
    assert result == {"ok": False, "reason": "not_owner", "attempts": 1}
    assert len(fake_model.requests) == 1
    assert board.read("plan")["version"] == 0


@test("concurrent contributors never lose an update, whatever the timing")
async def _():
    async def scenario():
        board = mod.create_blackboard(OWNERS)
        reply = 0

        def handler(request, context):
            nonlocal reply
            reply += 1
            return respond.one_of([respond.slow(1, respond.text(f"edit {reply}")), respond.slow(4, respond.text(f"edit {reply}")), respond.text(f"edit {reply}")])

        fake_model.handle(handler)
        model = create_model()
        results = await asyncio.gather(*(
            mod.contribute_with_model("editor", "draft", f"Edit {index}", board=board, model=model, read_keys=[], max_attempts=6)
            for index in [1, 2, 3, 4]
        ))
        accepted = [entry for entry in board.log() if entry["accepted"]]
        assert len(accepted) == len([result for result in results if result["ok"]])
        assert any(result["ok"] for result in results)
        for index, entry in enumerate(accepted):
            assert entry["expectedVersion"] == index
            assert entry["version"] == index + 1
        assert board.read("draft")["version"] == len(accepted)
        assert board.read("draft")["value"] == accepted[-1]["value"]
        assert mod.rebuild(board.log()) == board.snapshot()
        assert len(fake_model.requests) == sum(result["attempts"] for result in results)

    await for_each_seed(15, scenario)
