import type { GenerateRequest, GenerateResponse, Message } from '@dojo/ai';

export interface PromptTemplate {
  system: string;
  user: string;
}

export interface PromptTest {
  name: string;
  variables: Record<string, string>;
  check: (output: string) => boolean;
}

export interface PromptDefinition {
  name: string;
  version: string;
  template: PromptTemplate;
  tests: PromptTest[];
}

export interface RenderedPrompt {
  name: string;
  version: string;
  messages: Message[];
}

export interface TestReport {
  passed: string[];
  failed: string[];
}

export interface ChatModel {
  generate(request: GenerateRequest): Promise<GenerateResponse>;
}

export class PromptRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PromptRegistryError';
  }
}

export class PromptRenderError extends Error {
  constructor(
    readonly missing: string[],
    readonly unexpected: string[],
  ) {
    super(`Cannot render prompt: missing [${missing.join(', ')}], unexpected [${unexpected.join(', ')}]`);
    this.name = 'PromptRenderError';
  }
}

export class PromotionBlockedError extends Error {
  constructor(
    readonly failedTests: string[],
    message: string,
  ) {
    super(message);
    this.name = 'PromotionBlockedError';
  }
}

const PLACEHOLDER = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;

export function templateVariables(template: PromptTemplate): string[] {
  const names = [...template.system.matchAll(PLACEHOLDER), ...template.user.matchAll(PLACEHOLDER)].map((match) => match[1]);
  return [...new Set(names)];
}

export function createPromptRegistry() {
  const prompts = new Map<string, Map<string, PromptDefinition>>();
  const activations = new Map<string, string[]>();
  const historyKey = (name: string, environment: string) => `${name}@${environment}`;

  const definition = (name: string, version: string): PromptDefinition => {
    const found = prompts.get(name)?.get(version);
    if (!found) {
      throw new PromptRegistryError(`Unknown prompt version ${name}@${version}`);
    }
    return found;
  };

  const renderVersion = (name: string, version: string, variables: Record<string, string>): RenderedPrompt => {
    const { template } = definition(name, version);
    const expected = templateVariables(template);
    const missing = expected.filter((variable) => !(variable in variables));
    const unexpected = Object.keys(variables).filter((variable) => !expected.includes(variable));
    if (missing.length > 0 || unexpected.length > 0) {
      throw new PromptRenderError(missing, unexpected);
    }
    const fill = (text: string) => text.replace(PLACEHOLDER, (_, variable: string) => variables[variable]);
    return {
      name,
      version,
      messages: [
        { role: 'system', content: fill(template.system) },
        { role: 'user', content: fill(template.user) },
      ],
    };
  };

  const activeVersion = (name: string, environment: string): string | undefined => activations.get(historyKey(name, environment))?.at(-1);

  const runTests = async (name: string, version: string, model: ChatModel): Promise<TestReport> => {
    const report: TestReport = { passed: [], failed: [] };
    for (const test of definition(name, version).tests) {
      try {
        const response = await model.generate({ messages: renderVersion(name, version, test.variables).messages });
        const passed = response.finishReason === 'stop' && test.check(response.text);
        report[passed ? 'passed' : 'failed'].push(test.name);
      } catch {
        report.failed.push(test.name);
      }
    }
    return report;
  };

  return {
    register(next: PromptDefinition): void {
      const versions = prompts.get(next.name) ?? new Map<string, PromptDefinition>();
      if (versions.has(next.version)) {
        throw new PromptRegistryError(`${next.name}@${next.version} is already registered; publish a new version instead`);
      }
      versions.set(next.version, { ...next, tests: [...next.tests] });
      prompts.set(next.name, versions);
    },
    versions(name: string): string[] {
      return [...(prompts.get(name)?.keys() ?? [])];
    },
    renderVersion,
    render(name: string, variables: Record<string, string>, environment = 'production'): RenderedPrompt {
      const version = activeVersion(name, environment);
      if (version === undefined) {
        throw new PromptRegistryError(`No active version of ${name} in ${environment}`);
      }
      return renderVersion(name, version, variables);
    },
    activeVersion,
    runTests,
    async promote(name: string, version: string, environment: string, model: ChatModel): Promise<void> {
      const { tests } = definition(name, version);
      if (tests.length === 0) {
        throw new PromotionBlockedError([], `${name}@${version} has no tests and cannot be promoted`);
      }
      const report = await runTests(name, version, model);
      if (report.failed.length > 0) {
        throw new PromotionBlockedError(report.failed, `${name}@${version} failed ${report.failed.join(', ')}`);
      }
      const key = historyKey(name, environment);
      activations.set(key, [...(activations.get(key) ?? []), version]);
    },
    rollback(name: string, environment: string): string {
      const history = activations.get(historyKey(name, environment)) ?? [];
      if (history.length < 2) {
        throw new PromptRegistryError(`No earlier version of ${name} to roll back to in ${environment}`);
      }
      history.pop();
      return history[history.length - 1];
    },
  };
}
