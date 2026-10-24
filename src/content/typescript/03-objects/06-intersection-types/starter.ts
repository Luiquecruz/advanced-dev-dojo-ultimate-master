type Identified = { id: string };
type Audited = { createdBy: string; updatedAt: Date };
type Customer = { name: string; email: string };

// TODO: combine Identified, Audited and Customer
type CustomerRecord = Customer;

function createCustomerRecord(customer: Customer, author: string, now: Date): CustomerRecord {
  // TODO: add id, createdBy and updatedAt
  return { ...customer };
}

// TODO: the type of status in { status: string } & { status: number }
type ConflictingStatus = unknown;
