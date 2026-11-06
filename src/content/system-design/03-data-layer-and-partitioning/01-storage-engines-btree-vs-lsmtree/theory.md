# Storage Engines: B-Trees vs LSM Trees

Two databases can speak the same query language and still behave very differently under load, because of the **storage engine** underneath: the part that decides how rows are laid out on disk, how a write becomes durable and how a read finds its key. Almost every engine you will meet is built on one of two structures, the B-tree or the log-structured merge tree (LSM tree), and each one wins a different workload.

You need: Database Basics: SQL vs NoSQL (access patterns) and Caching Fundamentals (memory is fast, disk is slow).

## B-trees: sorted pages updated in place

A **B-tree** keeps keys sorted in fixed-size **pages** (16 KB by default in InnoDB, 8 KB in PostgreSQL). Inner pages hold keys and pointers to child pages; leaf pages hold the keys with their rows or with pointers to them. The tree is wide and shallow: with hundreds of keys per page, three or four levels cover hundreds of millions of rows, so a lookup reads three or four pages, and the top levels are almost always in memory.

InnoDB stores each table in a B-tree ordered by the primary key (the clustered index), and every secondary index is another B-tree. PostgreSQL keeps rows in a heap and uses B-trees as its default index type.

A write finds the leaf page that owns the key and **changes that page in place**. If the page is full, it splits in two and the parent gets a new pointer. To survive a crash in the middle of that, the change is first appended to a log (the InnoDB redo log, the PostgreSQL write-ahead log) and the page itself is written back later.

The cost hides in the page size. Changing one 100-byte row dirties a whole page, so the engine eventually writes kilobytes for bytes of change: that ratio is **write amplification**. And because keys arriving in random order land in random pages, a write-heavy workload turns into random disk I/O. B-trees shine at reads, range scans and updates of existing rows; they struggle under a firehose of writes to scattered keys.

## LSM trees: append, sort later

An **LSM tree** never updates data in place. A write goes through three steps:

1. Append the change to the **write-ahead log** (WAL; Cassandra calls it the commit log). A sequential append is the cheapest disk write there is, and it makes the write durable: after a crash, replaying the log rebuilds what was in memory.
2. Insert it into the **MemTable**, a sorted structure in memory (a skip list in RocksDB).
3. When the MemTable reaches its size limit, **flush** it to disk as an **SSTable** (sorted string table): an immutable file of key-value pairs sorted by key. A fresh MemTable takes the next writes, and the WAL segment it covered can be discarded.

Every disk write is sequential and done in large batches, which is why LSM engines absorb write rates that would choke a B-tree. RocksDB, Cassandra, ScyllaDB and the storage layers of many distributed databases are built this way.

### Reads, Bloom filters and tombstones

A read must find the newest version of the key, so it checks the MemTable first and then the SSTables **from newest to oldest**, stopping at the first match. A key that does not exist would have to be searched in every file, so SSTables usually carry a **Bloom filter**: a compact bit array that answers "definitely not here" or "maybe here". False positives are possible, false negatives are not, so a "no" skips the file without touching the disk.

Files are immutable, so a delete cannot erase anything. It writes a **tombstone**, a marker that says "this key is deleted". A read that meets the tombstone stops and reports the key as missing, even though older SSTables still hold a value. Deleting only from the MemTable would make the old value reappear.

### Compaction

Without cleanup, SSTables pile up: reads check more files, and overwritten values and tombstones waste disk. **Compaction** merges several SSTables into new ones (a merge of sorted files, like the merge step of merge sort), keeps only the newest version of each key and drops tombstones once no older file can still contain the key.

- **Size-tiered** compaction (the classic Cassandra strategy) merges SSTables of similar size. It writes each byte fewer times but leaves more files for each read to check and can temporarily need much more disk.
- **Leveled** compaction (the RocksDB default) organizes files into levels, each about ten times larger than the previous one, with no overlapping key ranges inside a level except level 0, where fresh flushes land. Below level 0, a read touches at most one file per level and space overhead stays low, at the price of rewriting data more often.

## The three amplifications

Every storage engine trades among three costs:

| Cost | Meaning | B-tree | LSM tree |
| --- | --- | --- | --- |
| Read amplification | disk reads per lookup | low: one path down the tree | higher: several files, softened by Bloom filters |
| Write amplification | bytes written to disk per byte the application writes | high for small random updates | often lower and always sequential, but compaction rewrites data several times |
| Space amplification | disk used per byte of live data | page free space after splits | old versions and tombstones until compacted |

No engine minimizes all three. Choosing one is choosing which cost your workload can afford.

## Common mistakes

- **Choosing a B-tree engine for an append-heavy workload.** Event logs, metrics, chat messages and IoT readings arrive as an endless stream of new keys. A B-tree turns them into random page writes and splits wherever the key does not grow in arrival order, which includes most secondary indexes; an LSM engine turns them into sequential appends.
- **Deleting by removing the key from the MemTable only.** Older SSTables still hold the value, so the key comes back on the next read. A delete is a tombstone.
- **Ignoring tombstones in read paths.** A workload that deletes heavily and then scans ranges reads through thousands of tombstones until compaction removes them, which shows up as slow queries.
- **Treating compaction as free.** It competes with live traffic for disk and CPU, so leave headroom for it.

## In practice

Ask what the workload does most. Mostly reads, range queries and updates of existing rows with transactions: a B-tree engine such as InnoDB or PostgreSQL is the default for good reasons. Massive write rates, append-mostly data and keys that are written once and read rarely: an LSM engine such as RocksDB, Cassandra or ScyllaDB. When you run an LSM store, watch the number of SSTables per read, pending compaction bytes and tombstones per query; they are the early signs of a read path that is degrading.

## Check yourself

1. Why does an LSM tree write a WAL entry before updating the MemTable, and what would a crash lose without it?
2. A key was written, flushed to an SSTable and then deleted. Why must the delete write a tombstone instead of doing nothing?
3. Your service stores a billion sensor readings a day and reads only the last hour of each sensor. Which engine family fits, and which amplification are you accepting?
