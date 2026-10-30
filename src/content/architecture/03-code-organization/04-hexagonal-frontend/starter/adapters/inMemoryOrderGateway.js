export function createInMemoryOrderGateway() {
  return {
    async save(order) {
      // TODO: keep the order in an array with ids 1, 2, 3... and resolve to { id }
      throw new Error('Not implemented');
    },
    list() {
      // TODO: return copies of the saved orders, each with its id
      return [];
    },
  };
}
