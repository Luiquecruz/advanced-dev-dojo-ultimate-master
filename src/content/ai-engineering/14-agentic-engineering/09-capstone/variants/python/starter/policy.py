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


def decide(policy, call):
    # TODO: among the rules whose tool pattern (with * wildcards) and condition match, deny wins over ask over allow; no match denies with a "No rule" reason
    rule = next((candidate for candidate in policy["rules"] if candidate["tool"] == call["name"]), None)
    return {"decision": rule["decision"], "reason": rule["reason"]} if rule else {"decision": "allow", "reason": "No rule"}
