import hashlib
import json
import re
from urllib.parse import urlsplit

INSTRUCTION_PATTERNS = [
    re.compile(r"ignore (?:all |any )?(?:previous|prior|above|other) (?:instructions|rules)", re.IGNORECASE),
    re.compile(r"do not (?:tell|mention|inform|alert) the user", re.IGNORECASE),
    re.compile(r"(?:before|after|when) (?:using|calling) this tool", re.IGNORECASE),
    re.compile(r"you (?:must|should) (?:first |also |always )?(?:read|call|send|include|pass|forward)", re.IGNORECASE),
    re.compile(r"without (?:asking|telling|confirmation|approval)", re.IGNORECASE),
]

HIDDEN_TAG = re.compile(r"<\s*/?\s*(?:important|system|instructions?|secret|admin)\b[^>]*>|<!--[\s\S]*?-->", re.IGNORECASE)
INVISIBLE = re.compile("[​-‏‪-‮⁠-⁤⁦-⁩﻿\U000e0000-\U000e007f]")
SENSITIVE_PATH = re.compile(r"~/\.ssh|id_rsa|\.env\b|mcp\.json|\.aws/credentials|/etc/passwd", re.IGNORECASE | re.ASCII)
DEFAULT_PORTS = {"http": 80, "https": 443}


class ToolPoisoningError(Exception):
    def __init__(self, message, findings):
        super().__init__(message)
        self.findings = findings


def texts_of(tool):
    texts = [{"location": "description", "text": tool.get("description") or ""}]
    for name, schema in tool["inputSchema"].get("properties", {}).items():
        if isinstance(schema, dict) and isinstance(schema.get("description"), str):
            texts.append({"location": f"parameter:{name}", "text": schema["description"]})
    return texts


def mentions(text, name):
    return re.search(rf"(?<![\w-]){re.escape(name)}(?![\w-])", text, re.ASCII) is not None


def scan_tool(tool, *, known_tool_names=()):
    other_tools = [name for name in known_tool_names if name != tool["name"]]
    findings = []
    for entry in texts_of(tool):
        location = entry["location"]
        text = entry["text"]
        tag = HIDDEN_TAG.search(text)
        if tag:
            findings.append({"rule": "hidden_tag", "location": location, "excerpt": tag.group(0)})
        invisible = INVISIBLE.search(text)
        if invisible:
            findings.append({"rule": "invisible_characters", "location": location, "excerpt": f"U+{ord(invisible.group(0)):04X}"})
        instruction = next((match for match in (pattern.search(text) for pattern in INSTRUCTION_PATTERNS) if match), None)
        if instruction:
            findings.append({"rule": "instruction", "location": location, "excerpt": instruction.group(0)})
        path = SENSITIVE_PATH.search(text)
        if path:
            findings.append({"rule": "sensitive_path", "location": location, "excerpt": path.group(0)})
        shadowed = next((name for name in other_tools if mentions(text, name)), None)
        if shadowed is not None:
            findings.append({"rule": "shadowing", "location": location, "excerpt": shadowed})
    return findings


def fingerprint_tool(tool):
    canonical = json.dumps(tool, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def normalized_url(url):
    try:
        parts = urlsplit(url)
        port = parts.port
    except ValueError:
        return None
    scheme = parts.scheme.lower()
    if port == DEFAULT_PORTS.get(scheme):
        port = None
    return (scheme, parts.username, parts.password, parts.hostname, port, parts.path or "/", parts.query, parts.fragment)


def same_url(left, right):
    normalized = normalized_url(left)
    return normalized is not None and normalized == normalized_url(right)


class ToolGate:
    """Reviews the tools of allowlisted MCP servers and offers only clean, pinned definitions."""

    def __init__(self, allowed_servers, pins, known_tool_names):
        self.allowed_servers = allowed_servers
        self.pinned = dict(pins)
        self.seen_names = dict.fromkeys(known_tool_names)

    def review(self, server, tools):
        entry = next((allowed for allowed in self.allowed_servers if allowed["id"] == server["id"]), None)
        if entry is None:
            return {"status": "blocked", "reason": "server_not_allowlisted", "approved": [], "pending": []}
        if not same_url(entry["url"], server["url"]):
            return {"status": "blocked", "reason": "url_mismatch", "approved": [], "pending": []}
        self.seen_names.update(dict.fromkeys(tool["name"] for tool in tools))
        approved = []
        pending = []
        for tool in tools:
            name = f"{server['id']}__{tool['name']}"
            findings = scan_tool(tool, known_tool_names=list(self.seen_names))
            fingerprint = fingerprint_tool(tool)
            if findings:
                pending.append({"name": name, "reason": "poisoned", "findings": findings})
            elif name not in self.pinned:
                pending.append({"name": name, "reason": "new", "hash": fingerprint})
            elif self.pinned[name] != fingerprint:
                pending.append({"name": name, "reason": "changed", "hash": fingerprint, "pinnedHash": self.pinned[name]})
            else:
                approved.append({"name": name, "description": tool.get("description") or "", "parameters": tool["inputSchema"]})
        return {"status": "reviewed", "approved": approved, "pending": pending}

    def approve(self, server_id, tool):
        findings = scan_tool(tool, known_tool_names=list(self.seen_names))
        if findings:
            raise ToolPoisoningError(f"Tool {server_id}__{tool['name']} has {len(findings)} suspicious finding(s)", findings)
        fingerprint = fingerprint_tool(tool)
        self.pinned[f"{server_id}__{tool['name']}"] = fingerprint
        return fingerprint

    def pins(self):
        return dict(self.pinned)


def create_tool_gate(*, allowed_servers, pins=None, known_tool_names=()):
    return ToolGate(allowed_servers, pins or {}, known_tool_names)
