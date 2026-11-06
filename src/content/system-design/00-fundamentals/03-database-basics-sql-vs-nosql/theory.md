# Database Basics: SQL vs NoSQL

Once servers are stateless, the state has to live somewhere durable, and that is the database. "SQL or NoSQL?" is one of the first questions in any design, and the useful answer is never a brand name. This lesson explains what a relational database gives you, what the main NoSQL families give up in exchange, and how the queries your application runs decide between them.

You need: Statelessness & Sessions.

## Relational databases

A **relational database** (PostgreSQL, MySQL) stores data in **tables** with a fixed **schema**: every row of `orders` has the same columns, each with a type. A **primary key** identifies a row, and a **foreign key** points to a row in another table (`orders.user_id → users.id`). You ask questions in **SQL**, and a **join** combines tables at read time:

```sql
SELECT users.name, orders.total
FROM orders
JOIN users ON users.id = orders.user_id
WHERE orders.created_at > now() - interval '1 day';
```

The other strength is **transactions** with **ACID** guarantees:

- **Atomicity**: all statements of the transaction happen, or none does. Moving money debits one account and credits another, never only one of them.
- **Consistency**: constraints (types, foreign keys, `CHECK balance >= 0`) hold after every transaction.
- **Isolation**: concurrent transactions do not see each other's half-finished work.
- **Durability**: once committed, the data survives a crash.

## Normalization and denormalization

A **normalized** schema stores each fact once: the user's name lives only in `users`, and orders refer to it by id. Updates touch one row and nothing can disagree, but reads need joins.

A **denormalized** design copies data where it is read: each order stores the user's name next to the total. Reads become one lookup, but a name change must now update every copy, and copies that were missed go stale. Denormalization is a trade you make for a read pattern, not a default.

## NoSQL families

"NoSQL" groups databases that drop the relational model to make one kind of access cheap or easy to spread over many machines:

| Family | Model | Typical use | Examples |
| --- | --- | --- | --- |
| Document | JSON-like documents, nested fields, flexible shape | a profile or a product page read as one unit | MongoDB |
| Key-value | a value looked up by its key; questions that do not start from the key are slow or unsupported | sessions, carts, caches | Redis, DynamoDB |
| Wide-column | rows grouped in partitions by a key, sorted inside the partition | huge write volumes read by key and range, such as messages per channel | Cassandra, ScyllaDB |

Most of them avoid joins, and many limit transactions to a single key or document, although several also offer transactions across documents. In exchange, they scale writes by splitting data across machines by key, which is natural when every query names its key.

## Choose by access pattern

An **access pattern** is a query the application runs, with its frequency: "show the last 50 messages of a channel, thousands of times per second" or "monthly revenue per country, once a day". Write the list first, then pick the store that answers the frequent ones cheaply:

- Many relations, ad hoc questions, money or inventory that must stay correct: relational.
- One entity always read whole, with a shape that changes often: document.
- Lookup by a single id at very high rate: key-value.
- Enormous append-heavy streams read by partition key and time: wide-column.

Plenty of systems use more than one: PostgreSQL for orders, Redis for sessions. A relational database also covers far more scale than most products ever reach.

## Common mistakes

- **Choosing a database before the access pattern.** "We use MongoDB because it scales" says nothing about the queries; a store that cannot answer the frequent query cheaply forces slow scans or a second copy of the data.
- **Believing NoSQL is always faster.** A key lookup is fast in any database with an index; the difference is which queries become hard.
- **Denormalizing without an update plan.** Every copy of a fact needs a path to change it, or the copies drift apart.
- **Skipping transactions for money.** Two separate writes that must both happen belong in one ACID transaction.

## In practice

Start a design by listing the top five queries and writes with rough rates, then sketch the tables or documents that serve them. Default to a relational database when the data is relational and the scale is unknown; move a specific access pattern to a specialized store when measurements show the need.

## Check yourself

1. Which ACID property guarantees that a transfer never debits one account without crediting the other?
2. Each order copies the customer's name. What must happen when a customer changes the name?
3. A chat app reads "the latest 50 messages of a channel" constantly and rarely anything else. Which family fits, and why?
