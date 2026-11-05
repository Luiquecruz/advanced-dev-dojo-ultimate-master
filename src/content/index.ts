// eslint-disable-next-line @typescript-eslint/triple-slash-reference -- types of the virtual module served by plugins/contentPlugin.ts
/// <reference path="./virtual.d.ts" />
import { lessonLoaders, tracks as catalog } from 'virtual:dojo-content';
import { isTrackEnabled } from './featureFlags';
import { restoreLesson } from './loader';
import type { Lesson, LessonEntry, Track } from './types';

export { isTrackEnabled, TRACK_FLAGS } from './featureFlags';
export { LANGUAGES } from './languages';
export type { Challenge, Concept, EngineId, LanguageId, LanguageInfo, LanguageRegistry, Lesson, LessonContent, LessonEntry, Level, Module, ProjectFiles, QuizQuestion, Track, TrackId } from './types';

export const tracks: Track[] = catalog.map((track) => ({ ...track, lessons: track.modules.flatMap((module) => module.lessons) }));
export const availableTracks = tracks.filter((track) => isTrackEnabled(track.id));
export const availableTrackById = new Map(availableTracks.map((track) => [track.id, track]));

const loadedLessons = new Map<string, Promise<Lesson>>();

/**
 * Loads the body of a lesson (theory, challenges, quiz) on demand; the promise is cached per lesson.
 */
export function loadLesson(entry: LessonEntry): Promise<Lesson> {
  let lesson = loadedLessons.get(entry.key);
  if (!lesson) {
    lesson = lessonLoaders[entry.key]().then((module) => restoreLesson(entry, module.default));
    lesson.catch(() => loadedLessons.delete(entry.key));
    loadedLessons.set(entry.key, lesson);
  }
  return lesson;
}
