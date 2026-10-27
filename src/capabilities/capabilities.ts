export type PerformanceTier = 'high' | 'mid' | 'low';

export interface Capabilities {
  webgl2: boolean;
  fineHover: boolean;
  coarsePointer: boolean;
  reducedMotion: boolean;
  secureContext: boolean;
  orientation: 'unsupported' | 'needs-permission' | 'available';
  tier: PerformanceTier;
}

export interface PerformanceProfile {
  particles: number;
  maxPixelRatio: number;
  grid: 'webgl' | 'css';
}

const PROFILES: Record<PerformanceTier, { particles: [desktop: number, mobile: number]; maxPixelRatio: [desktop: number, mobile: number]; grid: PerformanceProfile['grid'] }> = {
  high: { particles: [5000, 1500], maxPixelRatio: [2, 1.5], grid: 'webgl' },
  mid: { particles: [2500, 1000], maxPixelRatio: [1.5, 1.5], grid: 'webgl' },
  low: { particles: [800, 800], maxPixelRatio: [1, 1], grid: 'css' },
};

const LOWER_TIER: Record<PerformanceTier, PerformanceTier> = { high: 'mid', mid: 'low', low: 'low' };

interface DeviceOrientationEventWithPermission {
  requestPermission?: () => Promise<'granted' | 'denied'>;
}

function supportsWebgl2(): boolean {
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'));
  } catch {
    return false;
  }
}

function detectOrientation(secureContext: boolean): Capabilities['orientation'] {
  if (!secureContext || typeof DeviceOrientationEvent === 'undefined') {
    return 'unsupported';
  }
  return typeof (DeviceOrientationEvent as DeviceOrientationEventWithPermission).requestPermission === 'function' ? 'needs-permission' : 'available';
}

function estimateTier(webgl2: boolean, coarsePointer: boolean): PerformanceTier {
  if (!webgl2) {
    return 'low';
  }
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency || 8;
  if (memory <= 2 || cores <= 2) {
    return 'low';
  }
  if (coarsePointer && (memory <= 4 || cores <= 4)) {
    return 'mid';
  }
  return 'high';
}

let detected: Capabilities | undefined;

/**
 * Detects the device features the ambient scene and the motion layer depend on. Detection runs once per session.
 */
export function detectCapabilities(): Capabilities {
  detected ??= measureCapabilities();
  return detected;
}

function measureCapabilities(): Capabilities {
  const webgl2 = supportsWebgl2();
  const coarsePointer = matchMedia('(pointer: coarse)').matches;
  return {
    webgl2,
    fineHover: matchMedia('(hover: hover) and (pointer: fine)').matches,
    coarsePointer,
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    secureContext: window.isSecureContext,
    orientation: detectOrientation(window.isSecureContext),
    tier: estimateTier(webgl2, coarsePointer),
  };
}

/**
 * Rendering budget of a tier on the current kind of device.
 */
export function profileFor(tier: PerformanceTier, coarsePointer: boolean): PerformanceProfile {
  const profile = PROFILES[tier];
  const device = coarsePointer ? 1 : 0;
  return { particles: profile.particles[device], maxPixelRatio: profile.maxPixelRatio[device], grid: profile.grid };
}

/**
 * Tier to fall back to after measuring the average frame time, following the 24 ms / 33 ms thresholds.
 */
export function tierForFrameTime(current: PerformanceTier, averageFrameMs: number): PerformanceTier {
  if (averageFrameMs > 33) {
    return 'low';
  }
  if (averageFrameMs > 24) {
    return LOWER_TIER[current];
  }
  return current;
}
