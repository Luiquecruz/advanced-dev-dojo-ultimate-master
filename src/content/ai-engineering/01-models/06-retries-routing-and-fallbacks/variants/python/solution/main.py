import asyncio
import itertools
import random
from dataclasses import dataclass, field

from dojo_ai import ModelError

RETRYABLE_STATUSES = {429, 500, 503, 504, 529}


class InvalidAnswerError(Exception):
    """The escalated answer failed validation too."""


async def wait(milliseconds):
    await asyncio.sleep(milliseconds / 1000)


@dataclass(kw_only=True)
class RetryOptions:
    retries: int
    base_ms: float
    max_ms: float
    sleep: object = wait
    random: object = random.random


@dataclass(kw_only=True)
class RouterOptions(RetryOptions):
    models: dict = field(default_factory=dict)
    validate: object = None


def is_retryable(error):
    return isinstance(error, ModelError) and error.status in RETRYABLE_STATUSES


def retry_delay(attempt, error, options):
    if isinstance(error, ModelError) and error.retry_after_ms is not None:
        return error.retry_after_ms
    return options.random() * min(options.max_ms, options.base_ms * 2**attempt)


async def generate_with_retry(model, request, options):
    for attempt in itertools.count():
        try:
            return await model.generate(request)
        except Exception as error:
            if attempt >= options.retries or not is_retryable(error):
                raise
            await options.sleep(retry_delay(attempt, error, options))


async def generate_with_fallback(primary, backup, request, options):
    try:
        return {"response": await generate_with_retry(primary, request, options), "model": primary.name}
    except Exception as error:
        if not is_retryable(error):
            raise
    return {"response": await generate_with_retry(backup, request, options), "model": backup.name}


async def try_cheap(model, request, options):
    try:
        response = await generate_with_retry(model, request, options)
    except Exception:
        return None
    return response["text"] if options.validate(response["text"]) else None


async def answer(request, options):
    cheap, strong, backup = options.models["cheap"], options.models["strong"], options.models["backup"]
    cheap_text = await try_cheap(cheap, request, options)
    if cheap_text is not None:
        return {"text": cheap_text, "model": cheap.name, "escalated": False}
    escalated = await generate_with_fallback(strong, backup, request, options)
    if not options.validate(escalated["response"]["text"]):
        raise InvalidAnswerError(f"The answer from {escalated['model']} failed validation")
    return {"text": escalated["response"]["text"], "model": escalated["model"], "escalated": True}
