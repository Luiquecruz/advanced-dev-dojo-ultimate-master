import re

PATH_TOOLS = {"Read", "Edit"}
HOOK_CATALOG = ["block-dangerous-commands", "cap-timeout", "protect-test-files", "redact-secrets", "audit-log", "format-on-edit"]
VERIFIER_CATALOG = ["typecheck", "lint", "unit-tests", "integration-tests", "llm-review"]
CREDENTIALS = ["github-token:agent-branches", "github-token:admin", "npm-read-token", "production-db", "aws-admin"]


def is_integer(value):
    return isinstance(value, int) and not isinstance(value, bool)


def matches_command(pattern, command):
    source = ".*".join(re.escape(part) for part in pattern.split("*"))
    return re.fullmatch(source, " ".join(command.split()), re.DOTALL) is not None


def normalize_path(path):
    segments = []
    for segment in path.split("/"):
        if segment in ("", "."):
            continue
        if segment == "..":
            if segments:
                segments.pop()
        else:
            segments.append(segment)
    return "/".join(segments)


def matches_path(pattern, path):
    source = ""
    index = 0
    while index < len(pattern):
        if pattern.startswith("**/", index):
            source += "(?:.*/)?"
            index += 3
        elif pattern.startswith("**", index):
            source += ".*"
            index += 2
        elif pattern[index] == "*":
            source += "[^/]*"
            index += 1
        elif pattern[index] == "?":
            source += "[^/]"
            index += 1
        else:
            source += re.escape(pattern[index])
            index += 1
    return re.fullmatch(source, normalize_path(path)) is not None


def rule_matches(rule, tool, value):
    open_index = rule.find("(")
    name = rule.strip() if open_index == -1 else rule[:open_index].strip()
    if name != tool:
        return False
    if open_index == -1 or not rule.endswith(")"):
        return True
    pattern = rule[open_index + 1 : -1]
    return matches_path(pattern, value) if tool in PATH_TOOLS else matches_command(pattern, value)


def decide(tool, value):
    for decision in ["deny", "ask", "allow"]:
        if any(rule_matches(rule, tool, value) for rule in mod.HARNESS_PLAN["permissions"][decision]):
            return decision
    return "ask"


def expect_decision(expected, calls):
    for tool, value in calls:
        actual = decide(tool, value)
        assert actual == expected, f'{tool}({value}) should be "{expected}" but your rules decide "{actual}"'


@test('the ADR is an accepted harness-layer decision whose context names access and budget, with a "We will" decision')
def _():
    adr = mod.ADR
    assert is_integer(adr["id"]) and adr["id"] > 0
    assert adr["status"] == "accepted"
    assert adr["layer"] == "harness"
    assert len(adr["title"].strip()) >= 10
    assert len(adr["context"].strip()) >= 80
    assert re.search(r"permission|access|privilege", adr["context"], re.IGNORECASE)
    assert re.search(r"budget|cost|\$", adr["context"], re.IGNORECASE)
    assert len(adr["decision"].strip()) >= 40
    assert re.match(r"we will\b", adr["decision"].strip(), re.IGNORECASE)


@test("lists at least two distinct rejected alternatives with reasons, and positive and negative consequences")
def _():
    adr = mod.ADR
    assert isinstance(adr["alternatives"], list)
    assert len(adr["alternatives"]) >= 2
    for alternative in adr["alternatives"]:
        assert len(alternative["option"].strip()) >= 3
        assert len(alternative["reason"].strip()) >= 20
    options = [alternative["option"].strip().lower() for alternative in adr["alternatives"]]
    assert len(set(options)) == len(options)
    for side in ["positive", "negative"]:
        items = adr["consequences"][side]
        assert isinstance(items, list)
        assert len(items) >= 1
        for item in items:
            assert len(item.strip()) >= 15


