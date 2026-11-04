from dojo_ai import cosine_similarity, count_tokens, embed

LOAD_SKILL_TOOL = {
    "name": "load_skill",
    "description": "Load the full instructions of one skill from the skill index, by name.",
    "parameters": {"type": "object", "properties": {"name": {"type": "string"}}, "required": ["name"]},
}


class SkillError(Exception):
    """A SKILL.md file that breaks the Agent Skills format."""


class ContextBudgetError(Exception):
    """Always-on context that does not fit the token budget."""


def parse_skill(markdown, folder_name=None):
    # TODO: read name, description and triggers from the frontmatter, the body after it, and enforce the naming rules
    raise NotImplementedError("parse_skill")


def context_files_for(files, target_path):
    # TODO: the AGENTS.md files of the root and of every ancestor folder of target_path, root first
    return [file for file in files if file["path"].endswith("AGENTS.md")]


def score_skill(skill, task):
    # TODO: cosine similarity of embed(task) and embed(f"{name} {description}") plus the number of triggers found in the task
    return cosine_similarity(embed(task), embed(skill["description"]))


def build_agent_context(*, task, target_path, files, skills, budget_tokens, min_score=0.5, max_skills=2):
    # TODO: context files, then the skill index (metadata only), then the best skills that pass min_score, max_skills and the token budget
    entries = [*files, *({"path": skill["name"], "content": skill["body"]} for skill in skills)]
    sections = [{"kind": "context-file", "name": entry["path"], "text": entry["content"], "tokens": count_tokens(entry["content"])} for entry in entries]
    return {"system": "\n\n".join(section["text"] for section in sections), "sections": sections, "tokens": 0, "loaded": [skill["name"] for skill in skills], "skipped": []}


async def answer_with_skills(model, *, max_steps=4, **context_options):
    # TODO: offer LOAD_SKILL_TOOL, answer each load_skill call with a tool message, stop on a text answer or after max_steps
    context = build_agent_context(**context_options)
    response = await model.generate({"messages": [{"role": "system", "content": context["system"]}, {"role": "user", "content": context_options["task"]}]})
    return {"answer": response["text"], "loaded": context["loaded"], "steps": 1, "tokens": context["tokens"]}
