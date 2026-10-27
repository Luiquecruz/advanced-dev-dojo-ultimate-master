import { useEffect, useRef, useState, type RefObject } from 'react';
import { detectCapabilities } from '@/shared/capabilities/capabilities';
import { createGyro, type GyroController, type GyroStatus } from '@/shared/motion/gyro';
import { isActivityState } from '@/shared/motion/states';
import { DESKTOP_TILT_LIMITS, MOBILE_TILT_LIMITS, bindPointerTilt, bindTouchTilt, createTilt } from '@/shared/motion/tilt';
import { useMotionState } from '@/shared/motion/useMotionState';

interface TiltGroup {
  gyroSupported: boolean;
  gyroStatus: GyroStatus;
  toggleGyro(): void;
}

/**
 * React adapter for the card group tilt: pointer, touch fallback and optional device orientation. Pointer input is read on
 * the group; the tilt is written on the descendant marked `data-tilt-target` (the group itself when there is none).
 * Disabled with reduced motion.
 */
export function useTiltGroup(ref: RefObject<HTMLElement | null>): TiltGroup {
  const capabilities = detectCapabilities();
  const gyroRef = useRef<GyroController | null>(null);
  const [gyroStatus, setGyroStatus] = useState<GyroStatus>('idle');
  const sensorPaused = isActivityState(useMotionState());

  useEffect(() => {
    if (capabilities.reducedMotion) {
      return;
    }
    const element = ref.current!;
    const controller = createTilt(() => element.querySelector<HTMLElement>('[data-tilt-target]') ?? element, capabilities.coarsePointer ? MOBILE_TILT_LIMITS : DESKTOP_TILT_LIMITS);
    const unbindPointer = bindPointerTilt(element, controller);
    const unbindTouch = bindTouchTilt(element, controller);
    const gyro = createGyro({ onTilt: (horizontal, vertical) => controller.setTarget(horizontal, vertical), onStatusChange: setGyroStatus });
    gyroRef.current = gyro;
    return () => {
      gyroRef.current = null;
      gyro.destroy();
      unbindTouch();
      unbindPointer();
      controller.destroy();
    };
  }, [ref, capabilities]);

  useEffect(() => {
    gyroRef.current?.setPaused(sensorPaused);
  }, [sensorPaused]);

  return {
    gyroSupported: !capabilities.reducedMotion && capabilities.coarsePointer && capabilities.orientation !== 'unsupported',
    gyroStatus,
    toggleGyro() {
      if (gyroStatus === 'active') {
        gyroRef.current?.disable();
        return;
      }
      void gyroRef.current?.enable();
    },
  };
}
