# Memory Types

"Give the agent memory" is not one feature. A support assistant that recalls your last ticket, a coding agent that knows the project's conventions, and a tutor that tracks which exercises you failed all "remember", but they store different things, write them at different moments and read them for different reasons. A shared vocabulary helps you decide which memory you actually need.

## Working memory vs everything else

The model itself is stateless. Within one call, everything it can use is in the **context window**: that is its **working memory**. Anything that must survive the call (the next turn, tomorrow's session) lives outside the model, in a store your code writes to and reads from. Every memory design is therefore a loop:

1. **Read**: choose what to load into the context for this call.
2. **Act**: the model reasons and answers with that context.
3. **Write**: decide what from this call is worth keeping.

The context window is small, expensive and degrades when stuffed; the stores outside are large and cheap but only useful if the right piece is loaded at the right time.

## The CoALA vocabulary

The **Cognitive Architectures for Language Agents** framework (CoALA; Sumers, Yao, Narasimhan and Griffiths, published in TMLR in 2024) borrows from cognitive science to describe language agents with four kinds of memory:

| Memory | What it holds | Engineering examples |
| --- | --- | --- |
| **Working** | the active information for the current decision cycle | the messages and variables of the current call: system prompt, recent turns, retrieved items, tool results |
| **Episodic** | experience from earlier decision cycles: what happened | conversation logs, past tickets, agent trajectories, examples of earlier successes and failures |
| **Semantic** | knowledge about the world and the agent itself: facts | user profile facts ("allergic to peanuts"), a knowledge base, a knowledge graph |
| **Procedural** | how to do things | implicit in the model's weights; explicit in the agent's code, prompts, tool definitions, skills and rules files |

CoALA also names the actions that move information between them. **Retrieval** reads from long-term memory into working memory. **Learning** writes to long-term memory. **Reasoning** reads and writes working memory (thinking, summarizing). **Grounding** acts on the outside world and brings observations back as text. A decision cycle plans with reasoning and retrieval (propose, evaluate and select an action), then executes it.

The framework is a vocabulary, not a library. Its value is in the questions it makes you ask: which of the four does this feature need, how is each written, and how is each read?

## How the types map to designs

- **Working memory** is context engineering (module 02): budgets, ordering and compression. Conversation memory, the next lesson, manages its oldest part.
- **Episodic memory** is often a log plus retrieval: store events with timestamps, retrieve similar past situations ("last time this customer called about billing..."). Raw logs are cheap to write but noisy to read; many systems extract episodes or reflections from them.
- **Semantic memory** is usually extracted statements: short facts with metadata in a vector store, a profile document, or a temporal graph when facts change over time (lesson 05).
- **Procedural memory** is the most powerful and the most dangerous to learn automatically. Updating a prompt, a rules file or a skill changes how the agent behaves in every future session. Many teams let agents *propose* procedural changes and keep a human or a test suite in the loop before they are accepted.

## Writing: hot path or background

Memory can be written **in the hot path**, during the reply (the agent calls a "save memory" tool; immediate and visible, but adds latency and distracts the agent), or **in the background**, by a separate job after the conversation (no latency and better extraction, but other sessions see the memory later). The read side has the same choice: load a fixed profile on every call, or let the agent search memory as a tool when it decides it needs it.

## Common implementations

- **Self-editing memory blocks.** MemGPT, now Letta, treats the context like an operating system's main memory: a few labeled blocks (the user, the agent's persona) stay in context and the agent edits them through tools, while older material is paged out to searchable storage.
- **Extracted memories with deduplication.** Mem0 extracts candidate facts and lets a model decide whether to add, update, delete or ignore each one against similar existing memories.
- **Temporal knowledge graphs.** Zep and Graphiti store facts as edges with validity time.
- **Files.** A memory directory or progress file the agent reads and writes; simple, inspectable and surprisingly competitive.

> **Status as of October 2026:** Letta, Mem0, Zep and LangGraph's memory store (with LangMem) are widely used memory layers; some model APIs ship a client-side memory tool backed by files you control (for example Anthropic's memory tool), and consumer assistants expose user-visible memory. Benchmarks such as LoCoMo and LongMemEval are used to compare them, and results are still contested.

## When to choose it

Name the memory types before choosing a tool. If users only need continuity within a session, you need working memory management, not a memory product. Add semantic memory when facts about users or the domain must persist, episodic memory when past situations should inform new ones, and procedural memory updates only with review and tests. Prefer the simplest store that answers your real questions, and keep in mind that every type you add is also data to secure, expire and delete.
