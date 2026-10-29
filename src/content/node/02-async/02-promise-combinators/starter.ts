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
  // TODO: start the three calls at once with Promise.all; recommendations are optional and fall back to []
  const user = await api.getUser();
  const orders = await api.getOrders();
  const recommendations = await api.getRecommendations();
  return { user, orders, recommendations };
}

export async function sendAll(channels: Record<string, () => Promise<unknown>>): Promise<SendReport> {
  // TODO: call every channel with Promise.allSettled and report the sent names and the failed { name, reason }
  return { sent: [], failed: [] };
}

export async function fastestMirror<T>(urls: string[], download: (url: string) => Promise<T>): Promise<T> {
  // TODO: resolve with the first successful download (Promise.any); throw Error('All mirrors failed') when every mirror fails
  return download(urls[0]);
}

export function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  // TODO: race the work against a timer that rejects with Error(`Timed out after ${ms} ms`), and clear the timer afterwards
  return work;
}
