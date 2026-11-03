1. Decide what must survive a session: the list of tasks with their status and attempts (structured, for the harness) and a log of what happened (prose, for the next model). Everything else is disposable.
2. Make initialization idempotent. The initializer creates the plan only when none exists; running it again is a no-op, never a reset.
3. Make every session start from disk. The next task comes from the file, not from memory, so a completed task can never be offered again and a crashed session simply resumes.
4. Give each session the context it needs, not all of it: the current task and the recent progress notes.
5. Change state only on evidence: a verified result marks a task done; a failure increments attempts, records the feedback, and blocks the task at the limit so the session moves on.
6. Persist after every attempt with an atomic write, and let the agent change statuses only, never the plan's shape. The task list then stays a trustworthy record of the work.
