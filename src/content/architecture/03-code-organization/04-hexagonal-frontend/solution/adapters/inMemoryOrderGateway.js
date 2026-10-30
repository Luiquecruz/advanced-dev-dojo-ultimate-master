export function createInMemoryOrderGateway() {
  const orders = [];
  return {
    async save(order) {
      const id = orders.length + 1;
      orders.push({ ...order, id });
      return { id };
    },
    list() {
      return orders.map((order) => ({ ...order }));
    },
  };
}
