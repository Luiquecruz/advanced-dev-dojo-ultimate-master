from dojo_ai import cosine_similarity, count_tokens, create_model, embed

RELEASE_NOTES_BODY = "\n".join([
    "1. List the pull requests merged since the last tag.",
    "2. Group them under Added, Changed and Fixed.",
    "3. Write one customer-facing sentence per change, no internal ticket ids.",
    "4. Link the migration guide when a change breaks an API.",
]) * 6
MIGRATIONS_BODY = "1. One migration per change.\n2. Always write the down step.\n3. Never rename a column in one release: add, backfill, switch, drop."

SKILLS = [
    {"name": "release-notes", "description": "Write customer-facing release notes from merged pull requests. Use when asked for release notes or a changelog.", "triggers": ["release notes", "changelog"], "body": RELEASE_NOTES_BODY},
    {"name": "database-migrations", "description": "Write and review database schema migrations with rollback steps. Use when a change alters tables, columns or indexes.", "triggers": ["migration", "schema"], "body": MIGRATIONS_BODY},
    {"name": "incident-postmortem", "description": "Draft a blameless incident postmortem with timeline, impact and follow-up actions. Use after an outage or incident.", "triggers": ["postmortem", "incident"], "body": "Timeline first, then impact, root causes and actions with owners."},
    {"name": "pdf-forms", "description": "Fill and validate PDF forms with the bundled scripts. Use when a task mentions PDF forms.", "triggers": ["pdf"], "body": "Run scripts/fill.py with the field map."},
]

FILES = [
    {"path": "packages/api/db/AGENTS.md", "content": "Migrations live in db/migrations and run with npm run migrate."},
    {"path": "AGENTS.md", "content": "Run npm test before every commit. TypeScript strict mode."},
    {"path": "packages/apiary/AGENTS.md", "content": "Beekeeping demo app."},
    {"path": "packages/api/AGENTS.md", "content": "Hono routes, Zod at every boundary."},
    {"path": "packages/web/AGENTS.md", "content": "React 19, no class components."},
    {"path": "docs/README.md", "content": "Documentation index."},
    {"path": "docs/AGENTS.md.bak", "content": "Old rules."},
]

BOTH_TASK = "Add a migration for the archived column, then update the changelog and the release notes"


def score(skill, task):
    similarity = cosine_similarity(embed(task), embed(f"{skill['name']} {skill['description']}"))
    return similarity + sum(1 for trigger in skill["triggers"] if trigger.lower() in task.lower())


def context_options(**extra):
    return {"task": BOTH_TASK, "target_path": "packages/api/db/migrations/0042_archived.sql", "files": FILES, "skills": SKILLS, "budget_tokens": 2000, **extra}


@test("parse_skill reads the frontmatter and body of a SKILL.md and enforces the Agent Skills naming rules")
async def _():
    skill = mod.parse_skill("---\nname: release-notes\ndescription: Write release notes. Use for changelogs.\ntriggers: release notes,  changelog , \nlicense: MIT\n---\n\n# Release notes\n1. List merged PRs.\n", "release-notes")
    assert skill == {"name": "release-notes", "description": "Write release notes. Use for changelogs.", "triggers": ["release notes", "changelog"], "body": "# Release notes\n1. List merged PRs."}
    without_triggers = mod.parse_skill("---\nname: pdf2\ndescription: PDF forms.\n---\nBody")
    assert without_triggers["triggers"] == []
    invalid = [
        "# No frontmatter\nname: x",
        "---\nname: never-closed\ndescription: x",
        "---\nname: Release-Notes\ndescription: x\n---\n",
        "---\nname: -notes\ndescription: x\n---\n",
        "---\nname: notes-\ndescription: x\n---\n",
        "---\nname: release--notes\ndescription: x\n---\n",
        f"---\nname: {'a' * 65}\ndescription: x\n---\n",
        "---\nname: release-notes\n---\n",
        f"---\nname: release-notes\ndescription: {'x' * 1025}\n---\n",
    ]
    for markdown in invalid:
        error = await capture_error(lambda: mod.parse_skill(markdown))
        assert isinstance(error, mod.SkillError), markdown
    longest = mod.parse_skill(f"---\nname: {'a' * 64}\ndescription: ok\n---\n")
    assert len(longest["name"]) == 64
    mismatch = await capture_error(lambda: mod.parse_skill("---\nname: release-notes\ndescription: x\n---\n", "changelog"))
    assert isinstance(mismatch, mod.SkillError)


