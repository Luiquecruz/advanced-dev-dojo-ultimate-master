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
    # TODO: never overwrite an existing tasks.json (return False); otherwise write every task pending with 0 attempts and progress.md starting with "# Progress"
    file_system.make_directories(directory)
    plan = [{"id": task["id"], "title": task["title"], "status": "pending", "attempts": 0} for task in tasks]
    file_system.write_file(tasks_path(directory), json.dumps(plan))
    file_system.write_file(progress_path(directory), "# Progress\n")
    return True


def read_tasks(directory):
    return json.loads(file_system.read_file(tasks_path(directory)))


def next_task(tasks):
    # TODO: the first pending task, or None
    return tasks[0]


async def run_session(directory, *, model, verify, session_id, max_tasks, max_attempts):
    # TODO: up to max_tasks completions; prompt "Task <id>: <title>" plus the last 20 progress lines; verify before done; count attempts and block; save tasks.json atomically after every attempt
    tasks = read_tasks(directory)
    completed = []
    for task in tasks:
        await model.generate({"messages": [{"role": "user", "content": f"Task {task['id']}: {task['title']}"}]})
        task["status"] = "done"
        completed.append(task["id"])
        file_system.append_file(progress_path(directory), f"- [done] {task['id']} (session {session_id})\n")
    file_system.write_file(tasks_path(directory), json.dumps(tasks))
    return {"completed": completed, "blocked": [], "remaining": 0}
