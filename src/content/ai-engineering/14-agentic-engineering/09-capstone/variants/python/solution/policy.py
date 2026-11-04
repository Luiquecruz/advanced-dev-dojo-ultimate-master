import re


def is_number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool)


SUPPORT_POLICY = {
    "rules": [
        {"tool": "search_docs", "decision": "allow", "reason": "Read-only search of the help center"},
        {"tool": "get_invoice", "decision": "allow", "reason": "Read-only invoice lookup for support agents"},
        {"tool": "issue_refund", "decision": "ask", "reason": "Refunds move money: a team lead approves each one"},
        {
            "tool": "issue_refund",
            "decision": "deny",
            "reason": "Refunds above 500 USD go to the finance team",
            "when": lambda arguments: is_number(arguments.get("amountUsd")) and arguments["amountUsd"] > 500,
        },
        {"tool": "send_*", "decision": "deny", "reason": "The copilot never sends messages: no exfiltration channel"},
    ],
}

PRECEDENCE = ["deny", "ask", "allow"]


def matches_tool(pattern, name):
    return re.fullmatch(".*".join(re.escape(part) for part in pattern.split("*")), name, re.DOTALL) is not None


def decide(policy, call):
    matching = [rule for rule in policy["rules"] if matches_tool(rule["tool"], call["name"]) and (rule.get("when") is None or rule["when"](call["arguments"]))]
    for decision in PRECEDENCE:
        rule = next((candidate for candidate in matching if candidate["decision"] == decision), None)
        if rule is not None:
            return {"decision": decision, "reason": rule["reason"]}
    return {"decision": "deny", "reason": f"No rule matches {call['name']}: denied by default"}