@test("context_files_for returns the AGENTS.md files of the root and every ancestor folder of the edited file, root first")
def _():
    def paths(target):
        return [file["path"] for file in mod.context_files_for(FILES, target)]

    assert paths("packages/api/db/migrations/0042_archived.sql") == ["AGENTS.md", "packages/api/AGENTS.md", "packages/api/db/AGENTS.md"]
    assert paths("packages/api/src/routes.ts") == ["AGENTS.md", "packages/api/AGENTS.md"]
    assert paths("packages/apiary/hive.ts") == ["AGENTS.md", "packages/apiary/AGENTS.md"]
    assert paths("README.md") == ["AGENTS.md"]
    assert paths("docs/guide.md") == ["AGENTS.md"]
    web = mod.context_files_for(FILES, "packages/web/App.tsx")
    assert web[1] == FILES[4]


@test("score_skill adds the embedding similarity of the task and the skill metadata to the number of triggers found in the task")
def _():
    tasks = [BOTH_TASK, "Draft the POSTMORTEM for the checkout incident", "Fix the typo in the login button label", "Fill the PDF form for the audit"]
    for task in tasks:
        for skill in SKILLS:
            expected_score = score(skill, task)
            assert mod.score_skill(skill, task) == approx(expected_score, abs=1e-9)
    postmortem_score = mod.score_skill(SKILLS[2], "Draft the POSTMORTEM for the checkout incident")
    assert postmortem_score > 2


@test("build_agent_context puts the context files first, then a metadata-only skill index, then the relevant skills")
def _():
    context = mod.build_agent_context(**context_options(task="Write the release notes for version 2.4 from the merged pull requests"))
    assert [f"{section['kind']}:{section['name']}" for section in context["sections"]] == [
        "context-file:AGENTS.md",
        "context-file:packages/api/AGENTS.md",
        "context-file:packages/api/db/AGENTS.md",
        "skill-index:skills",
        "skill:release-notes",
    ]
    assert context["loaded"] == ["release-notes"]
    index = context["sections"][3]["text"]
    for skill in SKILLS:
        assert skill["name"] in index
        assert skill["description"] in index
    assert MIGRATIONS_BODY.split("\n")[1] not in index
    assert "Run npm test before every commit." in context["sections"][0]["text"]
    assert "Group them under Added, Changed and Fixed." in context["sections"][4]["text"]
    assert context["system"] == "\n\n".join(section["text"] for section in context["sections"])
    for section in context["sections"]:
        assert section["tokens"] == count_tokens(section["text"])
    assert context["tokens"] == sum(section["tokens"] for section in context["sections"])
    assert MIGRATIONS_BODY not in context["system"]

    unrelated = mod.build_agent_context(**context_options(task="Fix the typo in the login button label", target_path="packages/web/Login.tsx"))
    assert unrelated["loaded"] == []
    assert all(skipped["reason"] == "below_threshold" for skipped in unrelated["skipped"])
    assert len(unrelated["skipped"]) == 4


@test("build_agent_context ranks skills by score, skips the ones below min_score, over the limit or over the token budget, and never drops always-on context")
async def _():
    ranked = sorted(SKILLS, key=lambda skill: -score(skill, BOTH_TASK))
    assert [skill["name"] for skill in ranked[:2]] == ["release-notes", "database-migrations"]
    below_threshold = sorted(skill["name"] for skill in SKILLS if score(skill, BOTH_TASK) < 0.5)

    roomy = mod.build_agent_context(**context_options())
    assert roomy["loaded"] == ["release-notes", "database-migrations"]
    assert sorted(skipped["name"] for skipped in roomy["skipped"]) == below_threshold

    always_on = sum(section["tokens"] for section in roomy["sections"] if section["kind"] != "skill")
    migrations_tokens = count_tokens(f"# Skill: database-migrations\n{MIGRATIONS_BODY}")
    tight = mod.build_agent_context(**context_options(budget_tokens=always_on + migrations_tokens))
    assert tight["loaded"] == ["database-migrations"]
    assert {"name": "release-notes", "reason": "over_budget"} in tight["skipped"]
    assert tight["tokens"] <= always_on + migrations_tokens

    limited = mod.build_agent_context(**context_options(max_skills=1))
    assert limited["loaded"] == ["release-notes"]
    assert {"name": "database-migrations", "reason": "limit"} in limited["skipped"]

    strict = mod.build_agent_context(**context_options(min_score=3))
    assert strict["loaded"] == []

    error = await capture_error(lambda: mod.build_agent_context(**context_options(budget_tokens=always_on - 1)))
    assert isinstance(error, mod.ContextBudgetError)


