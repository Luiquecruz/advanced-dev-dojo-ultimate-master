import type { Challenge, Concept, EngineId, LanguageId, LanguageRegistry, Level, Module, ProjectFiles, QuizQuestion, Track, TrackId } from './types';

export interface ContentSources {
  textFiles: Record<string, string>;
  jsonFiles: Record<string, unknown>;
}

interface LessonMeta {
  title: string;
  summary: string;
  level: Level;
  tags?: string[];
  preview?: boolean;
  entry?: string | Record<LanguageId, string>;
  resources?: Array<{ label: string; url: string }>;
}

interface TrackMeta {
  engine?: EngineId;
  languages?: LanguageId[];
  order?: number;
  title: string;
  shortTitle?: string;
  monogram: string;
  description: string;
  version: string;
}

const DEFAULT_ENTRY: Record<EngineId, Record<string, string>> = {
  typescript: { ts: 'main.ts' },
  react: { jsx: 'App.jsx', tsx: 'App.tsx' },
  vue: { vue: 'App.vue', ts: 'main.ts', js: 'main.js' },
  angular: { ts: 'app.ts' },
  node: { ts: 'main.ts', js: 'main.js' },
};

const HEADLESS_ENGINES = new Set<EngineId>(['typescript', 'node']);

function stripPrefix(segment: string): string {
  return segment.replace(/^\d+-/, '');
}

function splitSections(markdown: string | undefined): string[] {
  return (markdown ?? '')
    .split(/^---\s*$/m)
    .map((section) => section.trim())
    .filter(Boolean);
}

function renameSingle(files: ProjectFiles, entry: string): ProjectFiles {
  const single = Object.keys(files).find((name) => name.startsWith('__single__.'));
  return single ? { [entry]: files[single] } : files;
}

/**
 * Builds tracks, modules and lessons from raw lesson files keyed by their path relative to `src/content` (`./<track>/...`).
 */
export function buildTracks({ textFiles, jsonFiles }: ContentSources, languages: LanguageRegistry): Track[] {
  const file = (path: string): string | undefined => textFiles[path];

  const collectFiles = (directory: string, kind: 'starter' | 'solution'): { files: ProjectFiles; extension?: string } => {
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
  };

  const buildChallenge = (lessonDirectory: string, sourceDirectory: string, engine: EngineId, meta: LessonMeta, language?: LanguageId): Challenge | undefined => {
    const instructions = file(`${sourceDirectory}/challenge.md`) ?? file(`${lessonDirectory}/challenge.md`);
    const starter = collectFiles(sourceDirectory, 'starter');
    if (!instructions || Object.keys(starter.files).length === 0) {
      return undefined;
    }
    const solution = collectFiles(sourceDirectory, 'solution');
    const declaredEntry = typeof meta.entry === 'string' ? meta.entry : language ? meta.entry?.[language] : undefined;
    const entry = declaredEntry ?? DEFAULT_ENTRY[engine][starter.extension ?? 'ts'] ?? `main.${starter.extension}`;
    const testsPath = Object.keys(textFiles).find((path) => path.startsWith(`${sourceDirectory}/tests.`));
    return {
      engine,
      language,
      instructions,
      starter: renameSingle(starter.files, entry),
      solution: renameSingle(solution.files, entry),
      entry,
      tests: testsPath ? textFiles[testsPath] : '',
      hints: splitSections(file(`${sourceDirectory}/hints.md`) ?? file(`${lessonDirectory}/hints.md`)),
      approach: file(`${sourceDirectory}/approach.md`) ?? file(`${lessonDirectory}/approach.md`) ?? '',
      preview: meta.preview ?? !HEADLESS_ENGINES.has(engine),
    };
  };

  const buildVariants = (track: Track, directory: string, meta: LessonMeta): Challenge[] => {
    if (track.languages.length === 0) {
      const challenge = buildChallenge(directory, directory, track.engine, meta);
      return challenge ? [challenge] : [];
    }
    return track.languages.flatMap((language) => {
      const challenge = buildChallenge(directory, `${directory}/variants/${language}`, languages[language].engine, meta, language);
      return challenge ? [challenge] : [];
    });
  };

  const tracks = new Map<TrackId, Track>();
  const modules = new Map<string, Module>();
  const lessonDirectories = new Set<string>();

  for (const path of Object.keys(jsonFiles)) {
    const segments = path.split('/');
    const trackId = segments[1];
    if (segments.length === 3 && segments[2] === 'track.json') {
      const { engine, languages: trackLanguages = [], order = 100, ...meta } = jsonFiles[path] as TrackMeta;
      const unknown = trackLanguages.filter((language) => !languages[language]);
      if (unknown.length > 0) {
        throw new Error(`Track "${trackId}" declares unknown languages: ${unknown.join(', ')}`);
      }
      const defaultEngine = engine ?? (trackLanguages[0] ? languages[trackLanguages[0]].engine : (trackId as EngineId));
      tracks.set(trackId, { ...meta, id: trackId, engine: defaultEngine, languages: trackLanguages, order, modules: [], lessons: [] });
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
    const [, trackId, moduleDirectory, lessonDirectory] = directory.split('/');
    const module = modules.get(`${trackId}/${moduleDirectory}`);
    const track = tracks.get(trackId);
    if (!module || !track) {
      continue;
    }
    const meta = jsonFiles[`${directory}/meta.json`] as LessonMeta;
    const id = stripPrefix(lessonDirectory);
    const variants = buildVariants(track, directory, meta);
    module.lessons.push({
      key: `${trackId}/${id}`,
      id,
      folder: `${trackId}/${moduleDirectory}/${lessonDirectory}`,
      trackId,
      moduleId: module.id,
      title: meta.title,
      summary: meta.summary,
      level: meta.level,
      tags: meta.tags ?? [],
      theory: file(`${directory}/theory.md`) ?? '',
      concepts: (jsonFiles[`${directory}/concepts.json`] as Concept[] | undefined) ?? [],
      quiz: (jsonFiles[`${directory}/quiz.json`] as QuizQuestion[] | undefined) ?? [],
      resources: meta.resources ?? [],
      challenge: variants[0],
      variants,
    });
  }

  for (const [key, module] of [...modules.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const track = tracks.get(key.split('/')[0]);
    if (track && module.lessons.length > 0) {
      track.modules.push(module);
      track.lessons.push(...module.lessons);
    }
  }

  return [...tracks.values()].sort((a, b) => a.order - b.order);
}
