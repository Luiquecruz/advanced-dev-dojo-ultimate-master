import inspect
import json
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


def matches_tool(matcher, tool_name):
    return matcher == "*" or any(name.strip() == tool_name for name in matcher.split("|"))


class HookRunner:
    """Runs a tool call through the matching pre-tool hooks, the tool and the matching post-tool hooks."""

    def __init__(self, pre, post, timeout_ms):
        self.pre = pre
        self.post = post
        self.timeout_ms = timeout_ms

    async def run(self, call, execute):
        # TODO: run matching pre hooks in order (rewrite, first block wins), execute once, run matching post hooks in order; fail closed on errors, timeouts and invalid results
        for hook in [candidate for candidate in self.pre if matches_tool(candidate.matcher, call["name"])]:
            result = hook.run(call)
            if inspect.isawaitable(result):
                result = await result
            if result["action"] == "block":
                return {"status": "blocked", "hook": hook.name, "reason": result["reason"]}
        output = execute(call)
        if inspect.isawaitable(output):
            output = await output
        return {"status": "ok", "output": output, "arguments": call["arguments"]}


def create_hook_runner(*, pre=(), post=(), timeout_ms=1000):
    return HookRunner(list(pre), list(post), timeout_ms)


def block_dangerous_commands():
    # TODO: block Bash commands that match DANGEROUS_COMMANDS, quoting the command in the reason
    return Hook("block-dangerous-commands", "Bash", lambda call: {"action": "continue"})


def cap_timeout(max_ms):
    # TODO: rewrite "timeoutMs" to min(timeoutMs, max_ms), or max_ms when it is missing or not a number
    return Hook("cap-timeout", "Bash", lambda call: {"action": "rewrite", "arguments": {**call["arguments"], "timeoutMs": max_ms}})


def redact_secrets():
    # TODO: replace every SECRET_PATTERNS match in the output with [REDACTED]
    return Hook("redact-secrets", "*", lambda call, output: {"action": "continue"})


async def run_tool_calls(response, runner, tools):
    # TODO: one tool message per call: Error: for bad arguments or unknown tools, "Blocked by <hook>: <reason>" for blocked calls, the output otherwise
    messages = []
    for tool_call in response["toolCalls"]:
        result = await runner.run({"name": tool_call["name"], "arguments": json.loads(tool_call["arguments"])}, tools[tool_call["name"]])
        messages.append({"role": "tool", "toolCallId": tool_call["id"], "content": result["output"] if result["status"] == "ok" else result["reason"]})
    return messages
