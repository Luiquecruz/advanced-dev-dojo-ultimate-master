import asyncio
import inspect
import json
import math
import re
from dataclasses import dataclass
from typing import Callable

DANGEROUS_COMMANDS = [
    re.compile(r"\brm\s+-[a-zA-Z]*r[a-zA-Z]*f?[a-zA-Z]*\s+(/|~|\$HOME)(\s|$)"),
    re.compile(r"\bgit\s+push\b.*(--force\b|\s-f\b)"),
    re.compile(r"\b(curl|wget)\b.*\|\s*(sh|bash|zsh)\b"),
    re.compile(r"\bmkfs(\.\w+)?\b"),
    re.compile(r"\bchmod\s+-R\s+777\b"),
]

SECRET_PATTERNS = [
    re.compile(r"sk-[A-Za-z0-9_-]{16,}"),
    re.compile(r"AKIA[0-9A-Z]{16}"),
    re.compile(r"ghp_[A-Za-z0-9]{36}"),
    re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----"),
]


@dataclass
class Hook:
    """A pre-tool hook (`run(call)`) or a post-tool hook (`run(call, output)`); `run` may be sync or async."""

    name: str
    matcher: str
    run: Callable


class HookFailure(Exception):
    pass


def matches_tool(matcher, tool_name):
    return matcher == "*" or any(name.strip() == tool_name for name in matcher.split("|"))


async def with_timeout(work, timeout_ms):
    outcome = work()
    if not inspect.isawaitable(outcome):
        return outcome
    try:
        return await asyncio.wait_for(outcome, timeout_ms / 1000)
    except TimeoutError:
        raise HookFailure(f"timed out after {timeout_ms} ms") from None


def valid_pre_result(result):
    if not isinstance(result, dict):
        return False
    action = result.get("action")
    return (
        action == "continue"
        or (action == "block" and isinstance(result.get("reason"), str))
        or (action == "rewrite" and isinstance(result.get("arguments"), dict))
    )


def valid_post_result(result):
    if not isinstance(result, dict):
        return False
    action = result.get("action")
    return action == "continue" or (action == "replace" and isinstance(result.get("output"), str))


def failure_reason(error):
    return f"hook failed: {error}"


class HookRunner:
    """Runs a tool call through the matching pre-tool hooks, the tool and the matching post-tool hooks."""

    def __init__(self, pre, post, timeout_ms):
        self.pre = pre
        self.post = post
        self.timeout_ms = timeout_ms

    async def run(self, call, execute):
        current = {"name": call["name"], "arguments": {**call["arguments"]}}
        for hook in [candidate for candidate in self.pre if matches_tool(candidate.matcher, call["name"])]:
            try:
                result = await with_timeout(lambda: hook.run(current), self.timeout_ms)
                if not valid_pre_result(result):
                    raise HookFailure("returned an invalid result")
            except Exception as error:
                return {"status": "blocked", "hook": hook.name, "reason": failure_reason(error)}
            if result["action"] == "block":
                return {"status": "blocked", "hook": hook.name, "reason": result["reason"]}
            if result["action"] == "rewrite":
                current = {"name": current["name"], "arguments": {**result["arguments"]}}
        output = execute(current)
        if inspect.isawaitable(output):
            output = await output
        for hook in [candidate for candidate in self.post if matches_tool(candidate.matcher, call["name"])]:
            try:
                result = await with_timeout(lambda: hook.run(current, output), self.timeout_ms)
                if not valid_post_result(result):
                    raise HookFailure("returned an invalid result")
            except Exception as error:
                return {"status": "blocked", "hook": hook.name, "reason": failure_reason(error)}
            if result["action"] == "replace":
                output = result["output"]
        return {"status": "ok", "output": output, "arguments": current["arguments"]}


def create_hook_runner(*, pre=(), post=(), timeout_ms=1000):
    return HookRunner(list(pre), list(post), timeout_ms)


def block_dangerous_commands():
    def run(call):
        command = str(call["arguments"].get("command", ""))
        if any(pattern.search(command) for pattern in DANGEROUS_COMMANDS):
            return {"action": "block", "reason": f'"{command}" matches a dangerous command pattern'}
        return {"action": "continue"}

    return Hook("block-dangerous-commands", "Bash", run)


def cap_timeout(max_ms):
    def run(call):
        requested = call["arguments"].get("timeoutMs")
        is_number = isinstance(requested, (int, float)) and not isinstance(requested, bool) and not math.isnan(requested)
        timeout_ms = min(requested, max_ms) if is_number else max_ms
        return {"action": "rewrite", "arguments": {**call["arguments"], "timeoutMs": timeout_ms}}

    return Hook("cap-timeout", "Bash", run)


def redact_secrets():
    def run(call, output):
        for pattern in SECRET_PATTERNS:
            output = pattern.sub("[REDACTED]", output)
        return {"action": "replace", "output": output}

    return Hook("redact-secrets", "*", run)


def parse_arguments(text):
    try:
        parsed = json.loads(text)
    except ValueError:
        return None
    return parsed if isinstance(parsed, dict) else None


async def run_tool_calls(response, runner, tools):
    messages = []
    for tool_call in response["toolCalls"]:
        parsed = parse_arguments(tool_call["arguments"])
        execute = tools.get(tool_call["name"])
        if parsed is None or execute is None:
            problem = "arguments are not a JSON object" if parsed is None else f"unknown tool {tool_call['name']}"
            messages.append({"role": "tool", "toolCallId": tool_call["id"], "content": f"Error: {problem}"})
            continue
        result = await runner.run({"name": tool_call["name"], "arguments": parsed}, execute)
        content = result["output"] if result["status"] == "ok" else f"Blocked by {result['hook']}: {result['reason']}"
        messages.append({"role": "tool", "toolCallId": tool_call["id"], "content": content})
    return messages
