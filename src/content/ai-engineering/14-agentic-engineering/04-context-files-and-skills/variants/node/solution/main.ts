import { cosineSimilarity, countTokens, embed } from '@dojo/ai';
import type { GenerateRequest, GenerateResponse, Message, ToolDefinition } from '@dojo/ai';

export interface ChatModel {
  generate(request: GenerateRequest): Promise<GenerateResponse>;
}

export interface ContextFile {
  path: string;
  content: string;
}

export interface Skill {
  name: string;
  description: string;
  triggers: string[];
  body: string;
}

export type SectionKind = 'context-file' | 'skill-index' | 'skill';

export interface ContextSection {
  kind: SectionKind;
  name: string;
  text: string;
  tokens: number;
}

export type SkipReason = 'below_threshold' | 'limit' | 'over_budget';

export interface AgentContext {
  system: string;
  sections: ContextSection[];
  tokens: number;
  loaded: string[];
  skipped: { name: string; reason: SkipReason }[];
}

export interface ContextOptions {
  task: string;
  targetPath: string;
  files: ContextFile[];
  skills: Skill[];
  budgetTokens: number;
  minScore?: number;
  maxSkills?: number;
}

export interface SkillAnswer {
  answer: string | null;
  loaded: string[];
  steps: number;
  tokens: number;
}

export class SkillError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SkillError';
  }
}

export class ContextBudgetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContextBudgetError';
  }
}

export const LOAD_SKILL_TOOL: ToolDefinition = {
  name: 'load_skill',
  description: 'Load the full instructions of one skill from the skill index, by name.',
  parameters: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
};

