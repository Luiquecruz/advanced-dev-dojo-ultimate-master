import json
import re

from dojo_ai import cosine_similarity, count_tokens, embed

LOAD_SKILL_TOOL = {
    "name": "load_skill",
    "description": "Load the full instructions of one skill from the skill index, by name.",
    "parameters": {"type": "object", "properties": {"name": {"type": "string"}}, "required": ["name"]},
}

SKILL_NAME = re.compile(r"[a-z0-9]+(-[a-z0-9]+)*")


class SkillError(Exception):
    """A SKILL.md file that breaks the Agent Skills format."""


class ContextBudgetError(Exception):
    """Always-on context that does not fit the token budget."""


def parse_skill(markdown, folder_name=None):
    lines = markdown.replace("\r\n", "\n").split("\n")
    if lines[0].strip() != "---":
        raise SkillError("SKILL.md must start with YAML frontmatter between --- lines")
    closing = next((index for index, line in enumerate(lines) if index > 0 and line.strip() == "---"), None)
    if closing is None:
        raise SkillError("The frontmatter is not closed with ---")
    fields = {}
    for line in lines[1:closing]:
        separator = line.find(":")
        if separator > 0:
            fields[line[:separator].strip()] = line[separator + 1 :].strip()
    name = fields.get("name", "")
    description = fields.get("description", "")
    if not 0 < len(name) <= 64 or SKILL_NAME.fullmatch(name) is None:
        raise SkillError(f'Invalid skill name "{name}": 1-64 lowercase letters, digits and single hyphens, not at the start or end')
    if folder_name is not None and folder_name != name:
        raise SkillError(f'Skill name "{name}" does not match its folder "{folder_name}"')
    if not 0 < len(description) <= 1024:
        raise SkillError(f'Skill "{name}" needs a description of 1-1024 characters')
    triggers = [trigger.strip() for trigger in fields.get("triggers", "").split(",") if trigger.strip()]
    return {"name": name, "description": description, "triggers": triggers, "body": "\n".join(lines[closing + 1 :]).strip()}


def directory_of(path):
    return path[: path.rfind("/")] if "/" in path else ""


def context_files_for(files, target_path):
    target_directory = directory_of(target_path)
    applying = [
        file
        for file in files
        if (file["path"] == "AGENTS.md" or file["path"].endswith("/AGENTS.md"))
        and (directory_of(file["path"]) == "" or target_directory == directory_of(file["path"]) or target_directory.startswith(f"{directory_of(file['path'])}/"))
    ]
    return sorted(applying, key=lambda file: len(file["path"].split("/")))


def score_skill(skill, task):
    similarity = cosine_similarity(embed(task), embed(f"{skill['name']} {skill['description']}"))
    lower_task = task.lower()
    hits = sum(1 for trigger in skill["triggers"] if trigger.lower() in lower_task)
    return similarity + hits


def section(kind, name, text):
    return {"kind": kind, "name": name, "text": text, "tokens": count_tokens(text)}


def skill_section(skill):
    return section("skill", skill["name"], f"# Skill: {skill['name']}\n{skill['body']}")


def build_agent_context(*, task, target_path, files, skills, budget_tokens, min_score=0.5, max_skills=2):
    sections = [section("context-file", file["path"], f"# {file['path']}\n{file['content']}") for file in context_files_for(files, target_path)]
    if skills:
        index = "\n".join(f"- {skill['name']}: {skill['description']}" for skill in skills)
        sections.append(section("skill-index", "skills", f"Available skills (load one by name when it applies):\n{index}"))
    used = sum(current["tokens"] for current in sections)
    if used > budget_tokens:
        raise ContextBudgetError(f"Always-on context needs {used} tokens, above the budget of {budget_tokens}")
    ranked = sorted(((skill, score_skill(skill, task)) for skill in skills), key=lambda pair: (-pair[1], pair[0]["name"]))
    loaded = []
    skipped = []
    for skill, score in ranked:
        candidate = skill_section(skill)
        if score < min_score:
            skipped.append({"name": skill["name"], "reason": "below_threshold"})
        elif len(loaded) >= max_skills:
            skipped.append({"name": skill["name"], "reason": "limit"})
        elif used + candidate["tokens"] > budget_tokens:
            skipped.append({"name": skill["name"], "reason": "over_budget"})
        else:
            sections.append(candidate)
            loaded.append(skill["name"])
            used += candidate["tokens"]
    return {"system": "\n\n".join(current["text"] for current in sections), "sections": sections, "tokens": used, "loaded": loaded, "skipped": skipped}


def requested_skill(arguments_text):
    try:
        parsed = json.loads(arguments_text)
    except ValueError:
        return None
    name = parsed.get("name") if isinstance(parsed, dict) else None
    return name if isinstance(name, str) else None


async def answer_with_skills(model, *, max_steps=4, **context_options):
    context = build_agent_context(**context_options)
    skills = context_options["skills"]
    budget_tokens = context_options["budget_tokens"]
    loaded = list(context["loaded"])
    tokens = context["tokens"]
    messages = [
        {"role": "system", "content": context["system"]},
        {"role": "user", "content": context_options["task"]},
    ]

    def load_skill(tool_name, arguments_text):
        nonlocal tokens
        if tool_name != LOAD_SKILL_TOOL["name"]:
            return f"Unknown tool: {tool_name}. The only tool is load_skill."
        name = requested_skill(arguments_text)
        skill = next((candidate for candidate in skills if candidate["name"] == name), None)
        if skill is None:
            return f"Unknown skill: {arguments_text if name is None else name}. Pick a name from the skill index."
        if skill["name"] in loaded:
            return f"Skill {skill['name']} is already loaded in the system message."
        candidate = skill_section(skill)
        if tokens + candidate["tokens"] > budget_tokens:
            return f"Skill {skill['name']} needs {candidate['tokens']} tokens and does not fit the remaining context budget of {budget_tokens - tokens}."
        loaded.append(skill["name"])
        tokens += candidate["tokens"]
        return candidate["text"]

    for step in range(1, max_steps + 1):
        response = await model.generate({"messages": list(messages), "tools": [LOAD_SKILL_TOOL]})
        messages.append({"role": "assistant", "content": response["text"], "toolCalls": response["toolCalls"]})
        if not response["toolCalls"]:
            return {"answer": response["text"], "loaded": loaded, "steps": step, "tokens": tokens}
        for call in response["toolCalls"]:
            messages.append({"role": "tool", "toolCallId": call["id"], "content": load_skill(call["name"], call["arguments"])})
    return {"answer": None, "loaded": loaded, "steps": max_steps, "tokens": tokens}
