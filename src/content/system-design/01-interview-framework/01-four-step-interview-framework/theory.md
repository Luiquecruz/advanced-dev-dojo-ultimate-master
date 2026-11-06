# The Four-Step System Design Framework

A system design discussion, in an interview or in a design review at work, starts with a vague prompt ("design a URL shortener") and a fixed amount of time. Without a method, people jump to drawing databases and spend the session on the wrong problem. This lesson gives you a four-step structure that keeps the conversation on the requirements, makes your decisions visible and leaves time to discuss what can go wrong.

You need: Client-Server Architecture & HTTP Basics, Statelessness & Sessions, Database Basics: SQL vs NoSQL, Load Balancing Basics and Caching Fundamentals (the building blocks you will place on the board, or equivalent experience).

## Why a framework

A design question has no single correct answer. What the interviewer or the reviewing team evaluates is how you get to an answer: whether you ask before assuming, whether your design follows from the requirements, and whether you can explain what each choice costs. A fixed sequence of steps protects you from the two classic failures: designing the wrong system, and running out of time before reaching the interesting part.

The four steps are:

1. Understand the problem and establish the scope.
2. Propose a high-level design and get buy-in.
3. Design deep dive.
4. Wrap up.

## Step 1: understand the problem and establish scope

Ask questions until you can write down what the system must do and how well it must do it.

- **Functional requirements** are the features: "users can shorten a URL", "visiting the short URL redirects to the original". Agree on the few that matter and say out loud which ones you leave out (analytics, custom aliases, user accounts).
- **Non-functional requirements** are the qualities: availability, latency, consistency (does every reader see the latest write?), durability, security. "A new short link must redirect everywhere the moment it is created" is a different system from "a new link may take a few seconds to start working".
- **Scale numbers** turn adjectives into targets: how many daily active users, how many requests per user, the read/write ratio, how long data is kept. The next lesson turns these numbers into requests per second and storage.

Good clarifying questions are specific: "Is this read-heavy? Roughly how many new URLs per day? Do short links ever expire? Mobile, web or both?" Write the answers in a corner of the board; every later decision should point back to one of them.

## Step 2: propose a high-level design and get buy-in

Sketch the main boxes and arrows: clients, a load balancer, a stateless web tier, a database, a cache. Define the API (`POST /urls`, `GET /<code>`) and the core data model. Walk through one request end to end.

Then stop and check: "Does this cover what you had in mind before I go deeper?" This **buy-in** is the point of the step. The interviewer may redirect you to the part they care about, and in a real review a colleague may spot a missing requirement before you have spent an hour on details.

## Step 3: design deep dive

Pick the two or three components that carry the hard problems and design them properly: how short codes are generated without collisions, how the database is indexed for the lookup, what the cache holds and for how long. Let the requirements choose the focus: a read-heavy system deserves time on caching, a write-heavy one on storage and on splitting data across machines.

## Step 4: wrap up

Use the last minutes to look at your design critically:

- **Bottlenecks**: which component saturates first when traffic grows ten times?
- **Failure modes**: what happens when the cache, a database node or a whole data center is gone?
- **Next steps**: monitoring, what you would build at the next order of magnitude, and what you deliberately left out.

## Budgeting 45 minutes

A typical split of a 45-minute session:

| Step | Time |
| --- | --- |
| Understand the problem and establish scope | 5–10 minutes |
| High-level design and buy-in | 10–15 minutes |
| Deep dive | 10–25 minutes |
| Wrap up | 3–5 minutes |

The ranges add up to more than 45 minutes on purpose: time saved on a simple prompt with sharp requirements goes to the deep dive. Glance at the clock at each step boundary.

## Communicating trade-offs

Every design choice has a cost, and naming it is part of the answer. Use the pattern **option, benefit, cost, choice**: "A relational database gives us transactions and simple queries; it is harder to scale writes. Our write rate is low, so I pick it and note sharding (splitting the data across several databases by key) as a later option." Comparing two options against a stated requirement shows judgment; listing technologies without a reason does not.

## Common mistakes

- **Skipping requirements clarification.** Drawing boxes in the first minute means designing for assumptions nobody agreed on: you may build a global, strongly consistent system for a prompt that only needed a single region, and you have no numbers to justify any choice.
- **Going deep too early.** Designing the cache eviction policy before the high-level design exists leaves no time for the whole picture and no buy-in.
- **Presenting choices without trade-offs.** "We use NoSQL" without the reason and the cost sounds like a guess.
- **Ignoring the wrap-up.** Ending without bottlenecks and failure modes hides whether you understand what you built.

## In practice

Treat the four steps as a checklist on the corner of the board: requirements and numbers, boxes and API, two deep dives, bottlenecks and failures. The same structure works for a design document at work: a requirements section, a proposal reviewed early, detailed design for the risky parts, and a section on risks and open questions.

## Check yourself

1. Give two functional and two non-functional requirements for a photo-sharing app.
2. Why do you ask for buy-in after the high-level design instead of after the deep dive?
3. You have 12 minutes left and have not discussed failures. What do you do?
