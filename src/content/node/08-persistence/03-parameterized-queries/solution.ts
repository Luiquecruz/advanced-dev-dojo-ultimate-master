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

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function sql(strings: TemplateStringsArray, ...values: unknown[]): Query {
  const text = strings.reduce((result, part, index) => `${result}$${index}${part}`);
  return { text, values };
}

export function assertIdentifier(name: string): string {
  if (!IDENTIFIER.test(name)) {
    throw new Error(`Unsafe identifier: ${name}`);
  }
  return name;
}

export function buildSelect(table: string, options: SelectOptions = {}): Query {
  const values: unknown[] = [];
  const placeholder = (value: unknown) => `$${values.push(value)}`;
  const columns = options.columns?.map(assertIdentifier).join(', ') ?? '*';
  let text = `SELECT ${columns} FROM ${assertIdentifier(table)}`;

  const conditions = Object.entries(options.where ?? {}).map(([column, value]) => {
    assertIdentifier(column);
    if (value === null) {
      return `${column} IS NULL`;
    }
    return Array.isArray(value) ? `${column} = ANY(${placeholder(value)})` : `${column} = ${placeholder(value)}`;
  });
  if (conditions.length > 0) {
    text += ` WHERE ${conditions.join(' AND ')}`;
  }

  if (options.orderBy) {
    const direction = options.orderBy.direction ?? 'ASC';
    if (direction !== 'ASC' && direction !== 'DESC') {
      throw new Error(`Unsafe sort direction: ${direction}`);
    }
    text += ` ORDER BY ${assertIdentifier(options.orderBy.column)} ${direction}`;
  }
  if (options.limit !== undefined) {
    text += ` LIMIT ${placeholder(options.limit)}`;
  }
  if (options.offset !== undefined) {
    text += ` OFFSET ${placeholder(options.offset)}`;
  }
  return { text, values };
}

function main() {
  const email = "ada@example.com' OR '1'='1";
  console.log(sql`SELECT id, name FROM users WHERE email = ${email}`);
  console.log(buildSelect('users', { columns: ['id', 'name'], where: { role: 'admin', deleted_at: null }, orderBy: { column: 'name' }, limit: 20 }));
}

main();