@test("answer_with_skills offers a load_skill tool and loads skills on demand: known, unknown, already loaded and over budget")
async def _():
    fake_model.reply(
        respond.tool_calls([
            {"name": "load_skill", "arguments": {"name": "pdf-forms"}},
            {"name": "load_skill", "arguments": {"name": "release-notes"}},
            {"name": "load_skill", "arguments": {"name": "cooking"}},
        ]),
        respond.tool_call("deploy", {"environment": "production"}),
        respond.text("Here is the plan."),
    )
    release_task = "Write the release notes for version 2.4 from the merged pull requests"
    result = await mod.answer_with_skills(create_model(), **context_options(task=release_task))
    assert result["answer"] == "Here is the plan."
    assert result["steps"] == 3
    assert result["loaded"] == ["release-notes", "pdf-forms"]
    first = fake_model.requests[0]
    assert [tool["name"] for tool in first["tools"]] == ["load_skill"]
    assert first["messages"][0]["role"] == "system"
    assert "Run npm test before every commit." in first["messages"][0]["content"]
    assert first["messages"][1] == {"role": "user", "content": release_task}
    tool_messages = [message for message in fake_model.requests[1]["messages"] if message["role"] == "tool"]
    assert len(tool_messages) == 3
    assert "Run scripts/fill.py" in tool_messages[0]["content"]
    assert "already loaded" in tool_messages[1]["content"]
    assert "Unknown skill" in tool_messages[2]["content"]
    assert len(fake_model.requests[1]["messages"][-4]["toolCalls"]) == 3
    assert [message["toolCallId"] for message in tool_messages] == [call["id"] for call in fake_model.responses[0]["toolCalls"]]
    assert "Unknown tool" in fake_model.requests[2]["messages"][-1]["content"]
    expected_tokens = mod.build_agent_context(**context_options(task=release_task))["tokens"] + count_tokens("# Skill: pdf-forms\nRun scripts/fill.py with the field map.")
    assert result["tokens"] == expected_tokens

    typo_task = "Fix the typo in the login button label"
    always_on = mod.build_agent_context(**context_options(task=typo_task))["tokens"]
    fake_model.reset().reply(respond.tool_call("load_skill", {"name": "release-notes"}), respond.text("Done without it."))
    tight = await mod.answer_with_skills(create_model(), **context_options(task=typo_task, budget_tokens=always_on + 20))
    assert tight["loaded"] == []
    assert "budget" in fake_model.requests[1]["messages"][-1]["content"]


@test("answer_with_skills returns whatever path the model takes and stops after max_steps without an answer")
async def _():
    def behavior(request, context):
        if any(message["role"] == "tool" for message in request["messages"]):
            return respond.text(["Migration written with a down step.", "Done: see the migration."])
        return context.pick([respond.tool_call("load_skill", {"name": "incident-postmortem"}), respond.text("Nothing to load.")])

    async def scenario():
        fake_model.handle(behavior)
        result = await mod.answer_with_skills(create_model(), **context_options(task="Add a migration for the archived column"))
        assert isinstance(result["answer"], str)
        assert result["loaded"][0] == "database-migrations"
        assert result["steps"] == len(fake_model.requests)
        assert ("incident-postmortem" in result["loaded"]) == (len(fake_model.requests) == 2)

    await for_each_seed(16, scenario)
    fake_model.reset().handle(lambda request, context: respond.tool_call("load_skill", {"name": "pdf-forms"}))
    looping = await mod.answer_with_skills(create_model(), **context_options(max_steps=3))
    assert looping["answer"] is None
    assert looping["steps"] == 3
    assert len(fake_model.requests) == 3
