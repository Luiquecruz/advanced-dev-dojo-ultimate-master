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


def delimit(tag, content):
    # TODO: neutralize <tag> and </tag> inside the content (any case, optional spaces) as [tag] and [/tag]
    return f"<{tag}>\n{content}\n</{tag}>"


def build_messages(spec):
    # TODO: validate the spec, then build the system message, one user/assistant pair per example and the final user message
    output_format = spec.get("outputFormat") or {}
    everything = [spec.get("role"), spec.get("task"), *spec.get("constraints", []), output_format.get("description"), spec.get("context"), spec.get("input")]
    return [{"role": "user", "content": "\n".join(part for part in everything if part)}]


async def run_prompt(model, spec):
    # TODO: ask for JSON when the output format is json, and raise PromptRunError when the finish reason is not stop
    response = await model.generate({"messages": build_messages(spec)})
    return response["text"]
