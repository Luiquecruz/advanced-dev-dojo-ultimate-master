const { createModel, embed, cosineSimilarity, countTokens } = require('@dojo/ai');

const RELEASE_NOTES_BODY = ['1. List the pull requests merged since the last tag.', '2. Group them under Added, Changed and Fixed.', '3. Write one customer-facing sentence per change, no internal ticket ids.', '4. Link the migration guide when a change breaks an API.'].join('\n').repeat(6);
const MIGRATIONS_BODY = '1. One migration per change.\n2. Always write the down step.\n3. Never rename a column in one release: add, backfill, switch, drop.';

const SKILLS = [
  { name: 'release-notes', description: 'Write customer-facing release notes from merged pull requests. Use when asked for release notes or a changelog.', triggers: ['release notes', 'changelog'], body: RELEASE_NOTES_BODY },
  { name: 'database-migrations', description: 'Write and review database schema migrations with rollback steps. Use when a change alters tables, columns or indexes.', triggers: ['migration', 'schema'], body: MIGRATIONS_BODY },
  { name: 'incident-postmortem', description: 'Draft a blameless incident postmortem with timeline, impact and follow-up actions. Use after an outage or incident.', triggers: ['postmortem', 'incident'], body: 'Timeline first, then impact, root causes and actions with owners.' },
  { name: 'pdf-forms', description: 'Fill and validate PDF forms with the bundled scripts. Use when a task mentions PDF forms.', triggers: ['pdf'], body: 'Run scripts/fill.py with the field map.' },
];

const FILES = [
  { path: 'packages/api/db/AGENTS.md', content: 'Migrations live in db/migrations and run with npm run migrate.' },
  { path: 'AGENTS.md', content: 'Run npm test before every commit. TypeScript strict mode.' },
  { path: 'packages/apiary/AGENTS.md', content: 'Beekeeping demo app.' },
  { path: 'packages/api/AGENTS.md', content: 'Hono routes, Zod at every boundary.' },
  { path: 'packages/web/AGENTS.md', content: 'React 19, no class components.' },
  { path: 'docs/README.md', content: 'Documentation index.' },
  { path: 'docs/AGENTS.md.bak', content: 'Old rules.' },
];

const BOTH_TASK = 'Add a migration for the archived column, then update the changelog and the release notes';

const score = (skill: { name: string; description: string; triggers: string[] }, task: string) =>
  cosineSimilarity(embed(task), embed(`${skill.name} ${skill.description}`)) + skill.triggers.filter((trigger) => task.toLowerCase().includes(trigger.toLowerCase())).length;

function contextOptions(extra: Record<string, unknown> = {}) {
  return { task: BOTH_TASK, targetPath: 'packages/api/db/migrations/0042_archived.sql', files: FILES, skills: SKILLS, budgetTokens: 2000, ...extra };
}

test('parseSkill reads the frontmatter and body of a SKILL.md and enforces the Agent Skills naming rules', async () => {
  const skill = mod.parseSkill('---\nname: release-notes\ndescription: Write release notes. Use for changelogs.\ntriggers: release notes,  changelog , \nlicense: MIT\n---\n\n# Release notes\n1. List merged PRs.\n', 'release-notes');
  expect(skill).toEqual({ name: 'release-notes', description: 'Write release notes. Use for changelogs.', triggers: ['release notes', 'changelog'], body: '# Release notes\n1. List merged PRs.' });
  expect(mod.parseSkill('---\nname: pdf2\ndescription: PDF forms.\n---\nBody').triggers).toEqual([]);
  const invalid = [
    '# No frontmatter\nname: x',
    '---\nname: never-closed\ndescription: x',
    '---\nname: Release-Notes\ndescription: x\n---\n',
    '---\nname: -notes\ndescription: x\n---\n',
    '---\nname: notes-\ndescription: x\n---\n',
    '---\nname: release--notes\ndescription: x\n---\n',
    `---\nname: ${'a'.repeat(65)}\ndescription: x\n---\n`,
    '---\nname: release-notes\n---\n',
    `---\nname: release-notes\ndescription: ${'x'.repeat(1025)}\n---\n`,
  ];
  for (const markdown of invalid) {
    expect(await captureError(() => mod.parseSkill(markdown))).toBeInstanceOf(mod.SkillError);
  }
  expect(mod.parseSkill(`---\nname: ${'a'.repeat(64)}\ndescription: ok\n---\n`).name).toHaveLength(64);
  expect(await captureError(() => mod.parseSkill('---\nname: release-notes\ndescription: x\n---\n', 'changelog'))).toBeInstanceOf(mod.SkillError);
});

