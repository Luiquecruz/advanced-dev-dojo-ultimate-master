export interface User {
  id: number;
  name: string;
}

export interface Order {
  id: number;
  total: number;
}

export interface DashboardApi {
  getUser(): Promise<User>;
  getOrders(): Promise<Order[]>;
  getRecommendations(): Promise<string[]>;
}

export interface Dashboard {
  user: User;
  orders: Order[];
  recommendations: string[];
}

export interface SendReport {
  sent: string[];
  failed: Array<{ name: string; reason: string }>;
}

export async function loadDashboard(api: DashboardApi): Promise<Dashboard> {
  const [user, orders, recommendations] = await Promise.all([
    api.getUser(),
    api.getOrders(),
    api.getRecommendations().catch(() => []),
  ]);
  return { user, orders, recommendations };
}

export async function sendAll(channels: Record<string, () => Promise<unknown>>): Promise<SendReport> {
  const names = Object.keys(channels);
  const results = await Promise.allSettled(names.map((name) => channels[name]()));
  const report: SendReport = { sent: [], failed: [] };
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      report.sent.push(names[index]);
    } else {
      report.failed.push({ name: names[index], reason: (result.reason as Error).message });
    }
  });
  return report;
}

export async function fastestMirror<T>(urls: string[], download: (url: string) => Promise<T>): Promise<T> {
  try {
    return await Promise.any(urls.map((url) => download(url)));
  } catch {
    throw new Error('All mirrors failed');
  }
}

export function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out after ${ms} ms`)), ms);
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}
