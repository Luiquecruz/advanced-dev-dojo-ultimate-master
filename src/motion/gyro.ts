export type GyroStatus = 'idle' | 'active' | 'denied' | 'unavailable';

export interface GyroController {
  enable(): Promise<GyroStatus>;
  disable(): void;
  setPaused(paused: boolean): void;
  destroy(): void;
}

interface GyroOptions {
  onTilt(horizontal: number, vertical: number): void;
  onStatusChange(status: GyroStatus): void;
}

type PermissionRequest = () => Promise<'granted' | 'denied'>;

const CALIBRATION_EVENTS = 10;
const MAX_INPUT_DEGREES = 20;
const FIRST_EVENT_TIMEOUT_MS = 1500;

function clampUnit(value: number): number {
  return Math.min(1, Math.max(-1, value));
}

function alignToScreen(gamma: number, beta: number): [horizontal: number, vertical: number] {
  const angle = screen.orientation?.angle ?? 0;
  if (angle === 90) {
    return [beta, -gamma];
  }
  if (angle === 270 || angle === -90) {
    return [-beta, gamma];
  }
  if (angle === 180) {
    return [-gamma, -beta];
  }
  return [gamma, beta];
}

/**
 * Device orientation input for the card tilt. Must be enabled from a user gesture; calibrates its zero from the first events.
 */
export function createGyro({ onTilt, onStatusChange }: GyroOptions): GyroController {
  let status: GyroStatus = 'idle';
  let listening = false;
  let paused = false;
  let samples = 0;
  let betaSum = 0;
  let gammaSum = 0;
  let betaZero = 0;
  let gammaZero = 0;
  let firstEventTimer: ReturnType<typeof setTimeout> | undefined;

  function setStatus(next: GyroStatus): GyroStatus {
    status = next;
    onStatusChange(next);
    return next;
  }

  function onOrientation(event: DeviceOrientationEvent): void {
    if (event.beta === null || event.gamma === null) {
      return;
    }
    clearTimeout(firstEventTimer);
    if (samples < CALIBRATION_EVENTS) {
      samples++;
      betaSum += event.beta;
      gammaSum += event.gamma;
      betaZero = betaSum / samples;
      gammaZero = gammaSum / samples;
      return;
    }
    const [horizontal, vertical] = alignToScreen(event.gamma - gammaZero, event.beta - betaZero);
    onTilt(clampUnit(horizontal / MAX_INPUT_DEGREES), clampUnit(vertical / MAX_INPUT_DEGREES));
  }

  function listen(): void {
    if (listening) {
      return;
    }
    listening = true;
    window.addEventListener('deviceorientation', onOrientation);
  }

  function stopListening(): void {
    if (!listening) {
      return;
    }
    listening = false;
    window.removeEventListener('deviceorientation', onOrientation);
    onTilt(0, 0);
  }

  function syncListening(): void {
    if (status !== 'active') {
      return;
    }
    if (document.hidden || paused) {
      stopListening();
    } else {
      listen();
    }
  }

  document.addEventListener('visibilitychange', syncListening);

  return {
    async enable() {
      if (!window.isSecureContext || typeof DeviceOrientationEvent === 'undefined') {
        return setStatus('unavailable');
      }
      const requestPermission = (DeviceOrientationEvent as unknown as { requestPermission?: PermissionRequest }).requestPermission;
      if (requestPermission) {
        const permission = await requestPermission().catch(() => 'denied' as const);
        if (permission !== 'granted') {
          return setStatus('denied');
        }
      }
      samples = 0;
      betaSum = 0;
      gammaSum = 0;
      firstEventTimer = setTimeout(() => {
        stopListening();
        setStatus('unavailable');
      }, FIRST_EVENT_TIMEOUT_MS);
      setStatus('active');
      syncListening();
      return status;
    },
    disable() {
      clearTimeout(firstEventTimer);
      stopListening();
      setStatus('idle');
    },
    setPaused(next) {
      paused = next;
      syncListening();
    },
    destroy() {
      clearTimeout(firstEventTimer);
      stopListening();
      document.removeEventListener('visibilitychange', syncListening);
    },
  };
}
