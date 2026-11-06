export interface CapacityInput {
  dailyActiveUsers: number;
  requestsPerUserPerDay: number;
  peakFactor: number;
  writeRatio: number;
  bytesPerWrite: number;
  retentionDays: number;
  replicationFactor: number;
}

export interface CapacityEstimate {
  averageQps: number;
  peakQps: number;
  writeQps: number;
  storageBytes: number;
}

export const SECONDS_PER_DAY = 86_400;
const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

export function estimateCapacity(input: CapacityInput): CapacityEstimate {
  const requestsPerDay = input.dailyActiveUsers * input.requestsPerUserPerDay;
  const writesPerDay = Math.round(requestsPerDay * input.writeRatio);
  return {
    averageQps: Math.ceil(requestsPerDay / SECONDS_PER_DAY),
    peakQps: Math.ceil((requestsPerDay * input.peakFactor) / SECONDS_PER_DAY),
    writeQps: Math.ceil(writesPerDay / SECONDS_PER_DAY),
    storageBytes: writesPerDay * input.bytesPerWrite * input.retentionDays * input.replicationFactor,
  };
}

export function formatBytes(bytes: number): string {
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < UNITS.length - 1) {
    value /= 1000;
    unit++;
  }
  return `${Math.round(value * 10) / 10} ${UNITS[unit]}`;
}

const estimate = estimateCapacity({
  dailyActiveUsers: 10_000_000,
  requestsPerUserPerDay: 10,
  peakFactor: 2,
  writeRatio: 0.1,
  bytesPerWrite: 1_000,
  retentionDays: 1_825,
  replicationFactor: 3,
});
console.log(estimate);
console.log(formatBytes(estimate.storageBytes));
