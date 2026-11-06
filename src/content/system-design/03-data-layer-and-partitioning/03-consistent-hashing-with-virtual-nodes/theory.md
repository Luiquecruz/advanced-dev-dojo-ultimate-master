# Consistent Hashing with Virtual Nodes

Hash sharding spreads keys evenly across machines, until the number of machines changes. With the obvious formula, adding one cache server or one database shard reassigns almost every key, and the cluster spends the next hours moving data or missing its cache. **Consistent hashing** is the placement scheme that keeps most keys where they are when nodes join or leave, and **virtual nodes** are the refinement that keeps it balanced. Dynamo-style stores such as Cassandra, and many distributed caches, place data this way.

You need: Database Replication & Sharding (hash sharding and resharding) and Caching Fundamentals (a miss goes to the database).

## Why `hash(key) % N` breaks

The first idea is to hash the key and take the remainder: with 4 servers, `hash(key) % 4` picks server 0, 1, 2 or 3. Lookups are instant and the spread is even.

Now add a fifth server. Every key is recomputed with `% 5`, and a key stays put only when both remainders happen to match, which is true for about one key in five. Going from 4 to 5 servers moves about **80%** of the keys, not the 20% the new server should take. For a cache, that is a sudden wave of misses that hits the database all at once; for a database, it means copying most of the data while serving traffic. Removing a failed server is just as bad.

## The hash ring

Consistent hashing maps both keys and nodes onto the same circle of hash values, for example the 32-bit range from `0` to `4,294,967,295`, with the largest value wrapping around to `0`.

1. Each node is placed on the ring at `hash(name)`.
2. A key is hashed onto the ring too, and it belongs to the **first node clockwise** from it: the first node whose position is greater than or equal to the key's hash, wrapping to the lowest position when there is none.

```text
           0
     D ●───────● A          key k1 lands between D and A → A
      /         \           key k2 lands between A and B → B
     │   ring    │
      \         /
     C ●───────● B
```

Finding that node is a binary search over the sorted node positions, so lookups stay fast with thousands of positions.

### Adding and removing nodes

When node E joins between D and A, it takes over only the keys between D and E, which used to belong to A. Every other key keeps its owner. On average a new node in a cluster of N takes `1/(N + 1)` of the keys, its fair share, and with one position per node they all come from a single neighbor. When a node leaves, only its keys move, to the next node clockwise.

## Virtual nodes

With one position per node, the arcs between nodes are uneven by chance: with ten nodes at random positions, the largest arc is on average almost three times the fair share and the smallest about a tenth of it. Removal is also lopsided, since a departed node's whole load falls on a single neighbor.

**Virtual nodes** fix both. Each physical node is placed on the ring many times, under labels such as `nodeA#0`, `nodeA#1`, … `nodeA#99`. A key still goes to the first position clockwise, and the position tells you which physical node owns it.

- **Balance**: a hundred small arcs per node average out, so each node owns close to its fair share. The typical deviation shrinks with the square root of the count: about 10% of the fair share with 100 per node.
- **Graceful removal**: a departed node's arcs are scattered around the ring, so its keys spread across many remaining nodes instead of one.
- **Heterogeneous capacity**: a machine with twice the memory gets twice as many virtual nodes, and therefore about twice the keys.

Cassandra calls these positions tokens and lets each node own many of them. The price goes beyond a larger ring to search: in a replicated store, every extra token adds neighbors that share data with the node, so more combinations of node failures make part of the ring unavailable, and per-range maintenance takes longer. That is why Cassandra pairs a modest number of tokens with an allocation algorithm that places them evenly instead of at random.

The hash function matters too. Labels like `nodeA#0` and `nodeA#1` differ in one character, so a hash with weak mixing places them close together and clusters a node's positions. Use a hash that spreads similar inputs over the whole range.

## Replication on the ring

To store each key on several machines, keep walking clockwise past the first owner and take the next **distinct physical nodes**, skipping further virtual nodes of a node already chosen. Dynamo-style stores call the result the key's preference list, and its first entry is the key's main owner. Skipping duplicates matters: two copies on the same physical machine are lost together. Real deployments also skip nodes in the same rack or zone for the same reason.

## Alternatives worth knowing

Consistent hashing is not the only answer. **Rendezvous hashing** scores every node for each key and picks the highest score; **jump consistent hash** maps a key to one of N numbered buckets with almost no memory, but only adds or removes buckets at the end. Some systems avoid hashing nodes entirely: they split the data into many fixed partitions, far more than machines, and keep a small table of which machine owns each partition. Redis Cluster maps every key to one of 16,384 hash slots with `CRC16(key) % 16384`: the modulo is safe because the slot count never changes, and scaling moves whole slots between nodes. All of them aim at the same property: a change in membership moves only the keys that must move.

## Common mistakes

- **Using `hash(key) % N` in a cluster whose size changes.** Every scale-up, scale-down or failure remaps almost every key, which empties caches and forces mass data movement. Use a ring, or a fixed set of partitions assigned to nodes.
- **One position per node.** The arcs are uneven, so some nodes carry several times the load of others. Use many virtual nodes per physical node.
- **Placing replicas on the next ring positions without skipping duplicates**, so two copies end up on the same machine.
- **A hash with poor mixing**, which clusters similar labels and undoes the balance virtual nodes should provide.

## In practice

When you design a cache tier or a partitioned store, say how keys are placed and what happens when a node joins, leaves or fails. With a ring and virtual nodes, the answer is "about 1/N of the keys move, spread across the cluster". Give larger machines more virtual nodes, place replicas on distinct machines in distinct failure zones, and watch per-node key counts to catch an unbalanced ring early.

## Check yourself

1. A cache cluster grows from 9 to 10 servers using `hash(key) % N`. Roughly what fraction of keys changes server, and what would consistent hashing move instead?
2. A node with a single ring position fails. Which node absorbs its load, and how do virtual nodes change that?
3. Why must replica placement skip virtual nodes that belong to a physical node already chosen?
