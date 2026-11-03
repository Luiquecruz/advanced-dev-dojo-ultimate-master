1. Make provenance part of the data model: owner, source kind, trust and reference are required fields of every memory, not optional metadata added later.
2. Decide trust by source, then inspect content: an untrusted channel may supply facts but not instructions, while the user may state their own preferences. A pattern check is the filter at that boundary, not the whole defense.
3. Scope every read by owner and liveness in one shared helper, so no code path (reads, summaries, prompts) can forget the filter.
4. Treat derived data as personal data: a summary is built only from one user's live memories, remembers which memories it came from, and expires no later than the earliest of them.
5. Make deletion follow derivation: forgetting a memory removes every summary that contains it, erasing a user removes everything they own, and both return counts for the audit trail instead of the deleted content.
6. Treat model failures during summarization as "no summary", so a refusal or an outage never leaves a half-written derived record behind.
