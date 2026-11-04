import { isTrackEnabled } from './featureFlags';
import { LANGUAGES } from './languages';
import { buildTracks } from './loader';

const textFiles = import.meta.glob<string>(['./*/**/*', '!./*/**/*.json'], { query: '?raw', import: 'default', eager: true });
const jsonFiles = import.meta.glob<unknown>('./*/**/*.json', { import: 'default', eager: true });

/**
 * Every track with full lesson bodies, built synchronously. Used by lesson verification only; the app reads the catalog
 * from `@/content` and loads lesson bodies on demand.
 */
export const tracks = buildTracks({ textFiles, jsonFiles }, LANGUAGES);
export const trackById = new Map(tracks.map((track) => [track.id, track]));
export const availableTracks = tracks.filter((track) => isTrackEnabled(track.id));
export const allLessons = tracks.flatMap((track) => track.lessons);
