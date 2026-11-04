import json
import re

from dojo_ai import create_model

DIRECTORY = "/app/checkout-rewrite"
PLAN = [
    {"id": "cart-model", "title": "Cart model with line items"},
    {"id": "totals", "title": "Totals with tax and discounts"},
    {"id": "checkout-api", "title": "POST /checkout endpoint"},
    {"id": "receipt-email", "title": "Receipt email after payment"},
]


def disk():
    return modules["memory_file_system.py"].file_system


def task_id_of(request):
    content = next(message for message in request["messages"] if message["role"] == "user")["content"]
    match = re.match(r"Task (\S+):", content)
    return match.group(1) if match else None


def requested_ids():
    return [task_id_of(request) for request in fake_model.requests]


def progress_lines():
    return [line for line in disk().read_file(f"{DIRECTORY}/progress.md").split("\n") if line]


def tasks_on_disk():
    return json.loads(disk().read_file(f"{DIRECTORY}/tasks.json"))


def answer_every_task():
    fake_model.handle(lambda request, context: respond.text(f"IMPLEMENTED {task_id_of(request)}"))


def pass_when_implemented(task, output):
    return {"passed": output == f"IMPLEMENTED {task['id']}", "feedback": f"tests for {task['id']} fail"}


def options(**extra):
    return {"model": create_model(), "verify": pass_when_implemented, "session_id": "s1", "max_tasks": 10, "max_attempts": 3, **extra}


@test("initialize_project writes the plan once and never overwrites existing progress")
def _():
    assert mod.initialize_project(DIRECTORY, PLAN) is True
    assert tasks_on_disk() == [{**task, "status": "pending", "attempts": 0} for task in PLAN]
    assert progress_lines()[0] == "# Progress"

    tasks = tasks_on_disk()
    tasks[0]["status"] = "done"
    disk().write_file(f"{DIRECTORY}/tasks.json", json.dumps(tasks))
    disk().append_file(f"{DIRECTORY}/progress.md", "- [done] cart-model (session s1)\n")
    assert mod.initialize_project(DIRECTORY, [{"id": "other", "title": "A different plan"}]) is False
    assert tasks_on_disk()[0]["status"] == "done"
    assert [task["id"] for task in tasks_on_disk()] == [task["id"] for task in PLAN]
    assert len(progress_lines()) == 2


@test("read_tasks and next_task pick the first pending task, skipping done and blocked ones")
def _():
    mod.initialize_project(DIRECTORY, PLAN)
    tasks = mod.read_tasks(DIRECTORY)
    assert mod.next_task(tasks)["id"] == "cart-model"
    tasks[0]["status"] = "done"
    tasks[1]["status"] = "blocked"
    assert mod.next_task(tasks)["id"] == "checkout-api"
    tasks[2]["status"] = "done"
    tasks[3]["status"] = "done"
    assert mod.next_task(tasks) is None


@test("sessions resume from the files: each picks the next unfinished task and none redoes completed work")
async def _():
    mod.initialize_project(DIRECTORY, PLAN)
    answer_every_task()
    assert await mod.run_session(DIRECTORY, **options(session_id="s1", max_tasks=2)) == {"completed": ["cart-model", "totals"], "blocked": [], "remaining": 2}
    assert [task["status"] for task in tasks_on_disk()] == ["done", "done", "pending", "pending"]
    assert requested_ids() == ["cart-model", "totals"]

    assert await mod.run_session(DIRECTORY, **options(session_id="s2", max_tasks=2)) == {"completed": ["checkout-api", "receipt-email"], "blocked": [], "remaining": 0}
    assert await mod.run_session(DIRECTORY, **options(session_id="s3", max_tasks=2)) == {"completed": [], "blocked": [], "remaining": 0}
    assert requested_ids() == ["cart-model", "totals", "checkout-api", "receipt-email"]
    assert [line for line in progress_lines() if line.startswith("- [done]")] == [
        "- [done] cart-model (session s1)",
        "- [done] totals (session s1)",
        "- [done] checkout-api (session s2)",
        "- [done] receipt-email (session s2)",
    ]
    assert disk().exists(f"{DIRECTORY}/tasks.json.tmp") is False