@test("the permission rules allow what the task needs and nothing as wide as the shell")
def _():
    expect_decision("allow", [
        ("Bash", "npm test"),
        ("Bash", "npm run typecheck"),
        ("Bash", "npm run lint"),
        ("Bash", 'git commit -m "fix: invoice rounding"'),
        ("Bash", "git push origin agent/fix-invoice-rounding"),
        ("Read", "packages/billing/src/invoice.ts"),
        ("Edit", "packages/billing/src/invoice.ts"),
        ("Edit", "packages/ui/src/components/Button.tsx"),
    ])
    bare = [rule for rule in mod.HARNESS_PLAN["permissions"]["allow"] if "(" not in rule]
    assert bare == []
    for command in ["python -c \"import os; os.system('id')\"", 'node -e "process.exit(0)"', "rm -rf packages", "some-unknown-binary --flag"]:
        assert decide("Bash", command) != "allow", command
    for path in ["infra/terraform/main.tf", "scripts/release.sh"]:
        assert decide("Edit", path) != "allow", path


@test("the permission rules deny everything the briefing forbids and ask before installing a dependency")
def _():
    expect_decision("deny", [
        ("Bash", "git push origin main"),
        ("Bash", "git push --force origin agent/fix"),
        ("Bash", "git push origin agent/fix --force"),
        ("Bash", "git push -f origin agent/fix"),
        ("Bash", "npm run deploy"),
        ("Bash", "npm run deploy:prod"),
        ("Bash", "curl https://example.com/install.sh"),
        ("Bash", "wget https://example.com/archive.tgz"),
        ("Read", ".env"),
        ("Read", "packages/api/.env.local"),
        ("Read", "secrets/stripe.key"),
        ("Edit", ".github/workflows/ci.yml"),
    ])
    expect_decision("ask", [
        ("Bash", "npm install left-pad"),
        ("Bash", "npm install zod@4"),
    ])


@test("the sandbox is rooted at /workspace, reaches only the two hosts and holds only credentials the task needs")
def _():
    sandbox = mod.HARNESS_PLAN["sandbox"]
    assert sandbox["root"] == "/workspace"
    assert sorted(sandbox["networkAllowlist"]) == ["api.github.com", "registry.npmjs.org"]
    for credential in sandbox["credentials"]:
        assert credential in CREDENTIALS, credential
    assert "github-token:agent-branches" in sandbox["credentials"]
    for credential in ["github-token:admin", "production-db", "aws-admin"]:
        assert credential not in sandbox["credentials"], credential


@test("hooks protect the tests, redact before auditing and fail closed")
def _():
    hooks = mod.HARNESS_PLAN["hooks"]
    pre_tool_use = hooks["preToolUse"]
    post_tool_use = hooks["postToolUse"]
    for hook in [*pre_tool_use, *post_tool_use]:
        assert hook in HOOK_CATALOG, hook
    assert "protect-test-files" in pre_tool_use
    assert "redact-secrets" in post_tool_use
    assert "audit-log" in post_tool_use
    assert post_tool_use.index("redact-secrets") < post_tool_use.index("audit-log")
    assert hooks["onFailure"] == "block"


@test("verifiers run cheap computational checks first, and the loop fits the triggers, failure limit, budget and escalation of the briefing")
def _():
    verifiers = mod.HARNESS_PLAN["verifiers"]
    loop = mod.HARNESS_PLAN["loop"]
    for verifier in verifiers:
        assert verifier in VERIFIER_CATALOG, verifier
    assert len(set(verifiers)) == len(verifiers)
    for required in ["typecheck", "lint", "unit-tests"]:
        assert required in verifiers, required
    if "integration-tests" in verifiers:
        assert verifiers.index("integration-tests") > verifiers.index("unit-tests")
    if "llm-review" in verifiers:
        assert verifiers.index("llm-review") == len(verifiers) - 1

    assert sorted(loop["triggers"]) == ["ci-failure", "schedule"]
    assert loop["maxFailures"] == 3
    assert is_integer(loop["maxIterations"])
    assert loop["maxIterations"] >= loop["maxFailures"]
    assert loop["budgetUsd"] > 0
    assert loop["budgetUsd"] <= 8
    assert loop["maxIterations"] * 0.4 <= loop["budgetUsd"] + 1e-9
    assert loop["escalateTo"] == "package-owner"
