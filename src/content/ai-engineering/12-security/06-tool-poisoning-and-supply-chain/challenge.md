Build the gate that stands between third-party MCP servers and your model: scan tool definitions for hidden instructions, fingerprint them with SHA-256, allowlist servers, and withhold any tool that is new, changed (a rug pull) or poisoned until it is approved.

A tool is an MCP tool definition `{ name, title?, description?, inputSchema, annotations? }`. A server is `{ id, url }`. Qualified names are `` `${serverId}__${toolName}` `` (module 03).

## 1. `scanTool(tool, { knownToolNames = [] })`

Scan the `description`, then the `description` of each property in `inputSchema.properties` (in order), and return the findings `{ rule, location, excerpt }`. `location` is `'description'` or `'parameter:<name>'`. For each text, check these rules in order, with at most one finding per rule and text:

| `rule` | Matches | `excerpt` |
| --- | --- | --- |
| `hidden_tag` | an HTML comment `<!-- ... -->`, or a tag (opening or closing, any case) named `important`, `system`, `instruction`, `instructions`, `secret` or `admin` | the matched text |
| `invisible_characters` | U+200B to U+200F, U+202A to U+202E, U+2060 to U+2064, U+2066 to U+2069, U+FEFF, or U+E0000 to U+E007F | `U+` and the first one's code point in uppercase hex, at least 4 digits (`U+200B`, `U+E0049`) |
| `instruction` | any of `INSTRUCTION_PATTERNS` (exported, already in the starter) | the match of the first pattern that matches |
| `sensitive_path` | `~/.ssh`, `id_rsa`, `.env` (as a word end), `mcp.json`, `.aws/credentials` or `/etc/passwd` | the matched text |
| `shadowing` | the name of another tool from `knownToolNames` (not the tool's own name), not preceded or followed by a letter, digit, `_` or `-` | that name |

A clean tool returns `[]`.

## 2. `fingerprintTool(tool)`

The SHA-256 hex digest (`node:crypto`) of the tool's **canonical JSON**: `JSON.stringify` of a copy whose object keys are sorted at every depth (arrays keep their order). Key order must not change the fingerprint; any other change must.

## 3. `createToolGate({ allowedServers, pins = {}, knownToolNames = [] })`

`allowedServers` lists `{ id, url }`; `pins` maps qualified names to approved fingerprints. The gate has:

**`review(server, tools)`**

- A server whose `id` is not allowlisted: `{ status: 'blocked', reason: 'server_not_allowlisted', approved: [], pending: [] }`. An allowlisted id whose `url` differs (compare `new URL(url).href`): the same with `reason: 'url_mismatch'`.
- Otherwise remember the names of these tools (they join the names used for shadowing in this and later reviews, with `knownToolNames`) and return `{ status: 'reviewed', approved, pending }`. For each tool in order, by qualified name:
  1. any finding → pending `{ name, reason: 'poisoned', findings }`;
  2. no pin → pending `{ name, reason: 'new', hash }`;
  3. pin differs from the fingerprint → pending `{ name, reason: 'changed', hash, pinnedHash }`;
  4. otherwise approved as a model tool definition `{ name, description, parameters }` (`description` defaults to `''`, `parameters` is the `inputSchema`).

**`approve(serverId, tool)`** throws a `ToolPoisoningError` (exported, with a `findings` property) when the tool has findings; otherwise pins its fingerprint and returns it. **`pins()`** returns a copy of the pins.

The tests use the classic `<IMPORTANT>` attack, zero-width and Unicode tag characters, poison in parameters, shadowing of another server's tool, typosquatted URLs and silent definition updates, and check which tools reach the fake model.