@test("a new session gets up to speed from the tail of the progress file")
async def _():
    mod.initialize_project(DIRECTORY, PLAN)
    answer_every_task()
    await mod.run_session(DIRECTORY, **options(session_id="monday", max_tasks=1))
    for index in range(30):
        disk().append_file(f"{DIRECTORY}/progress.md", f"- [note] observation {index}\n")
    await mod.run_session(DIRECTORY, **options(session_id="tuesday", max_tasks=1))
    request = fake_model.requests[1]
    assert request["messages"][0] == {"role": "system", "content": mod.SESSION_SYSTEM}
    content = request["messages"][1]["content"]
    assert content.startswith("Task totals: Totals with tax and discounts")
    assert "- [note] observation 29" in content
    assert "- [note] observation 10" in content
    assert "- [note] observation 9\n" not in content
    assert "(session monday)" not in content
    assert "# Progress" in fake_model.requests[0]["messages"][1]["content"]


@test("failed verifications count attempts, are logged with feedback, and block the task at max_attempts without blocking the session")
async def _():
    mod.initialize_project(DIRECTORY, PLAN)

    def answer(request, context):
        task_id = task_id_of(request)
        return respond.text("IMPLEMENTED something else" if task_id == "totals" else f"IMPLEMENTED {task_id}")

    fake_model.handle(answer)
    result = await mod.run_session(DIRECTORY, **options(max_attempts=2))
    assert result == {"completed": ["cart-model", "checkout-api", "receipt-email"], "blocked": ["totals"], "remaining": 0}
    assert requested_ids() == ["cart-model", "totals", "totals", "checkout-api", "receipt-email"]
    assert tasks_on_disk()[1] == {"id": "totals", "title": "Totals with tax and discounts", "status": "blocked", "attempts": 2}
    assert [line for line in progress_lines() if "totals" in line] == ["- [retry] totals: tests for totals fail", "- [retry] totals: tests for totals fail", "- [blocked] totals"]
    assert "- [retry] totals: tests for totals fail" in fake_model.requests[2]["messages"][1]["content"]

    following = await mod.run_session(DIRECTORY, **options(session_id="s2"))
    assert following == {"completed": [], "blocked": [], "remaining": 0}
    assert len(fake_model.requests) == 5


@test("a crash keeps everything saved before it, and the next session resumes at the same task")
async def _():
    mod.initialize_project(DIRECTORY, PLAN)
    fake_model.reply(respond.text("IMPLEMENTED cart-model"), respond.text("wrong"), respond.error(500))
    crash = await capture_error(mod.run_session(DIRECTORY, **options(session_id="crashed")))
    assert crash.status == 500
    assert [[task["status"], task["attempts"]] for task in tasks_on_disk()] == [["done", 0], ["pending", 1], ["pending", 0], ["pending", 0]]
    assert disk().exists(f"{DIRECTORY}/tasks.json.tmp") is False

    answer_every_task()
    resumed = await mod.run_session(DIRECTORY, **options(session_id="resumed"))
    assert resumed == {"completed": ["totals", "checkout-api", "receipt-email"], "blocked": [], "remaining": 0}
    assert requested_ids() == ["cart-model", "totals", "totals", "totals", "checkout-api", "receipt-email"]
    assert tasks_on_disk()[1]["attempts"] == 1


@test("across random outcomes and many sessions, every task ends done or blocked exactly once and the plan never changes shape")
async def _():
    async def scenario():
        disk().remove_tree(DIRECTORY)
        mod.initialize_project(DIRECTORY, PLAN)
        fake_model.handle(
            lambda request, context: respond.one_of([
                respond.text(f"IMPLEMENTED {task_id_of(request)}"),
                respond.text("not quite"),
                respond.text(f"IMPLEMENTED {task_id_of(request)}"),
            ])
        )
        seen_done = set()
        for session in range(1, 9):
            before = len(fake_model.requests)
            result = await mod.run_session(DIRECTORY, **options(session_id=f"s{session}", max_tasks=1, max_attempts=2))
            for request in fake_model.requests[before:]:
                assert task_id_of(request) not in seen_done
            seen_done.update(result["completed"])
            assert len(result["completed"]) <= 1
        tasks = tasks_on_disk()
        assert [{"id": task["id"], "title": task["title"]} for task in tasks] == PLAN
        for task in tasks:
            assert task["status"] in ["done", "blocked"]
            assert task["attempts"] <= 2
            done_lines = [line for line in progress_lines() if line.startswith(f"- [done] {task['id']} ")]
            assert len(done_lines) == (1 if task["status"] == "done" else 0)

    await for_each_seed(12, scenario)
