import { useSyncExternalStore } from 'react';
import { motionCoordinator } from '../motion/coordinator';
import type { MotionState } from '../motion/states';

/**
 * Current state of the motion coordinator.
 */
export function useMotionState(): MotionState {
  return useSyncExternalStore(motionCoordinator.subscribe, () => motionCoordinator.state);
}
