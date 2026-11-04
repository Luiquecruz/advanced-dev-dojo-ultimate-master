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
    # TODO: names of every {{ variable }} in the system and user templates, unique, in order of first appearance
    return []


class PromptRegistry:
    """Immutable prompt versions, strict rendering, test-gated promotion and per-environment rollback."""

    def __init__(self):
        self.prompts = {}
        self.active = {}

    def register(self, definition):
        # TODO: keep every version, reject a version that already exists, never activate on register
        self.prompts[definition["name"]] = definition
        self.active[(definition["name"], "production")] = definition["version"]

    def versions(self, name):
        return [self.prompts[name]["version"]] if name in self.prompts else []

    def render_version(self, name, version, variables):
        # TODO: find the exact version, reject missing and unexpected variables, fill placeholders in one pass
        definition = self.prompts[name]
        system = definition["template"]["system"]
        user = definition["template"]["user"]
        for variable, value in variables.items():
            system = system.replace("{{" + variable + "}}", value)
            user = user.replace("{{" + variable + "}}", value)
        return {"name": name, "version": definition["version"], "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]}

    def active_version(self, name, environment):
        return self.active.get((name, environment))

    def render(self, name, variables, environment="production"):
        return self.render_version(name, self.active.get((name, environment), ""), variables)

    async def run_tests(self, name, version, model):
        # TODO: run every test of the version against the model; a test passes when the reply finished normally and check(text) is True
        return {"passed": [], "failed": []}

    async def promote(self, name, version, environment, model):
        # TODO: refuse versions without tests or with failing tests; otherwise make the version active and remember the previous one
        self.active[(name, environment)] = version

    def rollback(self, name, environment):
        # TODO: restore the previously active version of this environment
        raise PromptRegistryError("Not implemented")


def create_prompt_registry():
    return PromptRegistry()
