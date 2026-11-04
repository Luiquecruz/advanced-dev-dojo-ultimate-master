import { cosineSimilarity, countTokens, embed } from '@dojo/ai';
import type { GenerateRequest, GenerateResponse, ToolDefinition } from '@dojo/ai';

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

export function parseSkill(markdown: string, folderName?: string): Skill {
  // TODO: read name, description and triggers from the frontmatter, the body after it, and enforce the naming rules
  throw new Error('Not implemented');
}

export function contextFilesFor(files: ContextFile[], targetPath: string): ContextFile[] {
  // TODO: the AGENTS.md files of the root and of every ancestor folder of targetPath, root first
  return files.filter((file) => file.path.endsWith('AGENTS.md'));
}

export function scoreSkill(skill: Skill, task: string): number {
  // TODO: cosine similarity of embed(task) and embed(`${name} ${description}`) plus the number of triggers found in the task
  return cosineSimilarity(embed(task), embed(skill.description));
}

export function buildAgentContext({ task, targetPath, files, skills, budgetTokens, minScore = 0.5, maxSkills = 2 }: ContextOptions): AgentContext {
  // TODO: context files, then the skill index (metadata only), then the best skills that pass minScore, maxSkills and the token budget
  const sections: ContextSection[] = [...files, ...skills.map((skill) => ({ path: skill.name, content: skill.body }))].map((file) => ({
    kind: 'context-file',
    name: file.path,
    text: file.content,
    tokens: countTokens(file.content),
  }));
  return { system: sections.map((section) => section.text).join('\n\n'), sections, tokens: 0, loaded: skills.map((skill) => skill.name), skipped: [] };
}

export async function answerWithSkills(model: ChatModel, options: ContextOptions & { maxSteps?: number }): Promise<SkillAnswer> {
  // TODO: offer LOAD_SKILL_TOOL, answer each load_skill call with a tool message, stop on a text answer or after maxSteps
  const context = buildAgentContext(options);
  const response = await model.generate({ messages: [{ role: 'system', content: context.system }, { role: 'user', content: options.task }] });
  return { answer: response.text, loaded: context.loaded, steps: 1, tokens: context.tokens };
}