test('contextFilesFor returns the AGENTS.md files of the root and every ancestor folder of the edited file, root first', () => {
  const paths = (target: string) => mod.contextFilesFor(FILES, target).map((file: { path: string }) => file.path);
  expect(paths('packages/api/db/migrations/0042_archived.sql')).toEqual(['AGENTS.md', 'packages/api/AGENTS.md', 'packages/api/db/AGENTS.md']);
  expect(paths('packages/api/src/routes.ts')).toEqual(['AGENTS.md', 'packages/api/AGENTS.md']);
  expect(paths('packages/apiary/hive.ts')).toEqual(['AGENTS.md', 'packages/apiary/AGENTS.md']);
  expect(paths('README.md')).toEqual(['AGENTS.md']);
  expect(paths('docs/guide.md')).toEqual(['AGENTS.md']);
  expect(mod.contextFilesFor(FILES, 'packages/web/App.tsx')[1]).toEqual(FILES[4]);
});

test('scoreSkill adds the embedding similarity of the task and the skill metadata to the number of triggers found in the task', () => {
  const tasks = [BOTH_TASK, 'Draft the POSTMORTEM for the checkout incident', 'Fix the typo in the login button label', 'Fill the PDF form for the audit'];
  for (const task of tasks) {
    for (const skill of SKILLS) {
      expect(mod.scoreSkill(skill, task)).toBeCloseTo(score(skill, task));
    }
  }
  expect(mod.scoreSkill(SKILLS[2], 'Draft the POSTMORTEM for the checkout incident')).toBeGreaterThan(2);
});

test('buildAgentContext puts the context files first, then a metadata-only skill index, then the relevant skills', () => {
  const context = mod.buildAgentContext(contextOptions({ task: 'Write the release notes for version 2.4 from the merged pull requests' }));
  expect(context.sections.map((section: { kind: string; name: string }) => `${section.kind}:${section.name}`)).toEqual([
    'context-file:AGENTS.md',
    'context-file:packages/api/AGENTS.md',
    'context-file:packages/api/db/AGENTS.md',
    'skill-index:skills',
    'skill:release-notes',
  ]);
  expect(context.loaded).toEqual(['release-notes']);
  const index = context.sections[3].text;
  for (const skill of SKILLS) {
    expect(index).toContain(skill.name);
    expect(index).toContain(skill.description);
  }
  expect(index).not.toContain(MIGRATIONS_BODY.split('\n')[1]);
  expect(context.sections[0].text).toContain('Run npm test before every commit.');
  expect(context.sections[4].text).toContain('Group them under Added, Changed and Fixed.');
  expect(context.system).toBe(context.sections.map((section: { text: string }) => section.text).join('\n\n'));
  context.sections.forEach((section: { text: string; tokens: number }) => expect(section.tokens).toBe(countTokens(section.text)));
  expect(context.tokens).toBe(context.sections.reduce((total: number, section: { tokens: number }) => total + section.tokens, 0));
  expect(context.system).not.toContain(MIGRATIONS_BODY);

  const unrelated = mod.buildAgentContext(contextOptions({ task: 'Fix the typo in the login button label', targetPath: 'packages/web/Login.tsx' }));
  expect(unrelated.loaded).toEqual([]);
  expect(unrelated.skipped.every((skipped: { reason: string }) => skipped.reason === 'below_threshold')).toBe(true);
  expect(unrelated.skipped).toHaveLength(4);
});

test('buildAgentContext ranks skills by score, skips the ones below minScore, over the limit or over the token budget, and never drops always-on context', async () => {
  const ranked = [...SKILLS].sort((left, right) => score(right, BOTH_TASK) - score(left, BOTH_TASK));
  expect(ranked.slice(0, 2).map((skill) => skill.name)).toEqual(['release-notes', 'database-migrations']);
  const belowThreshold = SKILLS.filter((skill) => score(skill, BOTH_TASK) < 0.5).map((skill) => skill.name).sort();

  const roomy = mod.buildAgentContext(contextOptions());
  expect(roomy.loaded).toEqual(['release-notes', 'database-migrations']);
  expect(roomy.skipped.map((skipped: { name: string }) => skipped.name).sort()).toEqual(belowThreshold);

  const alwaysOn = roomy.sections.filter((section: { kind: string }) => section.kind !== 'skill').reduce((total: number, section: { tokens: number }) => total + section.tokens, 0);
  const migrationsTokens = countTokens(`# Skill: database-migrations\n${MIGRATIONS_BODY}`);
  const tight = mod.buildAgentContext(contextOptions({ budgetTokens: alwaysOn + migrationsTokens }));
  expect(tight.loaded).toEqual(['database-migrations']);
  expect(tight.skipped).toContainEqual({ name: 'release-notes', reason: 'over_budget' });
  expect(tight.tokens).toBeLessThanOrEqual(alwaysOn + migrationsTokens);

  const limited = mod.buildAgentContext(contextOptions({ maxSkills: 1 }));
  expect(limited.loaded).toEqual(['release-notes']);
  expect(limited.skipped).toContainEqual({ name: 'database-migrations', reason: 'limit' });

  const strict = mod.buildAgentContext(contextOptions({ minScore: 3 }));
  expect(strict.loaded).toEqual([]);

  const error = await captureError(() => mod.buildAgentContext(contextOptions({ budgetTokens: alwaysOn - 1 })));
  expect(error).toBeInstanceOf(mod.ContextBudgetError);
});

