# A2A, Agent Skills and Context Files

MCP standardizes how an agent reaches **tools and data**. Three other open formats complete the picture: **A2A** for how agents reach **other agents**, **Agent Skills** for packaging **procedural knowledge** an agent loads when needed, and **AGENTS.md** for the **project context** a coding agent reads before it touches a repository. They solve different problems and are often used together.

## A2A: agents delegating to agents

A tool is a function with a schema: you know what it does and it returns quickly. Another organization's agent is different: it is **opaque** (you do not see its tools, memory or model), it may take minutes or days, it may need to ask you questions, and it produces documents rather than a return value. The **Agent2Agent protocol (A2A)** models exactly that.

- **Agent Card**: a JSON document, usually served at `/.well-known/agent-card.json`, describing the agent: name, provider, the **skills** it offers, its endpoints and protocol bindings, capabilities (streaming, push notifications) and the security schemes it requires. Cards can be signed so clients can verify who published them.
- **Message**: one turn from the client (`user` role) or the remote agent (`agent` role), made of **parts** (text, files, structured data).
- **Task**: the unit of work, with an id and a lifecycle: *submitted*, *working*, *input-required* or *auth-required* (interrupted, waiting for the client), and the terminal states *completed*, *failed*, *canceled* and *rejected*.
- **Artifact**: the output of a task (a report, an image, structured data), also made of parts.

A client sends a message (`SendMessage`), gets a task back, and follows it by polling (`GetTask`), streaming (`SendStreamingMessage`, `SubscribeToTask`) or webhook **push notifications** for long jobs. The same operations are defined over JSON-RPC, gRPC and HTTP+JSON bindings.

The usual split: **MCP connects an agent to its tools; A2A connects an agent to peers it delegates to.** A travel agent calls a flight-search *tool* over MCP, but delegates "handle the lost-luggage claim" to the airline's claims *agent* over A2A. If you control both sides and the work is a quick function call, a tool is simpler; A2A pays off across organizational boundaries and for long, stateful work.

## Agent Skills: knowledge loaded on demand

Agents need procedures ("how we write release notes", "how to fill this PDF form") that are too long to keep in every prompt. An **Agent Skill** is a folder with a `SKILL.md` file: YAML frontmatter with a `name` (lowercase letters, digits and hyphens, at most 64 characters, matching the folder) and a `description` of what it does and when to use it, followed by Markdown instructions. Optional `scripts/`, `references/` and `assets/` folders hold code and documents.

```markdown
---
name: release-notes
description: Write customer-facing release notes from merged pull requests. Use when asked for release notes or a changelog.
---
1. List merged PRs since the last tag ...
```

Skills rely on **progressive disclosure**: at startup the agent sees only each skill's name and description (around 100 tokens); it reads the full `SKILL.md` (recommended under about 5 000 tokens) only when a task matches, and opens bundled files only when the instructions point to them. Hundreds of skills cost little until used, which is the same idea as on-demand tool loading. Skills can include scripts the agent executes, so they are code: review them, and install them only from sources you trust.

## AGENTS.md: context files for coding agents

Coding agents read a Markdown file at the root of a repository before working: build and test commands, code style, architecture rules, things never to do. **AGENTS.md** is the vendor-neutral name for that file, a "README for agents". In a monorepo, nested files apply to their subtree, and the **nearest file to the edited code wins**; explicit instructions in the chat override them. Several tools also read their own file names (such as `CLAUDE.md`), so teams often keep one source and point the others to it.

Good context files are short and specific: commands that actually run, conventions a linter cannot enforce, pointers to deeper docs. Long, generic files waste context on every session and get ignored.

## The Agentic AI Foundation

The **Agentic AI Foundation (AAIF)** was announced by the Linux Foundation on 9 December 2025 to give these open standards vendor-neutral governance. It started with MCP (from Anthropic), goose (Block's open-source agent) and AGENTS.md (from OpenAI) and has since grown.

> **Status as of October 2026:** the AAIF hosts ten projects. agentgateway joined in June 2026; A2A, launched by Google in April 2025 and donated to the Linux Foundation the same year, reached its first stable specification (1.0) in March 2026 and joined the AAIF on 17 August 2026. On 22 October 2026 the AAIF added Agent Skills (donated by Anthropic, which published the format in October 2025 and opened it as a standard at agentskills.io in December 2025), Open Responses (OpenAI), OpenEnv (Hugging Face) and OpenSandbox (Alibaba). AGENTS.md reports use in over 60 000 open-source projects. Governance and versions move quickly: check the project sites before relying on these details.

## When to choose it

Use **A2A** when you delegate long-running or open-ended work to an agent you do not control, especially across companies; use MCP or plain function calling when you only need a capability with a clear input and output. Use **Agent Skills** when agents need procedures that are too long or too numerous to keep in every prompt. Add an **AGENTS.md** to every repository where coding agents work: it is the cheapest harness improvement there is (module 08).
