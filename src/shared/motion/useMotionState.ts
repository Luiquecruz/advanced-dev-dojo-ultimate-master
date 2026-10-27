import { useSyncExternalStore } from 'react';
import { motionCoordinator } from './coordinator';
import type { MotionState } from './states';

/**
 * Current state of the motion coordinator.
 */
export function useMotionState(): MotionState {
  return useSyncExternalStore(motionCoordinator.subscribe, () => motionCoordinator.state);
}
