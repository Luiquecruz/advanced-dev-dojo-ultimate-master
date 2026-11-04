import re


class PromptSpecError(Exception):
    """A prompt spec is missing a required part: `field` is "role", "task", "input" or "examples"."""

    def __init__(self, field, message):
        super().__init__(message)
        self.field = field


class PromptRunError(Exception):
    """The model did not finish normally: carries the `finish_reason` and the partial `text`."""

    def __init__(self, finish_reason, text):
        super().__init__(f"The model did not finish normally ({finish_reason})")
        self.finish_reason = finish_reason
        self.text = text


def is_blank(value):
    return value is None or value.strip() == ""


def delimit(tag, content):
    same_tag = re.compile(rf"<\s*(/?)\s*{re.escape(tag)}\s*>", re.IGNORECASE)
    neutralized = same_tag.sub(lambda match: f"[{match.group(1)}{tag}]", content)
    return f"<{tag}>\n{neutralized}\n</{tag}>"


def validate(spec):
    for field in ("role", "task", "input"):
        if is_blank(spec.get(field)):
            raise PromptSpecError(field, f"A prompt needs a {field}")
    for index, example in enumerate(spec.get("examples", []), start=1):
        if is_blank(example.get("input")) or is_blank(example.get("output")):
            raise PromptSpecError("examples", f"Example {index} needs an input and an output")


def system_content(spec):
    sections = [spec["role"]]
    constraints = spec.get("constraints", [])
    if constraints:
        sections.append("Constraints:\n" + "\n".join(f"- {constraint}" for constraint in constraints))
    if spec.get("outputFormat") is not None:
        sections.append(f"Output format: {spec['outputFormat']['description']}")
    return "\n\n".join(sections)


def build_messages(spec):
    validate(spec)
    examples = []
    for example in spec.get("examples", []):
        examples.append({"role": "user", "content": delimit("input", example["input"])})
        examples.append({"role": "assistant", "content": example["output"]})
    final_parts = [spec["task"], delimit("input", spec["input"])]
    if spec.get("context") is not None:
        final_parts.insert(0, delimit("context", spec["context"]))
    return [
        {"role": "system", "content": system_content(spec)},
        *examples,
        {"role": "user", "content": "\n\n".join(final_parts)},
    ]


async def run_prompt(model, spec):
    request = {"messages": build_messages(spec)}
    if spec.get("outputFormat", {}).get("type") == "json":
        request["responseFormat"] = {"type": "json"}
    response = await model.generate(request)
    if response["finishReason"] != "stop":
        raise PromptRunError(response["finishReason"], response["text"])
    return response["text"]
