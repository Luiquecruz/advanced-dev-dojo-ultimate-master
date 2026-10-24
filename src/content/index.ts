export type EngineId = 'typescript' | 'react' | 'vue' | 'angular';
export type TrackId = string;
export type Level = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type ProjectFiles = Record<string, string>;

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface Concept {
  term: string;
  description: string;
}

export interface Challenge {
  instructions: string;
  starter: ProjectFiles;
  solution: ProjectFiles;
  entry: string;
  tests: string;
  hints: string[];
  approach: string;
  preview: boolean;
}

export interface Lesson {
  key: string;
  id: string;
  trackId: TrackId;
  moduleId: string;
  title: string;
  summary: string;
  level: Level;
  tags: string[];
  theory: string;
  concepts: Concept[];
  challenge?: Challenge;
  quiz: QuizQuestion[];
  resources: Array<{ label: string; url: string }>;
}

export interface Module {
  id: string;
  trackId: TrackId;
  title: string;
  description: string;
  lessons: Lesson[];
}

export interface Track {
  id: TrackId;
  engine: EngineId;
  order: number;
  title: string;
  description: string;
  version: string;
  accent: string;
  modules: Module[];
  lessons: Lesson[];
}

interface LessonMeta {
  title: string;
  summary: string;
  level: Level;
  tags?: string[];
  preview?: boolean;
  entry?: string;
  resources?: Array<{ label: string; url: string }>;
}

const DEFAULT_ENTRY: Record<EngineId, Record<string, string>> = {
  typescript: { ts: 'main.ts' },
  react: { jsx: 'App.jsx', tsx: 'App.tsx' },
  vue: { vue: 'App.vue', ts: 'main.ts', js: 'main.js' },
  angular: { ts: 'app.ts' },
};

const textFiles = import.meta.glob<string>(['./*/**/*', '!./*/**/*.json'], { query: '?raw', import: 'default', eager: true });
const jsonFiles = import.meta.glob<unknown>('./*/**/*.json', { import: 'default', eager: true });

function stripPrefix(segment: string): string {
  return segment.replace(/^\d+-/, '');
}

function splitSections(markdown: string | undefined): string[] {
  return (markdown ?? '')
    .split(/^---\s*$/m)
    .map((section) => section.trim())
    .filter(Boolean);
}

function collectFiles(directory: string, kind: 'starter' | 'solution'): { files: ProjectFiles; extension?: string } {
  const files: ProjectFiles = {};
  let extension: string | undefined;
  const prefix = `${directory}/${kind}`;
  for (const [path, content] of Object.entries(textFiles)) {
    if (path.startsWith(`${prefix}/`)) {
      files[path.slice(prefix.length + 1)] = content;
    } else if (path.startsWith(`${prefix}.`)) {
      extension = path.slice(prefix.length + 1);
      files[`__single__.${extension}`] = content;
    }
  }
  return { files, extension };
}

function renameSingle(files: ProjectFiles, entry: string): ProjectFiles {
  const single = Object.keys(files).find((name) => name.startsWith('__single__.'));
  return single ? { [entry]: files[single] } : files;
}

function buildChallenge(engine: EngineId, directory: string, meta: LessonMeta): Challenge | undefined {
  const file = (name: string) => textFiles[`${directory}/${name}`];
  const instructions = file('challenge.md');
  if (!instructions) {
    return undefined;
  }
  const starter = collectFiles(directory, 'starter');
  const solution = collectFiles(directory, 'solution');
  const entry = meta.entry ?? DEFAULT_ENTRY[engine][starter.extension ?? 'ts'] ?? `main.${starter.extension}`;
  const testsPath = Object.keys(textFiles).find((path) => path.startsWith(`${directory}/tests.`));

  return {
    instructions,
    starter: renameSingle(starter.files, entry),
    solution: renameSingle(solution.files, entry),
    entry,
    tests: testsPath ? textFiles[testsPath] : '',
    hints: splitSections(file('hints.md')),
    approach: file('approach.md') ?? '',
    preview: meta.preview ?? engine !== 'typescript',
  };
}

function buildTracks(): Track[] {
  const tracks = new Map<TrackId, Track>();
  const modules = new Map<string, Module>();
  const lessonDirectories = new Set<string>();

  for (const path of Object.keys(jsonFiles)) {
    const segments = path.split('/');
    const trackId = segments[1] as TrackId;
    if (segments.length === 3 && segments[2] === 'track.json') {
      const meta = jsonFiles[path] as Omit<Track, 'id' | 'modules' | 'lessons'>;
      tracks.set(trackId, { ...meta, id: trackId, engine: meta.engine ?? (trackId as EngineId), order: meta.order ?? 100, modules: [], lessons: [] });
    }
    if (segments.length === 4 && segments[3] === 'module.json') {
      const meta = jsonFiles[path] as { title: string; description: string };
      modules.set(`${segments[1]}/${segments[2]}`, { id: stripPrefix(segments[2]), trackId, title: meta.title, description: meta.description, lessons: [] });
    }
    if (segments.length === 5 && segments[4] === 'meta.json') {
      lessonDirectories.add(segments.slice(0, 4).join('/'));
    }
  }

  for (const directory of [...lessonDirectories].sort()) {
    const [, trackId, moduleDirectory, lessonDirectory] = directory.split('/') as [string, TrackId, string, string];
    const module = modules.get(`${trackId}/${moduleDirectory}`);
    if (!module) {
      continue;
    }
    const meta = jsonFiles[`${directory}/meta.json`] as LessonMeta;
    const id = stripPrefix(lessonDirectory);
    module.lessons.push({
      key: `${trackId}/${id}`,
      id,
      trackId,
      moduleId: module.id,
      title: meta.title,
      summary: meta.summary,
      level: meta.level,
      tags: meta.tags ?? [],
      theory: textFiles[`${directory}/theory.md`] ?? '',
      concepts: (jsonFiles[`${directory}/concepts.json`] as Concept[] | undefined) ?? [],
      quiz: (jsonFiles[`${directory}/quiz.json`] as QuizQuestion[] | undefined) ?? [],
      resources: meta.resources ?? [],
      challenge: buildChallenge(tracks.get(trackId)?.engine ?? (trackId as EngineId), directory, meta),
    });
  }

  for (const [key, module] of [...modules.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const track = tracks.get(key.split('/')[0] as TrackId);
    if (track && module.lessons.length > 0) {
      track.modules.push(module);
      track.lessons.push(...module.lessons);
    }
  }

  return [...tracks.values()].sort((a, b) => a.order - b.order);
}

export const tracks = buildTracks();
export const trackById = new Map(tracks.map((track) => [track.id, track]));
export const allLessons = tracks.flatMap((track) => track.lessons);
export const lessonByKey = new Map(allLessons.map((lesson) => [lesson.key, lesson]));
