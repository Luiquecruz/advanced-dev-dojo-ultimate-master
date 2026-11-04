Build three defenses against multi-agent failures: validate worker outputs before they spread, vote independently before any discussion, and bound delegation.

Responses, tasks, claims and results are plain dicts whose keys keep the JSON names (`"finishReason"`, `"sourceId"`, `"sourceIds"`, `"taskId"`).

## 1. `validate_worker_output(response, allowed_source_ids)`

A worker replies with JSON `{"claims": [{"text": "...", "sourceId": "..."}]}`. Return `{"ok": True, "claims": claims}` (each claim as `{"text", "sourceId"}`) or `{"ok": False, "problems": problems}` with at least one problem:

- `response["finishReason"]` is not `"stop"`: a problem mentioning the finish reason;
- the text is not valid JSON: a problem mentioning `JSON`;
- `"claims"` missing, not a list or empty: a problem mentioning `claims`;
- a claim whose `"text"` is not a non-blank string: a problem mentioning `text`;
- a claim whose `"sourceId"` is not in `allowed_source_ids`: a problem that contains that source id.

## 2. `gather_claims(tasks, *, model, max_attempts)`

A task is `{"id", "instruction", "sourceIds"}`. Handle the tasks one after another; for each, up to `max_attempts` calls:

1. Call `await model.generate(request)` with `"responseFormat": {"type": "json"}` and messages `[{"role": "system", "content": WORKER_SYSTEM}, {"role": "user", "content": content}]`, where `content` contains the instruction and every allowed source id. From the second attempt on, `content` also contains the problems of the previous attempt.
2. Validate the reply. A `ModelError` is a failed attempt whose problem contains the error `code`.
3. On success, add every claim with `"taskId"` to `"accepted"`; when the attempts run out, add `{"taskId", "problems"}` (the last problems) to `"quarantined"`.

Return `{"accepted": [...], "quarantined": [...]}`.

## 3. `vote_independently(question, *, model, voters, quorum)`

`voters` are names; `quorum` is a fraction above 0.5. A ballot is one call with `"responseFormat": {"type": "json"}` and messages `[{"role": "system", "content": voter_system(voter)}, {"role": "user", "content": content}]`; its value is the reply's `"answer"`, stripped and lowercased. A reply that is not finished (`"finishReason"` other than `"stop"`), not JSON, without a non-blank string `"answer"`, or a `ModelError`, is an abstention (`None`).

1. **Round 1:** every voter at once (in parallel, with `asyncio.gather`), with `content` exactly `question`.
2. An answer wins when its count divided by the **number of voters** is at least `quorum`. With a winner, return `{"status": "consensus", "decision": decision, "rounds": 1, "ballots": [round_1]}`.
3. **Round 2 (discussion):** every voter again, in parallel, with `content` containing the question and every round-1 answer, without any voter's name.
4. Return `{"status", "decision", "rounds": 2, "ballots": [round_1, round_2]}`: a winner of round 2 is a `"consensus"`; otherwise `"no_consensus"` with `"decision": None`.

Ballots are listed in the order of `voters`.

## 4. `create_delegation_guard(*, max_depth, max_fan_out, max_total)`

Return a `DelegationGuard` with a `request(chain, target)` method and a `total` attribute. `chain` lists the agents from the root to the one asking to delegate to `target`. Check in this order:

1. `target` already in `chain`: `{"allowed": False, "reason": "cycle"}`;
2. `len(chain)` greater than `max_depth` (the new agent would sit deeper than allowed): `"depth"`;
3. this same chain already made `max_fan_out` allowed delegations: `"fan_out"`;
4. `max_total` delegations were already allowed: `"total"`;
5. otherwise record the delegation and return `{"allowed": True}`.

`total` is the number of allowed delegations so far.
