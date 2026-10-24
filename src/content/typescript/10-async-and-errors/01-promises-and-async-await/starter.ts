interface User {
  id: number;
  name: string;
}

interface Order {
  id: number;
  total: number;
}

interface Api {
  getUser(id: number): Promise<User>;
  getOrders(userId: number): Promise<Order[]>;
}

interface Dashboard {
  userName: string;
  orderCount: number;
  revenue: number;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  // TODO: race the promise against a timer that rejects with "Timed out after <ms>ms"
  // TODO: clear the timer once the race is decided
  return promise;
}

async function loadDashboard(api: Api, userId: number): Promise<Dashboard> {
  // TODO: start both requests at the same time with Promise.all
  const user = await api.getUser(userId);
  const orders = await api.getOrders(userId);
  return {
    userName: user.name,
    orderCount: orders.length,
    revenue: orders.reduce((sum, order) => sum + order.total, 0),
  };
}
