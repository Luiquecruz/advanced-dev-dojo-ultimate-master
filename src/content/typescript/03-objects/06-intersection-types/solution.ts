type Identified = { id: string };
type Audited = { createdBy: string; updatedAt: Date };
type Customer = { name: string; email: string };

type CustomerRecord = Identified & Audited & Customer;

function createCustomerRecord(customer: Customer, author: string, now: Date): CustomerRecord {
  return {
    ...customer,
    id: `customer-${customer.email.toLowerCase()}`,
    createdBy: author,
    updatedAt: now,
  };
}

type ConflictingStatus = ({ status: string } & { status: number })['status'];
