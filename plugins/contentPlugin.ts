import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import type { Plugin } from 'vite';
import { LANGUAGES } from '../src/content/languages.ts';
import { buildTracks, splitCatalog, type ContentSources, type StoredLessonContent } from '../src/content/loader.ts';
import type { Track } from '../src/content/types.ts';

const CATALOG_ID = 'virtual:dojo-content';
const LESSON_PREFIX = `${CATALOG_ID}/lesson/`;
const RESOLVED_PREFIX = '\0';

interface ContentBundle {
  catalog: Track[];
  contents: Map<string, StoredLessonContent>;
}

function listFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith('.')) {
      return [];
    }
    const path = join(directory, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

function readSources(contentRoot: string): ContentSources {
  const sources: ContentSources = { textFiles: {}, jsonFiles: {} };
  const trackDirectories = readdirSync(contentRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'));
  for (const directory of trackDirectories) {
    for (const path of listFiles(join(contentRoot, directory.name))) {
      const key = `./${relative(contentRoot, path).split(sep).join('/')}`;
      const text = readFileSync(path, 'utf8');
      if (path.endsWith('.json')) {
        sources.jsonFiles[key] = JSON.parse(text);
      } else {
        sources.textFiles[key] = text;
      }
    }
  }
  return sources;
}

/**
 * JavaScript literal of a JSON value that is safe to splice into generated code: `<`, `>`, `/` and the U+2028/U+2029
 * line separators are escaped, so no value can close a script context or a string.
 */
function jsLiteral(value: unknown): string {
  return JSON.stringify(value).replace(/[<>/\u2028\u2029]/g, (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

function catalogModule({ catalog }: ContentBundle): string {
  const loaders = catalog
    .flatMap((track) => track.lessons)
    .map((lesson) => `  ${jsLiteral(lesson.key)}: () => import(${jsLiteral(`${LESSON_PREFIX}${lesson.key}`)}),`)
    .join('\n');
  const tracks = catalog.map(({ lessons, ...track }) => track);
  return `export const tracks = ${jsLiteral(tracks)};\nexport const lessonLoaders = {\n${loaders}\n};\n`;
}

/**
 * Serves lesson content as virtual modules: `virtual:dojo-content` holds the catalog (tracks, modules and lesson metadata)
 * and one lazy `virtual:dojo-content/lesson/<track>/<lesson>` module per lesson holds its body.
 */
export function contentPlugin(): Plugin {
  let contentRoot = '';
  let bundle: ContentBundle | undefined;

  const load = (): ContentBundle => {
    bundle ??= splitCatalog(buildTracks(readSources(contentRoot), LANGUAGES));
    return bundle;
  };

  return {
    name: 'dojo-content',
    configResolved(config) {
      contentRoot = resolve(config.root, 'src/content');
    },
    resolveId(id) {
      return id === CATALOG_ID || id.startsWith(LESSON_PREFIX) ? `${RESOLVED_PREFIX}${id}` : undefined;
    },
    load(id) {
      if (!id.startsWith(`${RESOLVED_PREFIX}${CATALOG_ID}`)) {
        return undefined;
      }
      const content = load();
      const virtualId = id.slice(RESOLVED_PREFIX.length);
      if (virtualId === CATALOG_ID) {
        return { code: catalogModule(content), map: { mappings: '' } };
      }
      const lesson = content.contents.get(virtualId.slice(LESSON_PREFIX.length));
      if (!lesson) {
        this.error(`Unknown lesson module "${virtualId}"`);
      }
      return { code: `export default ${jsLiteral(lesson)};\n`, map: { mappings: '' } };
    },
    configureServer(server) {
      const isTrackFile = (file: string) => {
        const path = relative(contentRoot, file);
        return !path.startsWith('..') && path.includes(sep);
      };
      server.watcher.on('all', (_event, file) => {
        if (!isTrackFile(file)) {
          return;
        }
        bundle = undefined;
        for (const environment of Object.values(server.environments)) {
          for (const [id, module] of environment.moduleGraph.idToModuleMap) {
            if (id.startsWith(`${RESOLVED_PREFIX}${CATALOG_ID}`)) {
              environment.moduleGraph.invalidateModule(module);
            }
          }
        }
        server.ws.send({ type: 'full-reload' });
      });
    },
  };
}
