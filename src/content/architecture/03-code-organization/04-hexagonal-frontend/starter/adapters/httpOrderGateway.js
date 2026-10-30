export function createHttpOrderGateway(endpoint) {
  return {
    async save(order) {
      // TODO: POST the order as JSON to endpoint, throw `Order failed: ${status}` when the response is not ok, resolve to { id }
      throw new Error('Not implemented');
    },
  };
}
