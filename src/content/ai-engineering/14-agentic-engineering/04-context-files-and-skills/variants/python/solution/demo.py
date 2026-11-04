import asyncio

from dojo_ai import create_model
from dojo_ai.testing import fake_model, respond

from main import answer_with_skills, build_agent_context, parse_skill

SKILL_FILES = {
    "release-notes": """---
name: release-notes
description: Write customer-facing release notes from merged pull requests. Use when asked for release notes or a changelog.
triggers: release notes, changelog
---
1. List the pull requests merged since the last tag.
2. Group them under Added, Changed and Fixed.
3. One customer-facing sentence per change.""",
    "database-migrations": """---
name: database-migrations
description: Write and review database schema migrations with rollback steps. Use when a change alters tables, columns or indexes.
triggers: migration, schema
---
1. One migration per change.
2. Always write the down step.
3. Never rename a column in one release: add, backfill, switch, drop.""",
    "incident-postmortem": """---
name: incident-postmortem
description: Draft a blameless incident postmortem with timeline, impact and follow-up actions. Use after an outage or incident.
triggers: postmortem, incident
---
Timeline first, then impact, root causes and actions with owners.""",
}

FILES = [
    {"path": "AGENTS.md", "content": "Run npm test before every commit. TypeScript strict mode."},
    {"path": "packages/api/AGENTS.md", "content": "Hono routes, Zod at every boundary."},
    {"path": "packages/web/AGENTS.md", "content": "React 19, no class components."},
]


async def main():
    skills = [parse_skill(markdown, folder) for folder, markdown in SKILL_FILES.items()]
    tasks = [
        ("Add a migration that archives old orders", "packages/api/db/0042_archive.sql"),
        ("Fix the typo in the login button label", "packages/web/Login.tsx"),
        ("Draft the postmortem for last night's checkout incident and add a changelog entry", "docs/incidents/2026-10-30.md"),
    ]
    for task, target_path in tasks:
        context = build_agent_context(task=task, target_path=target_path, files=FILES, skills=skills, budget_tokens=400)
        print(f"Task: {task}")
        print(f"  context files: {', '.join(section['name'] for section in context['sections'] if section['kind'] == 'context-file')}")
        print(f"  skills loaded up front: {', '.join(context['loaded']) or 'none'} ({context['tokens']} of 400 tokens)")
        skipped = ", ".join(f"{entry['name']} ({entry['reason']})" for entry in context["skipped"])
        print(f"  skipped: {skipped or 'none'}")

    fake_model.reply(
        respond.tool_calls([{"name": "load_skill", "arguments": {"name": "release-notes"}}, {"name": "load_skill", "arguments": {"name": "security-review"}}]),
        respond.text('Typo fixed in Login.tsx; release note: "Fixed a typo on the login button."'),
    )
    result = await answer_with_skills(
        create_model(),
        task="Fix the typo in the login button label and note it for the next release",
        target_path="packages/web/Login.tsx",
        files=FILES,
        skills=skills,
        budget_tokens=400,
    )
    tool_replies = [message["content"].split("\n")[0] for message in fake_model.requests[1]["messages"] if message["role"] == "tool"]
    print("\nOn-demand loading during a run")
    print(f"  tool replies: {' | '.join(tool_replies)}")
    print(f"  loaded: {', '.join(result['loaded'])} after {result['steps']} model calls, {result['tokens']} tokens of context")
    print(f"  answer: {result['answer']}")


if __name__ == "__main__":
    asyncio.run(main())
