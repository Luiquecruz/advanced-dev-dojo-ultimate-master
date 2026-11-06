# Back-of-the-Envelope Estimation

"Ten million daily users" does not tell you how many servers, how much disk or which database you need. A back-of-the-envelope estimate converts the scale numbers from the first step of the framework into requests per second, storage and bandwidth, using round numbers you can multiply in your head. The goal is the right order of magnitude, fast: is this one server or a thousand, gigabytes or petabytes?

You need: The Four-Step System Design Framework (scale numbers come from step 1) and Caching Fundamentals (latency tiers).

## From daily users to requests per second

Traffic is usually given per day, but servers are sized per second. The conversion has two parts:

```text
requests per day = daily active users (DAU) × requests per user per day
average QPS      = requests per day ÷ 86,400
```

**QPS** means queries (requests) per second. A day has 24 × 60 × 60 = **86,400 seconds**. For mental math, round it to 100,000: the result is about 14% low, which is acceptable at the order-of-magnitude level, as long as you know which way you rounded. A useful anchor: 1 million requests per day is about 12 requests per second.

Example: 10,000,000 DAU × 10 requests each = 100,000,000 requests per day. 100,000,000 ÷ 86,400 ≈ 1,157, so about 1,200 QPS on average.

## Peak traffic

Traffic is not flat: people use apps in the evening, during events, after a notification. Systems are sized for the **peak**, not the average. Without measurements, a peak factor of 2 to 3 times the average is a common assumption; a ticket sale or a live event can be much spikier. With a factor of 2, the example needs about 2,300 QPS at peak.

## Reads and writes

Most systems are read-heavy: a post is written once and read many times. The **read/write ratio** decides where effort goes. With 10% writes, the example has 10,000,000 writes per day, about 116 write QPS, and about 1,040 read QPS on average. Reads can be absorbed by caches and by replicas (read-only copies of the database that follow the primary, the copy that accepts writes); writes must reach the primary, so write QPS usually decides the database design.

## Storage

Storage grows with every write you keep:

```text
storage = writes per day × bytes per write × retention days × replication factor
```

At 1 KB per write, 10,000,000 writes are 10 GB per day. Kept for five years (1,825 days) that is about 18 TB, and with three replicas about 55 TB. The **replication factor** is easy to forget and multiplies everything; so do indexes, backups and metadata, which you can cover with a safety margin.

## Bandwidth

Bandwidth is bytes per second in each direction. Incoming: 10 GB of writes per day ÷ 86,400 ≈ 116 KB/s. Outgoing: 90,000,000 reads × 1 KB ≈ 90 GB per day, about 1 MB/s on average and about 2 MB/s at peak. For media such as images or video, bandwidth usually dominates and points you to a content delivery network (CDN: cache servers near the users that serve copies of static files).

## Powers of two and units

| Power | Approximate value | Unit |
| --- | --- | --- |
| 2^10 | 1 thousand | KB |
| 2^20 | 1 million | MB |
| 2^30 | 1 billion | GB |
| 2^40 | 1 trillion | TB |
| 2^50 | 1 quadrillion | PB |

Strictly, 2^10 = 1,024 bytes is a kibibyte (KiB) and a kilobyte (KB) is 1,000 bytes. The difference is 2.4% per step, irrelevant for estimates: pick one convention, say which, and use it consistently.

## Latency numbers every programmer should know

A list popularized by Jeff Dean's talks on large distributed systems gives orders of magnitude to reason about. Newer hardware keeps shifting the exact values; what you reason with is the order of the rows and the rough gaps between them:

| Operation | Approximate latency |
| --- | --- |
| Main memory reference | ~100 ns |
| SSD random read | ~tens to 100 µs |
| Round trip within a data center | ~0.5 ms |
| Disk (HDD) seek | ~10 ms |
| Packet round trip across continents | ~150 ms |

Consequences: a memory reference is hundreds to a thousand times faster than an SSD read, which is why caches pay off; a request that makes 20 sequential calls inside a data center already spends about 10 ms on the network; and a user on another continent pays about 150 ms per round trip, which is why systems serve users from nearby regions.

## Rounding for estimation

Round early and visibly: 86,400 becomes 100,000, 1,157 becomes 1,200, 2.4 becomes 2 or 3. Write each intermediate result on the board so the interviewer can follow and correct an assumption. Precision beyond one or two significant digits wastes time and suggests a certainty you do not have.

## Common mistakes

- **DAU to QPS conversion errors.** Dividing by 3,600 (seconds in an hour) or 1,440 (minutes in a day) instead of 86,400 inflates QPS by 24 or 60 times; forgetting the requests per user shrinks it by that factor. Write the units next to each number.
- **Sizing for the average.** Servers saturate at the peak; multiply by a peak factor.
- **Forgetting replication and retention.** Raw daily storage looks tiny until you multiply by years and copies.
- **False precision.** Answering "1,157.4 QPS" instead of "about 1,200" spends time on digits that the assumptions cannot support.

## In practice

State assumptions, convert per day to per second, size for the peak, then let the numbers drive the design: 50 write QPS is trivial for one database, 50,000 is near or past what one machine sustains; 10 GB fits in memory on one machine, 50 TB does not. The challenge turns these formulas into a small estimator with fixed rounding, so the same input always gives the same answer.

## Check yourself

1. 5,000,000 DAU each make 40 requests per day. What is the average QPS, and the peak QPS with a factor of 3?
2. Why does write QPS usually influence the database design more than read QPS?
3. A design keeps 2 KB per write, 1,000,000 writes per day, for one year with three replicas. Roughly how much storage is that?