const SKILL_NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function parseSkill(markdown: string, folderName?: string): Skill {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  if (lines[0].trim() !== '---') {
    throw new SkillError('SKILL.md must start with YAML frontmatter between --- lines');
  }
  const closing = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
  if (closing === -1) {
    throw new SkillError('The frontmatter is not closed with ---');
  }
  const fields = new Map<string, string>();
  for (const line of lines.slice(1, closing)) {
    const separator = line.indexOf(':');
    if (separator > 0) {
      fields.set(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
    }
  }
  const name = fields.get('name') ?? '';
  const description = fields.get('description') ?? '';
  if (name.length === 0 || name.length > 64 || !SKILL_NAME.test(name)) {
    throw new SkillError(`Invalid skill name "${name}": 1-64 lowercase letters, digits and single hyphens, not at the start or end`);
  }
  if (folderName !== undefined && folderName !== name) {
    throw new SkillError(`Skill name "${name}" does not match its folder "${folderName}"`);
  }
  if (description.length === 0 || description.length > 1024) {
    throw new SkillError(`Skill "${name}" needs a description of 1-1024 characters`);
  }
  const triggers = (fields.get('triggers') ?? '')
    .split(',')
    .map((trigger) => trigger.trim())
    .filter(Boolean);
  return { name, description, triggers, body: lines.slice(closing + 1).join('\n').trim() };
}

export function contextFilesFor(files: ContextFile[], targetPath: string): ContextFile[] {
  const directoryOf = (path: string) => (path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '');
  const targetDirectory = directoryOf(targetPath);
  return files
    .filter((file) => file.path === 'AGENTS.md' || file.path.endsWith('/AGENTS.md'))
    .filter((file) => {
      const directory = directoryOf(file.path);
      return directory === '' || targetDirectory === directory || targetDirectory.startsWith(`${directory}/`);
    })
    .sort((left, right) => left.path.split('/').length - right.path.split('/').length);
}

export function scoreSkill(skill: Skill, task: string): number {
  const similarity = cosineSimilarity(embed(task), embed(`${skill.name} ${skill.description}`));
  const lowerTask = task.toLowerCase();
  const hits = skill.triggers.filter((trigger) => lowerTask.includes(trigger.toLowerCase())).length;
  return similarity + hits;
}

function section(kind: SectionKind, name: string, text: string): ContextSection {
  return { kind, name, text, tokens: countTokens(text) };
}

function skillSection(skill: Skill): ContextSection {
  return section('skill', skill.name, `# Skill: ${skill.name}\n${skill.body}`);
}

export function buildAgentContext({ task, targetPath, files, skills, budgetTokens, minScore = 0.5, maxSkills = 2 }: ContextOptions): AgentContext {
  const sections = contextFilesFor(files, targetPath).map((file) => section('context-file', file.path, `# ${file.path}\n${file.content}`));
  if (skills.length > 0) {
    const index = skills.map((skill) => `- ${skill.name}: ${skill.description}`).join('\n');
    sections.push(section('skill-index', 'skills', `Available skills (load one by name when it applies):\n${index}`));
  }
  let used = sections.reduce((total, current) => total + current.tokens, 0);
  if (used > budgetTokens) {
    throw new ContextBudgetError(`Always-on context needs ${used} tokens, above the budget of ${budgetTokens}`);
  }
  const ranked = skills
    .map((skill) => ({ skill, score: scoreSkill(skill, task) }))
    .sort((left, right) => right.score - left.score || left.skill.name.localeCompare(right.skill.name));
  const loaded: string[] = [];
  const skipped: AgentContext['skipped'] = [];
  for (const { skill, score } of ranked) {
    const candidate = skillSection(skill);
    if (score < minScore) {
      skipped.push({ name: skill.name, reason: 'below_threshold' });
    } else if (loaded.length >= maxSkills) {
      skipped.push({ name: skill.name, reason: 'limit' });
    } else if (used + candidate.tokens > budgetTokens) {
      skipped.push({ name: skill.name, reason: 'over_budget' });
    } else {
      sections.push(candidate);
      loaded.push(skill.name);
      used += candidate.tokens;
    }
  }
  return { system: sections.map((current) => current.text).join('\n\n'), sections, tokens: used, loaded, skipped };
}

function requestedSkill(argumentsText: string): string | undefined {
  try {
    const parsed = JSON.parse(argumentsText);
    return typeof parsed?.name === 'string' ? parsed.name : undefined;
  } catch {
    return undefined;
  }
}

export async function answerWithSkills(model: ChatModel, options: ContextOptions & { maxSteps?: number }): Promise<SkillAnswer> {
  const { maxSteps = 4, ...contextOptions } = options;
  const context = buildAgentContext(contextOptions);
  const loaded = [...context.loaded];
  let tokens = context.tokens;
  const messages: Message[] = [
    { role: 'system', content: context.system },
    { role: 'user', content: options.task },
  ];
  for (let step = 1; step <= maxSteps; step++) {
    const response = await model.generate({ messages: [...messages], tools: [LOAD_SKILL_TOOL] });
    messages.push({ role: 'assistant', content: response.text, toolCalls: response.toolCalls });
    if (response.toolCalls.length === 0) {
      return { answer: response.text, loaded, steps: step, tokens };
    }
    for (const call of response.toolCalls) {
      messages.push({ role: 'tool', toolCallId: call.id, content: loadSkill(call.name, call.arguments) });
    }
  }
  return { answer: null, loaded, steps: maxSteps, tokens };

  function loadSkill(toolName: string, argumentsText: string): string {
    if (toolName !== LOAD_SKILL_TOOL.name) {
      return `Unknown tool: ${toolName}. The only tool is load_skill.`;
    }
    const name = requestedSkill(argumentsText);
    const skill = options.skills.find((candidate) => candidate.name === name);
    if (!skill) {
      return `Unknown skill: ${name ?? argumentsText}. Pick a name from the skill index.`;
    }
    if (loaded.includes(skill.name)) {
      return `Skill ${skill.name} is already loaded in the system message.`;
    }
    const candidate = skillSection(skill);
    if (tokens + candidate.tokens > options.budgetTokens) {
      return `Skill ${skill.name} needs ${candidate.tokens} tokens and does not fit the remaining context budget of ${options.budgetTokens - tokens}.`;
    }
    loaded.push(skill.name);
    tokens += candidate.tokens;
    return candidate.text;
  }
}
