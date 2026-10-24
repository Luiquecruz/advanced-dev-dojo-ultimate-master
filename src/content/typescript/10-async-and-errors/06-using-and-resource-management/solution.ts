function acquireLock(name: string, log: string[]): Disposable {
  log.push(`lock ${name}`);
  return {
    [Symbol.dispose]() {
      log.push(`unlock ${name}`);
    },
  };
}

interface FileHandle extends Disposable {
  write(text: string): void;
}

function openFile(path: string, log: string[]): FileHandle {
  log.push(`open ${path}`);
  return {
    write(text) {
      log.push(`write ${text}`);
    },
    [Symbol.dispose]() {
      log.push(`close ${path}`);
    },
  };
}

interface Connection extends AsyncDisposable {
  query(sql: string): Promise<string[]>;
}

function connect(url: string, log: string[]): Connection {
  log.push(`connect ${url}`);
  return {
    async query(sql) {
      log.push(`query ${sql}`);
      if (!sql.startsWith('SELECT')) {
        throw new Error('Invalid query');
      }
      return ['Ada', 'Grace'];
    },
    async [Symbol.asyncDispose]() {
      await Promise.resolve();
      log.push(`disconnect ${url}`);
    },
  };
}

async function exportReport(log: string[], sql: string): Promise<number> {
  using lock = acquireLock('report', log);
  using file = openFile('report.csv', log);
  await using connection = connect('db://main', log);
  const rows = await connection.query(sql);
  for (const row of rows) {
    file.write(row);
  }
  return rows.length;
}
