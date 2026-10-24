interface ServerConfig {
  host: string;
  port: number;
  useTls?: boolean;
}

const stagingConfig: ServerConfig = {
  host: 'staging.example.com',
  port: 8443,
  useTls: true,
};

function createServerUrl(config: ServerConfig): string {
  const protocol = config.useTls ? 'https' : 'http';
  return `${protocol}://${config.host}:${config.port}`;
}
