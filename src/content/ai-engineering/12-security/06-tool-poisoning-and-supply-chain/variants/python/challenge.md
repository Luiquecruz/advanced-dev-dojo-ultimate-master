Build the gate that stands between third-party MCP servers and your model: scan tool definitions for hidden instructions, fingerprint them with SHA-256, allowlist servers, and withhold any tool that is new, changed (a rug pull) or poisoned until it is approved.

A tool is an MCP tool definition, a dict `{"name", "title"?, "description"?, "inputSchema", "annotations"?}`. A server is `{"id", "url"}`. Qualified names are `f"{server_id}__{tool_name}"` (module 03). Findings, reviews and pending entries are plain dicts whose keys keep the JSON names (`"pinnedHash"`).

## 1. `scan_tool(tool, *, known_tool_names=())`

Scan the `"description"`, then the `"description"` of each property in `tool["inputSchema"]["properties"]` (in order), and return the findings `{"rule", "location", "excerpt"}`. `"location"` is `"description"` or `"parameter:<name>"`. For each text, check these rules in order, with at most one finding per rule and text:

| `"rule"` | Matches | `"excerpt"` |
| --- | --- | --- |
| `hidden_tag` | an HTML comment `<!-- ... -->`, or a tag (opening or closing, any case) named `important`, `system`, `instruction`, `instructions`, `secret` or `admin` | the matched text |
| `invisible_characters` | U+200B to U+200F, U+202A to U+202E, U+2060 to U+2064, U+2066 to U+2069, U+FEFF, or U+E0000 to U+E007F | `U+` and the first one's code point in uppercase hex, at least 4 digits (`U+200B`, `U+E0049`) |
| `instruction` | any of `INSTRUCTION_PATTERNS` (compiled patterns, already in the starter) | the match of the first pattern that matches |
| `sensitive_path` | `~/.ssh`, `id_rsa`, `.env` (as a word end), `mcp.json`, `.aws/credentials` or `/etc/passwd` | the matched text |
| `shadowing` | the name of another tool from `known_tool_names` (not the tool's own name), not preceded or followed by a letter, digit, `_` or `-` | that name |

A clean tool returns `[]`.

## 2. `fingerprint_tool(tool)`

The SHA-256 hex digest (`hashlib.sha256`) of the tool's **canonical JSON**, the same text JavaScript's `JSON.stringify` writes for a copy whose object keys are sorted at every depth: `json.dumps(tool, sort_keys=True, separators=(",", ":"), ensure_ascii=False)` encoded as UTF-8 (lists keep their order). Key order must not change the fingerprint; any other change must. The same tool has the same fingerprint in the Node.js and Python variants.

## 3. `create_tool_gate(*, allowed_servers, pins=None, known_tool_names=())`

`allowed_servers` lists `{"id", "url"}`; `pins` maps qualified names to approved fingerprints. Return a `ToolGate` with:

**`review(server, tools)`**

- A server whose `"id"` is not allowlisted: `{"status": "blocked", "reason": "server_not_allowlisted", "approved": [], "pending": []}`. An allowlisted id whose `"url"` differs after normalization (scheme and host lowercase, default port dropped, empty path as `/`, parsed with `urllib.parse.urlsplit`): the same with `"reason": "url_mismatch"`.
- Otherwise remember the names of these tools (they join the names used for shadowing in this and later reviews, with `known_tool_names`) and return `{"status": "reviewed", "approved", "pending"}`. For each tool in order, by qualified name:
  1. any finding → pending `{"name", "reason": "poisoned", "findings"}`;
  2. no pin → pending `{"name", "reason": "new", "hash"}`;
  3. pin differs from the fingerprint → pending `{"name", "reason": "changed", "hash", "pinnedHash"}`;
  4. otherwise approved as a model tool definition `{"name", "description", "parameters"}` (`"description"` defaults to `""`, `"parameters"` is the `"inputSchema"`).

**`approve(server_id, tool)`** raises a `ToolPoisoningError` (defined in `main.py`, with a `findings` attribute) when the tool has findings; otherwise pins its fingerprint and returns it. **`pins()`** returns a copy of the pins.

The tests use the classic `<IMPORTANT>` attack, zero-width and Unicode tag characters, poison in parameters, shadowing of another server's tool, typosquatted URLs and silent definition updates, and check which tools reach the fake model.
