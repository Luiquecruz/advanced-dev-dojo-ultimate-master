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

export function templateVariables(template: PromptTemplate): string[] {
  // TODO: names of every {{ variable }} in the system and user templates, unique, in order of first appearance
  return [];
}

export function createPromptRegistry() {
  const prompts = new Map<string, PromptDefinition>();
  const active = new Map<string, string>();

  const renderVersion = (name: string, version: string, variables: Record<string, string>): RenderedPrompt => {
    // TODO: find the exact version, reject missing and unexpected variables, fill placeholders in one pass
    const definition = prompts.get(name)!;
    let system = definition.template.system;
    let user = definition.template.user;
    for (const [variable, value] of Object.entries(variables)) {
      system = system.split(`{{${variable}}}`).join(value);
      user = user.split(`{{${variable}}}`).join(value);
    }
    return { name, version: definition.version, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] };
  };

  return {
    register(next: PromptDefinition): void {
      // TODO: keep every version, reject a version that already exists, never activate on register
      prompts.set(next.name, next);
      active.set(`${next.name}@production`, next.version);
    },
    versions(name: string): string[] {
      const definition = prompts.get(name);
      return definition ? [definition.version] : [];
    },
    renderVersion,
    render(name: string, variables: Record<string, string>, environment = 'production'): RenderedPrompt {
      return renderVersion(name, active.get(`${name}@${environment}`) ?? '', variables);
    },
    activeVersion(name: string, environment: string): string | undefined {
      return active.get(`${name}@${environment}`);
    },
    async runTests(name: string, version: string, model: ChatModel): Promise<TestReport> {
      // TODO: run every test of the version against the model; a test passes when the reply finished normally and check(text) is true
      return { passed: [], failed: [] };
    },
    async promote(name: string, version: string, environment: string, model: ChatModel): Promise<void> {
      // TODO: refuse versions without tests or with failing tests; otherwise make the version active and remember the previous one
      active.set(`${name}@${environment}`, version);
    },
    rollback(name: string, environment: string): string {
      // TODO: restore the previously active version of this environment
      throw new PromptRegistryError('Not implemented');
    },
  };
}
