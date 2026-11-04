import json
import re

from validation import prettify_error, safe_parse


class StructuredOutputError(Exception):
    """No usable structured output: `reason` is "refusal" or "exhausted", with the `attempts` made and the `last_error`."""

    def __init__(self, reason, attempts, last_error):
        message = f"The model declined to answer: {last_error}" if reason == "refusal" else f"No valid output after {attempts} attempts: {last_error}"
        super().__init__(message)
        self.reason = reason
        self.attempts = attempts
        self.last_error = last_error


def try_parse(text):
    try:
        return {"ok": True, "value": json.loads(text), "repaired": True}
    except ValueError as error:
        return {"ok": False, "error": str(error)}


def parse_model_json(text):
    direct = try_parse(text.strip())
    if direct["ok"]:
        return {**direct, "repaired": False}
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end < start:
        return {"ok": False, "error": "No complete JSON object found in the reply"}
    without_trailing_commas = re.sub(r",(\s*[}\]])", r"\1", text[start : end + 1])
    extracted = try_parse(without_trailing_commas)
    if extracted["ok"]:
        return extracted
    double_quoted = try_parse(without_trailing_commas.replace("'", '"'))
    return double_quoted if double_quoted["ok"] else extracted


def feedback(problem):
    return {"role": "user", "content": f"Your previous reply could not be used:\n{problem}\nReply again with only the corrected JSON object."}


async def generate_structured(model, messages, schema, max_attempts=3):
    response_format = {"type": "json", "schema": schema}
    conversation = list(messages)
    last_error = ""
    for attempt in range(1, max_attempts + 1):
        response = await model.generate({"messages": conversation, "responseFormat": response_format})
        if response["finishReason"] in ("refusal", "content_filter"):
            raise StructuredOutputError("refusal", attempt, response["text"] or response["finishReason"])
        if response["finishReason"] == "length":
            last_error = "The reply was cut off by the token limit before the JSON object was complete."
        else:
            parsed = parse_model_json(response["text"])
            if parsed["ok"]:
                validated = safe_parse(schema, parsed["value"])
                if validated["success"]:
                    return {"value": validated["data"], "attempts": attempt, "repaired": parsed["repaired"]}
                last_error = prettify_error(validated["issues"])
            else:
                last_error = f"The reply is not valid JSON: {parsed['error']}"
        conversation = [*conversation, {"role": "assistant", "content": response["text"]}, feedback(last_error)]
    raise StructuredOutputError("exhausted", max_attempts, last_error)
