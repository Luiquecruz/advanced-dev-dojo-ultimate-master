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
  let timer: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function loadDashboard(api: Api, userId: number): Promise<Dashboard> {
  const [user, orders] = await Promise.all([api.getUser(userId), api.getOrders(userId)]);
  return {
    userName: user.name,
    orderCount: orders.length,
    revenue: orders.reduce((sum, order) => sum + order.total, 0),
  };
}
