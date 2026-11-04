1. Run the starter's `process_batch` in your head with one failing item: which handlers are still running after `gather` raises, and what type does the caller see?
2. Replace `gather` with a task group and decide where the results are read: inside the block the tasks may still run, after it they are all done.
3. Check the failure path: the group cancels the siblings and waits for them, so a sibling's cleanup has run before the exception leaves the block.
4. List the failure kinds `handle_failures` must count and the ones it must not touch. Map each counted kind to an `except*` clause.
5. Consider a batch where three items fail in the same loop step: the group holds three exceptions, and both of your clauses may run for one batch.
6. Confirm that an unexpected exception type escapes in a group and that the report is not returned in that case.
