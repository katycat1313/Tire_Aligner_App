import { DeviceMotion, DeviceMotionMeasurement } from 'expo-sensors';
import { WheelOrientation } from './alignmentMath';

const SAMPLE_INTERVAL_MS = 50;   // 20 Hz
const CAPTURE_DURATION_MS = 2500; // 2.5 seconds of samples
const SAMPLES_TO_COLLECT = Math.floor(CAPTURE_DURATION_MS / SAMPLE_INTERVAL_MS);

export function startSensor(): void {
  DeviceMotion.setUpdateInterval(SAMPLE_INTERVAL_MS);
}

export function stopSensor(): void {
  DeviceMotion.removeAllListeners();
}

function motionToOrientation(m: DeviceMotionMeasurement): WheelOrientation | null {
  const r = m.rotation;
  if (r == null) return null;
  // DeviceMotion.rotation gives alpha (yaw), beta (pitch), gamma (roll) in radians on some platforms
  // and degrees on others — iOS gives radians via DeviceMotionEvent
  // expo-sensors normalizes to degrees
  return {
    alpha: r.alpha ?? 0,
    beta: r.beta ?? 0,
    gamma: r.gamma ?? 0,
  };
}

export interface CaptureResult {
  samples: WheelOrientation[];
  durationMs: number;
}

/**
 * Collects sensor samples for CAPTURE_DURATION_MS and resolves with all samples.
 * onProgress is called 0.0 → 1.0 as capture proceeds.
 */
export function captureSamples(
  onProgress: (progress: number) => void
): Promise<CaptureResult> {
  return new Promise((resolve, reject) => {
    const samples: WheelOrientation[] = [];
    const startTime = Date.now();

    const subscription = DeviceMotion.addListener((measurement) => {
      const orientation = motionToOrientation(measurement);
      if (orientation == null) return;

      samples.push(orientation);
      const elapsed = Date.now() - startTime;
      onProgress(Math.min(elapsed / CAPTURE_DURATION_MS, 1.0));

      if (samples.length >= SAMPLES_TO_COLLECT) {
        subscription.remove();
        resolve({ samples, durationMs: Date.now() - startTime });
      }
    });

    // Timeout safety
    setTimeout(() => {
      subscription.remove();
      if (samples.length < 5) {
        reject(new Error('Not enough sensor data received. Is motion access enabled?'));
      } else {
        resolve({ samples, durationMs: Date.now() - startTime });
      }
    }, CAPTURE_DURATION_MS + 2000);
  });
}

/** Single live reading for the live preview gauge during setup. */
export function subscribeToLiveOrientation(
  callback: (o: WheelOrientation) => void
): { remove: () => void } {
  return DeviceMotion.addListener((m) => {
    const o = motionToOrientation(m);
    if (o) callback(o);
  });
}

/** Check if DeviceMotion is available on this device. */
export async function checkSensorAvailability(): Promise<boolean> {
  return DeviceMotion.isAvailableAsync();
}
