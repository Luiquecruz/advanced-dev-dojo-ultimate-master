import { availableTrackById, availableTracks, type Track } from '@/content';

export const DEFAULT_TRACK_MASS = 0.5;

/**
 * Amount of content in a track: its lessons plus its coding challenges.
 */
export function trackContent(track: Track): number {
  return track.lessons.length + track.lessons.filter((lesson) => lesson.hasChallenge).length;
}

const HEAVIEST_CONTENT = Math.max(...availableTracks.map(trackContent));

/**
 * Mass of a track from 0 to 1, relative to the track with the most content; the default when no track is shown.
 */
export function trackMass(trackId: string | undefined): number {
  const track = trackId === undefined ? undefined : availableTrackById.get(trackId);
  return track ? trackContent(track) / HEAVIEST_CONTENT : DEFAULT_TRACK_MASS;
}
