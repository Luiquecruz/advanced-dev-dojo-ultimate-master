1. Assume the process can die between any two lines. The question is not whether a run crashes, but what state the world and the checkpoint are in when it does.
2. Make the checkpoint the run. Everything needed to continue (conversation, step count, status, answer) lives in one plain JSON document per run id, written atomically so a crash mid-write cannot corrupt it.
3. Persist intent before acting: save the model's tool calls before executing them. A resumed run can then see which calls were requested and which already have results.
4. Persist results right after acting, one tool call at a time, so at most one side effect can be "done but not recorded" at any crash point.
5. Close that last gap with idempotency: derive a key from the run id and the tool call id, pass it to every side-effecting tool, and let the downstream service ignore a request it has already processed. The key must be stable across attempts, never random or time-based.
6. Write one loop for fresh and resumed runs: finish unanswered calls, check limits, call the model, checkpoint. Then "resume" is simply "start with the same run id", and a finished run returns its stored answer without spending another call.
