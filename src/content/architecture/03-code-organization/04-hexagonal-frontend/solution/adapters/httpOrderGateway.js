export function createHttpOrderGateway(endpoint) {
  return {
    async save(order) {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order),
      });
      if (!response.ok) {
        throw new Error(`Order failed: ${response.status}`);
      }
      const { id } = await response.json();
      return { id };
    },
  };
}
