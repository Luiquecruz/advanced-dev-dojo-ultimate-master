import { isTrackEnabled } from './featureFlags';
import { LANGUAGES } from './languages';
import { buildTracks } from './loader';

export { isTrackEnabled, TRACK_FLAGS } from './featureFlags';
export { LANGUAGES } from './languages';
export type { Challenge, Concept, EngineId, LanguageId, LanguageInfo, LanguageRegistry, Lesson, Level, Module, ProjectFiles, QuizQuestion, Track, TrackId } from './types';

const textFiles = import.meta.glob<string>(['./*/**/*', '!./*/**/*.json'], { query: '?raw', import: 'default', eager: true });
const jsonFiles = import.meta.glob<unknown>('./*/**/*.json', { import: 'default', eager: true });

export const tracks = buildTracks({ textFiles, jsonFiles }, LANGUAGES);
export const trackById = new Map(tracks.map((track) => [track.id, track]));
export const availableTracks = tracks.filter((track) => isTrackEnabled(track.id));
export const availableTrackById = new Map(availableTracks.map((track) => [track.id, track]));
export const allLessons = tracks.flatMap((track) => track.lessons);
export const lessonByKey = new Map(allLessons.map((lesson) => [lesson.key, lesson]));
