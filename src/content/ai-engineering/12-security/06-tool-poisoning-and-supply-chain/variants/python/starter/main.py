import hashlib
import json
import re

INSTRUCTION_PATTERNS = [
    re.compile(r"ignore (?:all |any )?(?:previous|prior|above|other) (?:instructions|rules)", re.IGNORECASE),
    re.compile(r"do not (?:tell|mention|inform|alert) the user", re.IGNORECASE),
    re.compile(r"(?:before|after|when) (?:using|calling) this tool", re.IGNORECASE),
    re.compile(r"you (?:must|should) (?:first |also |always )?(?:read|call|send|include|pass|forward)", re.IGNORECASE),
    re.compile(r"without (?:asking|telling|confirmation|approval)", re.IGNORECASE),
]


class ToolPoisoningError(Exception):
    def __init__(self, message, findings):
        super().__init__(message)
        self.findings = findings


def scan_tool(tool, *, known_tool_names=()):
    # TODO: scan the description and every parameter description for hidden tags, invisible characters, INSTRUCTION_PATTERNS, sensitive paths and other tools' names
    findings = []
    if "<IMPORTANT>" in tool.get("description", ""):
        findings.append({"rule": "hidden_tag", "location": "description", "excerpt": "<IMPORTANT>"})
    return findings


def fingerprint_tool(tool):
    # TODO: hash canonical JSON (dict keys sorted at every depth, compact separators) so key order does not change the fingerprint
    return hashlib.sha256(json.dumps(tool).encode("utf-8")).hexdigest()


class ToolGate:
    """Reviews the tools of allowlisted MCP servers and offers only clean, pinned definitions."""

    def __init__(self, allowed_servers, pins, known_tool_names):
        self.allowed_servers = allowed_servers
        self.pinned = dict(pins)
        self.seen_names = dict.fromkeys(known_tool_names)

    def review(self, server, tools):
        # TODO: block unknown servers and URL mismatches; withhold poisoned, new and changed tools
        approved = [
            {"name": f"{server['id']}__{tool['name']}", "description": tool.get("description") or "", "parameters": tool["inputSchema"]}
            for tool in tools
        ]
        return {"status": "reviewed", "approved": approved, "pending": []}

    def approve(self, server_id, tool):
        # TODO: refuse poisoned tools with a ToolPoisoningError
        fingerprint = fingerprint_tool(tool)
        self.pinned[f"{server_id}__{tool['name']}"] = fingerprint
        return fingerprint

    def pins(self):
        return dict(self.pinned)


def create_tool_gate(*, allowed_servers, pins=None, known_tool_names=()):
    return ToolGate(allowed_servers, pins or {}, known_tool_names)
