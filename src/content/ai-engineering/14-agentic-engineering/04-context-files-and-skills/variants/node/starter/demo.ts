import { createModel } from '@dojo/ai';
import { fakeModel, respond } from '@dojo/ai/testing';
import { answerWithSkills, buildAgentContext, parseSkill } from './main';

const SKILL_FILES: Record<string, string> = {
  'release-notes': `---
name: release-notes
description: Write customer-facing release notes from merged pull requests. Use when asked for release notes or a changelog.
triggers: release notes, changelog
---
1. List the pull requests merged since the last tag.
2. Group them under Added, Changed and Fixed.
3. One customer-facing sentence per change.`,
  'database-migrations': `---
name: database-migrations
description: Write and review database schema migrations with rollback steps. Use when a change alters tables, columns or indexes.
triggers: migration, schema
---
1. One migration per change.
2. Always write the down step.
3. Never rename a column in one release: add, backfill, switch, drop.`,
  'incident-postmortem': `---
name: incident-postmortem
description: Draft a blameless incident postmortem with timeline, impact and follow-up actions. Use after an outage or incident.
triggers: postmortem, incident
---
Timeline first, then impact, root causes and actions with owners.`,
};

const FILES = [
  { path: 'AGENTS.md', content: 'Run npm test before every commit. TypeScript strict mode.' },
  { path: 'packages/api/AGENTS.md', content: 'Hono routes, Zod at every boundary.' },
  { path: 'packages/web/AGENTS.md', content: 'React 19, no class components.' },
];

async function main() {
  const skills = Object.entries(SKILL_FILES).map(([folder, markdown]) => parseSkill(markdown, folder));
  const tasks = [
    { task: 'Add a migration that archives old orders', targetPath: 'packages/api/db/0042_archive.sql' },
    { task: 'Fix the typo in the login button label', targetPath: 'packages/web/Login.tsx' },
    { task: 'Draft the postmortem for last night\'s checkout incident and add a changelog entry', targetPath: 'docs/incidents/2026-10-30.md' },
  ];
  for (const { task, targetPath } of tasks) {
    const context = buildAgentContext({ task, targetPath, files: FILES, skills, budgetTokens: 400 });
    console.log(`Task: ${task}`);
    console.log(`  context files: ${context.sections.filter((section) => section.kind === 'context-file').map((section) => section.name).join(', ')}`);
    console.log(`  skills loaded up front: ${context.loaded.join(', ') || 'none'} (${context.tokens} of 400 tokens)`);
    console.log(`  skipped: ${context.skipped.map((skipped) => `${skipped.name} (${skipped.reason})`).join(', ') || 'none'}`);
  }

  fakeModel.reply(
    respond.toolCalls([{ name: 'load_skill', arguments: { name: 'release-notes' } }, { name: 'load_skill', arguments: { name: 'security-review' } }]),
    respond.text('Typo fixed in Login.tsx; release note: "Fixed a typo on the login button."'),
  );
  const result = await answerWithSkills(createModel(), { task: 'Fix the typo in the login button label and note it for the next release', targetPath: 'packages/web/Login.tsx', files: FILES, skills, budgetTokens: 400 });
  const toolReplies = fakeModel.requests[1].messages.filter((message) => message.role === 'tool').map((message) => message.content.split('\n')[0]);
  console.log('\nOn-demand loading during a run');
  console.log(`  tool replies: ${toolReplies.join(' | ')}`);
  console.log(`  loaded: ${result.loaded.join(', ')} after ${result.steps} model calls, ${result.tokens} tokens of context`);
  console.log(`  answer: ${result.answer}`);
}

main().catch((error) => console.error(`demo failed: ${error.message}`));
