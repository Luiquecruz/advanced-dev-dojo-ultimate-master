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


def parse_model_json(text):
    # TODO: parse directly; otherwise extract the object from prose and fences, drop trailing commas, then try double quotes
    try:
        return {"ok": True, "value": json.loads(text), "repaired": False}
    except ValueError as error:
        return {"ok": False, "error": str(error)}


async def generate_structured(model, messages, schema, max_attempts=3):
    # TODO: request JSON with the schema, stop on refusals, repair and validate, and re-ask with the error up to max_attempts calls
    response = await model.generate({"messages": messages, "responseFormat": {"type": "json"}})
    return {"value": json.loads(response["text"]), "attempts": 1, "repaired": False}
