type ShippingAddress = {
  street: string;
  city: string;
  postalCode: string;
  complement?: string;
};

function formatAddress(address: ShippingAddress): string {
  const streetLine = address.complement ? `${address.street} (${address.complement})` : address.street;
  return `${streetLine}, ${address.city} ${address.postalCode}`;
}
