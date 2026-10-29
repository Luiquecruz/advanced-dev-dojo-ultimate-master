/**
 * Tracks hidden from the UI while disabled. Disabled tracks keep their content and verification suites.
 */
export const TRACK_FLAGS: Readonly<Record<string, boolean>> = {
  vue: false,
  angular: false,
};

/**
 * Whether a track is shown to learners. Tracks without a flag are enabled.
 */
export function isTrackEnabled(trackId: string): boolean {
  return TRACK_FLAGS[trackId] !== false;
}
