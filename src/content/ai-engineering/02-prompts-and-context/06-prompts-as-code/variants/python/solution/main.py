import re

PLACEHOLDER = re.compile(r"\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}")


class PromptRegistryError(Exception):
    """A registry problem: duplicate version, unknown version or nothing active."""


class PromptRenderError(Exception):
    """Variables do not match the template: lists every `missing` and `unexpected` name."""

    def __init__(self, missing, unexpected):
        super().__init__(f"Cannot render prompt: missing [{', '.join(missing)}], unexpected [{', '.join(unexpected)}]")
        self.missing = missing
        self.unexpected = unexpected


class PromotionBlockedError(Exception):
    """A promotion refused because the version has no tests or some `failed_tests`."""

    def __init__(self, failed_tests, message):
        super().__init__(message)
        self.failed_tests = failed_tests


def template_variables(template):
    names = PLACEHOLDER.findall(template["system"]) + PLACEHOLDER.findall(template["user"])
    return list(dict.fromkeys(names))


class PromptRegistry:
    """Immutable prompt versions, strict rendering, test-gated promotion and per-environment rollback."""

    def __init__(self):
        self.prompts = {}
        self.activations = {}

    def definition(self, name, version):
        found = self.prompts.get(name, {}).get(version)
        if found is None:
            raise PromptRegistryError(f"Unknown prompt version {name}@{version}")
        return found

    def register(self, definition):
        versions = self.prompts.setdefault(definition["name"], {})
        if definition["version"] in versions:
            raise PromptRegistryError(f"{definition['name']}@{definition['version']} is already registered; publish a new version instead")
        versions[definition["version"]] = {**definition, "tests": list(definition["tests"])}

    def versions(self, name):
        return list(self.prompts.get(name, {}))

    def render_version(self, name, version, variables):
        template = self.definition(name, version)["template"]
        expected = template_variables(template)
        missing = [variable for variable in expected if variable not in variables]
        unexpected = [variable for variable in variables if variable not in expected]
        if missing or unexpected:
            raise PromptRenderError(missing, unexpected)

        def fill(text):
            return PLACEHOLDER.sub(lambda match: variables[match.group(1)], text)

        return {
            "name": name,
            "version": version,
            "messages": [
                {"role": "system", "content": fill(template["system"])},
                {"role": "user", "content": fill(template["user"])},
            ],
        }

    def active_version(self, name, environment):
        history = self.activations.get((name, environment), [])
        return history[-1] if history else None

    def render(self, name, variables, environment="production"):
        version = self.active_version(name, environment)
        if version is None:
            raise PromptRegistryError(f"No active version of {name} in {environment}")
        return self.render_version(name, version, variables)

    async def run_tests(self, name, version, model):
        report = {"passed": [], "failed": []}
        for prompt_test in self.definition(name, version)["tests"]:
            try:
                response = await model.generate({"messages": self.render_version(name, version, prompt_test["variables"])["messages"]})
                passed = response["finishReason"] == "stop" and prompt_test["check"](response["text"])
            except Exception:
                passed = False
            report["passed" if passed else "failed"].append(prompt_test["name"])
        return report

    async def promote(self, name, version, environment, model):
        if not self.definition(name, version)["tests"]:
            raise PromotionBlockedError([], f"{name}@{version} has no tests and cannot be promoted")
        report = await self.run_tests(name, version, model)
        if report["failed"]:
            raise PromotionBlockedError(report["failed"], f"{name}@{version} failed {', '.join(report['failed'])}")
        self.activations.setdefault((name, environment), []).append(version)

    def rollback(self, name, environment):
        history = self.activations.get((name, environment), [])
        if len(history) < 2:
            raise PromptRegistryError(f"No earlier version of {name} to roll back to in {environment}")
        history.pop()
        return history[-1]


def create_prompt_registry():
    return PromptRegistry()
