const chatApp = {
  dailyActiveUsers: 1_000_000,
  requestsPerUserPerDay: 20,
  peakFactor: 3,
  writeRatio: 0.05,
  bytesPerWrite: 500,
  retentionDays: 365,
  replicationFactor: 3,
};

const textService = {
  dailyActiveUsers: 10_000_000,
  requestsPerUserPerDay: 10,
  peakFactor: 2,
  writeRatio: 0.1,
  bytesPerWrite: 1_000,
  retentionDays: 1_825,
  replicationFactor: 3,
};

// beginner mistake: dividing by 3,600 or 1,440 instead of 86,400 seconds, or forgetting the requests per user
test('the average QPS divides users × requests per user by 86,400 seconds and rounds up', () => {
  expect(mod.estimateCapacity(chatApp).averageQps).toBe(232);
  expect(mod.estimateCapacity(textService).averageQps).toBe(1158);
});

test('the peak QPS applies the peak factor to the unrounded average', () => {
  expect(mod.estimateCapacity(chatApp).peakQps).toBe(695);
  expect(mod.estimateCapacity(textService).peakQps).toBe(2315);
  expect(mod.estimateCapacity({ ...textService, dailyActiveUsers: 50_000_000, requestsPerUserPerDay: 4, peakFactor: 2.5 }).peakQps).toBe(5788);
});

test('the write QPS and the storage count only writes, kept for the retention period on every replica', () => {
  const estimate = mod.estimateCapacity(textService);
  expect(estimate.writeQps).toBe(116);
  expect(estimate.storageBytes).toBe(54_750_000_000_000);
  expect(mod.estimateCapacity(chatApp)).toEqual({ averageQps: 232, peakQps: 695, writeQps: 12, storageBytes: 547_500_000_000 });
  expect(mod.estimateCapacity({ ...chatApp, replicationFactor: 1 }).storageBytes).toBe(182_500_000_000);
  expect(mod.estimateCapacity({ ...chatApp, dailyActiveUsers: 1_001, requestsPerUserPerDay: 1, writeRatio: 0.5 }).storageBytes).toBe(274_297_500);
});

test('the byte formatter uses powers of 1,000 with at most one decimal and stops at PB', () => {
  expect(mod.formatBytes(0)).toBe('0 B');
  expect(mod.formatBytes(999)).toBe('999 B');
  expect(mod.formatBytes(1_000)).toBe('1 KB');
  expect(mod.formatBytes(1_250)).toBe('1.3 KB');
  expect(mod.formatBytes(1_500)).toBe('1.5 KB');
  expect(mod.formatBytes(999_950)).toBe('1000 KB');
  expect(mod.formatBytes(2_500_000)).toBe('2.5 MB');
  expect(mod.formatBytes(3_000_000_000)).toBe('3 GB');
  expect(mod.formatBytes(4_800_000_000_000)).toBe('4.8 TB');
  expect(mod.formatBytes(5_000_000_000_000_000_000)).toBe('5000 PB');
});
