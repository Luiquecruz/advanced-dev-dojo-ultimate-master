# Consensus & Leader Election

Replication copies data to several machines, but someone still has to decide which machine is the leader and which writes are final. If two nodes both believe they lead, they accept conflicting writes: the split-brain risk of automatic failover. Consensus protocols solve this by making every decision depend on a majority of nodes. This lesson explains majorities and walks through Raft, the protocol behind many coordination systems.

You need: Database Replication & Sharding (failover and split-brain) and CAP & PACELC Theorems (a CP store refuses writes on the minority side).

## Why replicated state needs agreement

Consensus means a group of nodes agrees on a sequence of values (a replicated log) even when some nodes crash or messages are delayed. Every node applies the same log in the same order, so every node ends in the same state: this is a **replicated state machine**. A key-value store, a lock service or a configuration database can all be built on top of it.

The hard part is that a node cannot tell a slow peer from a dead one. A protocol that waits for every node stops when one crashes; a protocol that lets any node decide alone produces split-brain. Consensus waits for exactly enough nodes: a majority.

## Majority quorums

A **majority quorum** in a cluster of `n` nodes is `⌊n/2⌋ + 1` nodes. Any two majorities share at least one node, and that shared node is what prevents two leaders in the same term or two different values committed at the same position.

| Cluster size | Majority | Failures tolerated |
| --- | --- | --- |
| 1 | 1 | 0 |
| 3 | 2 | 1 |
| 4 | 3 | 1 |
| 5 | 3 | 2 |
| 7 | 4 | 3 |

A cluster of `n` nodes tolerates `n - majority` failures, which is `⌊(n - 1)/2⌋`. Adding a fourth node to a three-node cluster raises the majority from 2 to 3 but still tolerates only one failure, and every write now waits for one more acknowledgement. That is why consensus clusters run 3 or 5 nodes: odd sizes buy fault tolerance, even sizes only buy cost. During a partition, only the side with a majority can make progress; the minority side refuses writes, which is the CP choice.

## Raft: terms and roles

Raft was designed to be understandable, and it splits consensus into leader election, log replication and safety. Time is divided into **terms**, numbered with increasing integers. Each term has at most one leader. Every message carries the sender's term; a node that sees a higher term updates its own and becomes a follower.

Each node is a **follower**, a **candidate** or a **leader**. The leader sends periodic heartbeats. A follower that hears nothing for its **election timeout** becomes a candidate: it increments its term, votes for itself and sends `RequestVote` to every other node. Timeouts are randomized (the Raft paper's example range is 150 to 300 ms) so that usually one node times out first and wins before the others start, instead of splitting the vote forever.

## The voting rule

A node grants its vote only when all of these hold:

1. The request's term is not lower than the voter's current term (a stale candidate is refused). A higher term first updates the voter's term and clears its vote.
2. The voter has not voted for another candidate in this term: **one vote per term**.
3. The candidate's log is **at least as up-to-date** as the voter's: compare the term of the last entry first (higher wins), and only when those terms are equal compare the last index (longer or equal wins).

Rule 3 is what makes elections safe. A committed entry is stored on a majority, a candidate needs votes from a majority, and the two majorities overlap, so a candidate missing a committed entry cannot collect enough votes. Raft calls the result **leader completeness**: every new leader already holds every committed entry.

## Log replication and commit

Clients send commands to the leader. The leader appends each one to its log with the current term and sends `AppendEntries` to the followers, including the index and term of the entry just before the new ones; a follower whose log does not match there rejects the request, and the leader retries from earlier until the logs agree.

An entry is **committed** when the leader has stored it on a majority of nodes and the entry belongs to the leader's current term. Entries from earlier terms are never committed by counting replicas alone, because a new leader could still overwrite them; they become committed implicitly once an entry of the current term after them is committed. Committed entries are applied to the state machine and are never lost.

## Leases and fencing tokens

Leaders can be wrong about still being leaders: a paused old leader may wake up and keep talking. A **lease** lets a leader serve reads for a limited time without first confirming with a majority that it still leads, which is safe only while clock drift between nodes stays bounded. A **fencing token** is a number that grows with every new leader (the term works); storage that rejects any request carrying a lower token than one it has already seen stops a stale leader from writing.

## Common mistakes

- **An even-sized cluster or a non-majority quorum.** Four nodes tolerate one failure, like three, and pay for an extra acknowledgement. A quorum smaller than a majority lets two sides of a partition both decide, which is split-brain.
- **Granting a vote by term alone.** Without the up-to-date log check, a node missing committed entries can win and erase them.
- **Committing old-term entries by counting replicas.** Only entries from the current term commit by majority.
- **Treating a timeout as proof of death.** A slow leader may still act; fence it.

## In practice

You rarely implement consensus yourself. etcd (the store behind Kubernetes) uses Raft, ZooKeeper uses ZAB, a similar leader-based protocol, and Kafka keeps its cluster metadata in KRaft, a Raft-based controller quorum. Your design job is to put small, critical state there (leader election, locks, configuration, membership), run 3 or 5 voters across failure zones, and keep bulk data elsewhere, since every write pays a majority round trip.

## Check yourself

1. A five-node cluster splits into groups of two and three. Which side can elect a leader and commit writes, and why?
2. A candidate's last entry has term 5 and index 10; the voter's has term 6 and index 4. Does the voter grant its vote?
3. Why does adding a fourth node to a three-node cluster not improve fault tolerance?
