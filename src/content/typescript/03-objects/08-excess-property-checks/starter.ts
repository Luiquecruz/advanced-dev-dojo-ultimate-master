interface ServerConfig {
  host: string;
  port: number;
  useTls?: boolean;
  // TODO: remove this index signature, it lets typos slip through
  [option: string]: unknown;
}

const stagingConfig: ServerConfig = {
  host: 'staging.example.com',
  port: 8443,
  useTLS: true,
};

function createServerUrl(config: ServerConfig): string {
  // TODO: return "https://host:port" when useTls is true, otherwise "http://host:port"
  return '';
}