test('answerWithSkills offers a load_skill tool and loads skills on demand: known, unknown, already loaded and over budget', async () => {
  fakeModel.reply(
    respond.toolCalls([{ name: 'load_skill', arguments: { name: 'pdf-forms' } }, { name: 'load_skill', arguments: { name: 'release-notes' } }, { name: 'load_skill', arguments: { name: 'cooking' } }]),
    respond.toolCall('deploy', { environment: 'production' }),
    respond.text('Here is the plan.'),
  );
  const result = await mod.answerWithSkills(createModel(), contextOptions({ task: 'Write the release notes for version 2.4 from the merged pull requests' }));
  expect(result.answer).toBe('Here is the plan.');
  expect(result.steps).toBe(3);
  expect(result.loaded).toEqual(['release-notes', 'pdf-forms']);
  const first = fakeModel.requests[0];
  expect(first.tools.map((tool: { name: string }) => tool.name)).toEqual(['load_skill']);
  expect(first.messages[0].role).toBe('system');
  expect(first.messages[0].content).toContain('Run npm test before every commit.');
  expect(first.messages[1]).toEqual({ role: 'user', content: 'Write the release notes for version 2.4 from the merged pull requests' });
  const toolMessages = fakeModel.requests[1].messages.filter((message: { role: string }) => message.role === 'tool');
  expect(toolMessages).toHaveLength(3);
  expect(toolMessages[0].content).toContain('Run scripts/fill.py');
  expect(toolMessages[1].content).toContain('already loaded');
  expect(toolMessages[2].content).toContain('Unknown skill');
  expect(fakeModel.requests[1].messages.at(-4).toolCalls).toHaveLength(3);
  expect(toolMessages.map((message: { toolCallId: string }) => message.toolCallId)).toEqual(fakeModel.responses[0].toolCalls.map((call: { id: string }) => call.id));
  expect(fakeModel.requests[2].messages.at(-1).content).toContain('Unknown tool');
  expect(result.tokens).toBe(mod.buildAgentContext(contextOptions({ task: 'Write the release notes for version 2.4 from the merged pull requests' })).tokens + countTokens('# Skill: pdf-forms\nRun scripts/fill.py with the field map.'));

  const typo = { task: 'Fix the typo in the login button label' };
  const alwaysOn = mod.buildAgentContext(contextOptions(typo)).tokens;
  fakeModel.reset().reply(respond.toolCall('load_skill', { name: 'release-notes' }), respond.text('Done without it.'));
  const tight = await mod.answerWithSkills(createModel(), contextOptions({ ...typo, budgetTokens: alwaysOn + 20 }));
  expect(tight.loaded).toEqual([]);
  expect(fakeModel.requests[1].messages.at(-1).content).toContain('budget');
});

test('answerWithSkills returns whatever path the model takes and stops after maxSteps without an answer', async () => {
  await forEachSeed(16, async () => {
    fakeModel.handle((request, context) =>
      request.messages.some((message) => message.role === 'tool')
        ? respond.text(['Migration written with a down step.', 'Done: see the migration.'])
        : context.pick([respond.toolCall('load_skill', { name: 'incident-postmortem' }), respond.text('Nothing to load.')]),
    );
    const result = await mod.answerWithSkills(createModel(), contextOptions({ task: 'Add a migration for the archived column' }));
    expect(typeof result.answer).toBe('string');
    expect(result.loaded[0]).toBe('database-migrations');
    expect(result.steps).toBe(fakeModel.requests.length);
    expect(result.loaded.includes('incident-postmortem')).toBe(fakeModel.requests.length === 2);
  });
  fakeModel.reset().handle(() => respond.toolCall('load_skill', { name: 'pdf-forms' }));
  const looping = await mod.answerWithSkills(createModel(), contextOptions({ maxSteps: 3 }));
  expect(looping.answer).toBeNull();
  expect(looping.steps).toBe(3);
  expect(fakeModel.requests).toHaveLength(3);
});
