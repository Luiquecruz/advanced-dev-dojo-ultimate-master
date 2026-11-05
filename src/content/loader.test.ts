// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildTracks } from './loader';
import type { LanguageRegistry } from './types';

const languages: LanguageRegistry = {
  node: { label: 'Node.js', engine: 'node' },
  python: { label: 'Python', engine: 'node' },
};

const lessonMeta = { title: 'Agent loop', summary: 'Build an agent loop with a budget.', level: 'intermediate' };

function sources(text: Record<string, string>, json: Record<string, unknown>) {
  return { textFiles: text, jsonFiles: json };
}

describe('buildTracks', () => {
  it('keeps single-language tracks on one challenge built from the lesson folder', () => {
    const [track] = buildTracks(
      sources(
        { './node/01-basics/01-intro/challenge.md': 'Do it', './node/01-basics/01-intro/starter.ts': 'start', './node/01-basics/01-intro/solution.ts': 'done', './node/01-basics/01-intro/tests.ts': 'test()' },
        {
          './node/track.json': { engine: 'node', title: 'Node.js', monogram: 'N', description: 'd', version: 'v' },
          './node/01-basics/module.json': { title: 'Basics', description: 'd' },
          './node/01-basics/01-intro/meta.json': lessonMeta,
        },
      ),
      languages,
    );
    const lesson = track.lessons[0];
    expect(track.languages).toEqual([]);
    expect(lesson.variants).toHaveLength(1);
    expect(lesson.challenge).toBe(lesson.variants[0]);
    expect(lesson.challenge).toMatchObject({ engine: 'node', language: undefined, entry: 'main.ts', starter: { 'main.ts': 'start' } });
  });

  it('builds one challenge per language from variants folders, sharing lesson-level text unless a variant overrides it', () => {
    const lessonDirectory = './ai/01-agents/01-loop';
    const [track] = buildTracks(
      sources(
        {
          [`${lessonDirectory}/challenge.md`]: 'Shared task',
          [`${lessonDirectory}/hints.md`]: 'First\n---\nSecond',
          [`${lessonDirectory}/approach.md`]: 'Shared approach',
          [`${lessonDirectory}/variants/node/starter.ts`]: 'ts start',
          [`${lessonDirectory}/variants/node/solution.ts`]: 'ts done',
          [`${lessonDirectory}/variants/node/tests.ts`]: 'ts tests',
          [`${lessonDirectory}/variants/python/challenge.md`]: 'Python task',
          [`${lessonDirectory}/variants/python/starter/agent.py`]: 'py start',
          [`${lessonDirectory}/variants/python/solution/agent.py`]: 'py done',
          [`${lessonDirectory}/variants/python/tests.py`]: 'py tests',
        },
        {
          './ai/track.json': { languages: ['node', 'python'], title: 'AI', monogram: 'AI', description: 'd', version: 'v' },
          './ai/01-agents/module.json': { title: 'Agents', description: 'd' },
          [`${lessonDirectory}/meta.json`]: { ...lessonMeta, entry: { python: 'agent.py' }, run: { node: 'demo.ts' } },
        },
      ),
      languages,
    );
    const [node, python] = track.lessons[0].variants;
    expect(track.engine).toBe('node');
    expect(track.languages).toEqual(['node', 'python']);
    expect(node).toMatchObject({ language: 'node', instructions: 'Shared task', entry: 'main.ts', run: 'demo.ts', starter: { 'main.ts': 'ts start' }, tests: 'ts tests', hints: ['First', 'Second'], approach: 'Shared approach', preview: false });
    expect(python.run).toBeUndefined();
    expect(python).toMatchObject({ language: 'python', instructions: 'Python task', entry: 'agent.py', starter: { 'agent.py': 'py start' }, tests: 'py tests', hints: ['First', 'Second'] });
    expect(track.lessons[0].challenge).toBe(node);
  });

  it('offers only the languages a lesson ships and leaves quiz-only lessons without challenges', () => {
    const [track] = buildTracks(
      sources(
        { './ai/01-agents/01-loop/challenge.md': 'Task', './ai/01-agents/01-loop/variants/python/starter.py': 'start', './ai/01-agents/02-quiz/theory.md': 'Theory' },
        {
          './ai/track.json': { languages: ['node', 'python'], title: 'AI', monogram: 'AI', description: 'd', version: 'v' },
          './ai/01-agents/module.json': { title: 'Agents', description: 'd' },
          './ai/01-agents/01-loop/meta.json': lessonMeta,
          './ai/01-agents/02-quiz/meta.json': lessonMeta,
        },
      ),
      languages,
    );
    const [loop, quiz] = track.lessons;
    expect(loop.variants.map((variant) => variant.language)).toEqual(['python']);
    expect(loop.challenge?.language).toBe('python');
    expect(quiz.variants).toEqual([]);
    expect(quiz.challenge).toBeUndefined();
  });

  it('marks a module optional only when module.json says so and rejects a non-boolean flag', () => {
    const files = (optional: unknown) =>
      sources(
        { './node/00-zero/01-first/challenge.md': 'Do it', './node/00-zero/01-first/starter.ts': 'start', './node/01-basics/01-intro/challenge.md': 'Do it', './node/01-basics/01-intro/starter.ts': 'start' },
        {
          './node/track.json': { engine: 'node', title: 'Node.js', monogram: 'N', description: 'd', version: 'v' },
          './node/00-zero/module.json': { title: 'Zero', description: 'd', optional },
          './node/01-basics/module.json': { title: 'Basics', description: 'd' },
          './node/00-zero/01-first/meta.json': lessonMeta,
          './node/01-basics/01-intro/meta.json': lessonMeta,
        },
      );
    const [track] = buildTracks(files(true), languages);
    expect(track.modules.map((module) => [module.id, module.number, module.optional])).toEqual([
      ['zero', 0, true],
      ['basics', 1, false],
    ]);
    expect(() => buildTracks(files('yes'), languages)).toThrow('Module "node/00-zero" declares a non-boolean "optional"');
  });

  it('numbers modules by their folder prefix and rejects a module folder without one', () => {
    const files = (moduleFolder: string) =>
      sources(
        { [`./node/${moduleFolder}/01-intro/challenge.md`]: 'Do it', [`./node/${moduleFolder}/01-intro/starter.ts`]: 'start' },
        {
          './node/track.json': { engine: 'node', title: 'Node.js', monogram: 'N', description: 'd', version: 'v' },
          [`./node/${moduleFolder}/module.json`]: { title: 'Basics', description: 'd' },
          [`./node/${moduleFolder}/01-intro/meta.json`]: lessonMeta,
        },
      );
    expect(buildTracks(files('07-basics'), languages)[0].modules[0]).toMatchObject({ id: 'basics', number: 7 });
    expect(() => buildTracks(files('basics'), languages)).toThrow('Module "node/basics" needs a numeric folder prefix');
  });

  it('rejects a track that declares an unknown language', () => {
    expect(() => buildTracks(sources({}, { './ai/track.json': { languages: ['rust'], title: 'AI', monogram: 'AI', description: 'd', version: 'v' } }), languages)).toThrow('unknown languages: rust');
  });
});
