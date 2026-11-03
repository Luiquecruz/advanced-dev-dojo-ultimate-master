1. Decide who may write before deciding how. An owner per key (with predictable pattern resolution) makes every value traceable to one role and keeps a compromised agent out of keys it does not own.
2. Detect conflicts instead of preventing them with locks. Writers send the version they read; a stale version is rejected, so a slow model call never holds a lock and a lost update becomes a visible conflict.
3. Make the log the source of truth: every attempt, accepted or not, with a sequence number. Current state is a replay of accepted entries, which gives auditing and crash recovery for free.
4. Isolate the board from its users by copying values in and out; shared references would let an agent change state without a versioned write.
5. Retry only what a retry can fix. Conflicts re-read and redo the work on fresh values, a bounded number of times; ownership errors return at once.
