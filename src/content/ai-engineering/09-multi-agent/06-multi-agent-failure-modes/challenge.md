Build three defenses against multi-agent failures: validate worker outputs before they spread, vote independently before any discussion, and bound delegation.

## 1. `validateWorkerOutput(response, allowedSourceIds)`

A worker replies with JSON `{ "claims": [{ "text": "...", "sourceId": "..." }] }`. Return `{ ok: true, claims }` (each claim as `{ text, sourceId }`) or `{ ok: false, problems }` with at least one problem:

- `finishReason` is not `'stop'`: a problem mentioning the finish reason;
- the text is not valid JSON: a problem mentioning `JSON`;
- `claims` missing, not an array or empty: a problem mentioning `claims`;
- a claim whose `text` is not a non-blank string: a problem mentioning `text`;
- a claim whose `sourceId` is not in `allowedSourceIds`: a problem that contains that `sourceId`.

## 2. `gatherClaims(tasks, { model, maxAttempts })`

A task is `{ id, instruction, sourceIds }`. Handle the tasks one after another; for each, up to `maxAttempts` calls:

1. Call `model.generate` with `responseFormat: { type: 'json' }` and messages `[{ role: 'system', content: WORKER_SYSTEM }, { role: 'user', content }]`, where `content` contains the instruction and every allowed source id. From the second attempt on, `content` also contains the problems of the previous attempt.
2. Validate the reply. A `ModelError` is a failed attempt whose problem contains the error `code`.
3. On success, add every claim with `taskId` to `accepted`; when the attempts run out, add `{ taskId, problems }` (the last problems) to `quarantined`.

Return `{ accepted, quarantined }`.

## 3. `voteIndependently(question, { model, voters, quorum })`

`voters` are names; `quorum` is a fraction above 0.5. A ballot is one call with `responseFormat: { type: 'json' }` and messages `[{ role: 'system', content: voterSystem(voter) }, { role: 'user', content }]`; its value is the reply's `answer`, trimmed and lowercased. A reply that is not finished (`finishReason` other than `'stop'`), not JSON, without a non-blank string `answer`, or a `ModelError`, is an abstention (`null`).

1. **Round 1:** every voter at once (in parallel), with `content` exactly `question`.
2. An answer wins when its count divided by the **number of voters** is at least `quorum`. With a winner, return `{ status: 'consensus', decision, rounds: 1, ballots: [round1] }`.
3. **Round 2 (discussion):** every voter again, in parallel, with `content` containing the question and every round-1 answer, without any voter's name.
4. Return `{ status, decision, rounds: 2, ballots: [round1, round2] }`: a winner of round 2 is a `'consensus'`; otherwise `'no_consensus'` with `decision: null`.

Ballots are listed in the order of `voters`.

## 4. `createDelegationGuard({ maxDepth, maxFanOut, maxTotal })`

Return `{ request(chain, target), total }`. `chain` lists the agents from the root to the one asking to delegate to `target`. Check in this order:

1. `target` already in `chain`: `{ allowed: false, reason: 'cycle' }`;
2. `chain.length` greater than `maxDepth` (the new agent would sit deeper than allowed): `'depth'`;
3. this same chain already made `maxFanOut` allowed delegations: `'fan_out'`;
4. `maxTotal` delegations were already allowed: `'total'`;
5. otherwise record the delegation and return `{ allowed: true }`.

`total` is the number of allowed delegations so far.
