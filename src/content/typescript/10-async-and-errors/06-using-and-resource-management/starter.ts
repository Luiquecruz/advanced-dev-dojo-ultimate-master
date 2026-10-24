function acquireLock(name: string, log: string[]): Disposable {
  log.push(`lock ${name}`);
  return {
    [Symbol.dispose]() {
      log.push(`unlock ${name}`);
    },
  };
}

// TODO: make FileHandle extend Disposable
interface FileHandle {
  write(text: string): void;
}

function openFile(path: string, log: string[]): FileHandle {
  log.push(`open ${path}`);
  return {
    write(text) {
      log.push(`write ${text}`);
    },
    // TODO: add [Symbol.dispose]() that logs "close <path>"
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
  // TODO: declare the lock and the file with using and the connection with await using
  const lock = acquireLock('report', log);
  const file = openFile('report.csv', log);
  const connection = connect('db://main', log);
  const rows = await connection.query(sql);
  for (const row of rows) {
    file.write(row);
  }
  await connection[Symbol.asyncDispose]();
  lock[Symbol.dispose]();
  return rows.length;
}
