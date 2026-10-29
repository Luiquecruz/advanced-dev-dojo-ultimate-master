export interface Query {
  text: string;
  values: unknown[];
}

export interface SelectOptions {
  columns?: string[];
  where?: Record<string, unknown>;
  orderBy?: { column: string; direction?: string };
  limit?: number;
  offset?: number;
}

export function sql(strings: TemplateStringsArray, ...values: unknown[]): Query {
  // TODO: join the template parts with $1, $2, ... placeholders and return the values separately
  return { text: strings.join(''), values: [] };
}

export function assertIdentifier(name: string): string {
  // TODO: throw `Unsafe identifier: <name>` unless the name is letters, digits and underscores, not starting with a digit
  return name;
}

export function buildSelect(table: string, options: SelectOptions = {}): Query {
  // TODO: build SELECT ... FROM ... WHERE ... ORDER BY ... LIMIT ... OFFSET ... with placeholders for every value
  return { text: `SELECT * FROM ${table}`, values: [] };
}

function main() {
  const email = "ada@example.com' OR '1'='1";
  console.log(sql`SELECT id, name FROM users WHERE email = ${email}`);
  console.log(buildSelect('users', { columns: ['id', 'name'], where: { role: 'admin', deleted_at: null }, orderBy: { column: 'name' }, limit: 20 }));
}

main();
