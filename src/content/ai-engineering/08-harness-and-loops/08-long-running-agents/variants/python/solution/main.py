import inspect
import json
import posixpath

from memory_file_system import file_system

SESSION_SYSTEM = "You are one session of a long-running coding agent. Work only on the task given, using the progress notes from earlier sessions. Answer with the complete result for that task."

PROGRESS_TAIL_LINES = 20


def tasks_path(directory):
    return posixpath.join(directory, "tasks.json")


def progress_path(directory):
    return posixpath.join(directory, "progress.md")


def initialize_project(directory, tasks):
    if file_system.exists(tasks_path(directory)):
        return False
    file_system.make_directories(directory)
    plan = [{"id": task["id"], "title": task["title"], "status": "pending", "attempts": 0} for task in tasks]
    file_system.write_file(tasks_path(directory), json.dumps(plan, indent=2))
    file_system.write_file(progress_path(directory), "# Progress\n")
    return True


def read_tasks(directory):
    return json.loads(file_system.read_file(tasks_path(directory)))


def next_task(tasks):
    return next((task for task in tasks if task["status"] == "pending"), None)


def save_tasks(directory, tasks):
    temporary = f"{tasks_path(directory)}.tmp"
    file_system.write_file(temporary, json.dumps(tasks, indent=2))
    file_system.rename(temporary, tasks_path(directory))


def append_progress(directory, line):
    file_system.append_file(progress_path(directory), f"{line}\n")


def progress_tail(directory):
    lines = [line for line in file_system.read_file(progress_path(directory)).split("\n") if line.strip() != ""]
    return "\n".join(lines[-PROGRESS_TAIL_LINES:])


async def run_session(directory, *, model, verify, session_id, max_tasks, max_attempts):
    tasks = read_tasks(directory)
    completed = []
    blocked = []
    task = next_task(tasks)
    while task is not None and len(completed) < max_tasks:
        response = await model.generate({
            "messages": [
                {"role": "system", "content": SESSION_SYSTEM},
                {"role": "user", "content": f"Task {task['id']}: {task['title']}\n\nProgress so far:\n{progress_tail(directory)}"},
            ],
        })
        verdict = verify({**task}, response["text"])
        if inspect.isawaitable(verdict):
            verdict = await verdict
        if verdict["passed"]:
            task["status"] = "done"
            completed.append(task["id"])
            append_progress(directory, f"- [done] {task['id']} (session {session_id})")
        else:
            task["attempts"] += 1
            append_progress(directory, f"- [retry] {task['id']}: {verdict['feedback']}")
            if task["attempts"] >= max_attempts:
                task["status"] = "blocked"
                blocked.append(task["id"])
                append_progress(directory, f"- [blocked] {task['id']}")
        save_tasks(directory, tasks)
        task = next_task(tasks)
    return {"completed": completed, "blocked": blocked, "remaining": len([candidate for candidate in tasks if candidate["status"] == "pending"])}
