import asyncio
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
    # TODO: True only for a ModelError with status 429, 500, 503, 504 or 529
    return isinstance(error, ModelError)


def retry_delay(attempt, error, options):
    # TODO: use the error's retry_after_ms when present, otherwise options.random() * min(options.max_ms, options.base_ms * 2**attempt)
    return options.base_ms


async def generate_with_retry(model, request, options):
    # TODO: retry retryable errors up to options.retries times, awaiting options.sleep(retry_delay(...)) between attempts
    return await model.generate(request)


async def generate_with_fallback(primary, backup, request, options):
    # TODO: when the primary still fails with a retryable error after its retries, try the backup; never fall back on other errors
    return {"response": await generate_with_retry(primary, request, options), "model": primary.name}


async def answer(request, options):
    # TODO: try the cheap model first; escalate to strong (with backup as fallback) when it fails or its answer is invalid
    strong = options.models["strong"]
    response = await strong.generate(request)
    return {"text": response["text"], "model": strong.name, "escalated": True}
