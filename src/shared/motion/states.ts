export type MotionState = 'INTRO' | 'PATH_EXPLORER' | 'CURRICULUM' | 'ACTIVITY_TRANSITION' | 'ACTIVITY' | 'RETURN_TRANSITION';

export type RestingState = Exclude<MotionState, 'ACTIVITY_TRANSITION' | 'RETURN_TRANSITION'>;

/**
 * True while the activity shell is mounted: entering, open or returning.
 */
export function isActivityState(state: MotionState): boolean {
  return state === 'ACTIVITY_TRANSITION' || state === 'ACTIVITY' || state === 'RETURN_TRANSITION';
}
