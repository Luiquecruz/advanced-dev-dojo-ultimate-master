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

export function estimateCapacity(input: CapacityInput): CapacityEstimate {
  // TODO: requests per day = daily active users × requests per user per day
  const requestsPerDay = 0;
  // TODO: writes per day = Math.round(requests per day × write ratio)
  const writesPerDay = 0;
  return {
    // TODO: Math.ceil(requests per day / SECONDS_PER_DAY)
    averageQps: requestsPerDay,
    // TODO: Math.ceil(requests per day × peak factor / SECONDS_PER_DAY), from the unrounded average
    peakQps: requestsPerDay * input.peakFactor,
    // TODO: Math.ceil(writes per day / SECONDS_PER_DAY)
    writeQps: writesPerDay,
    // TODO: writes per day × bytes per write × retention days × replication factor
    storageBytes: writesPerDay * input.bytesPerWrite,
  };
}

export function formatBytes(bytes: number): string {
  // TODO: divide by 1,000 while the value is at least 1,000 (B, KB, MB, GB, TB, PB) and round to one decimal
  return `${bytes} B`;
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
