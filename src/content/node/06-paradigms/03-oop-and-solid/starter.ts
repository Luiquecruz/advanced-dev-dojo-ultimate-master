export interface Message {
  to: string;
  body: string;
}

export interface Delivery {
  channel: string;
  to: string;
  text: string;
}

export type Transport = (delivery: Delivery) => Promise<void>;

export interface Notifier {
  readonly channel: string;
  send(message: Message): Promise<void>;
}

export class EmailNotifier implements Notifier {
  readonly channel = 'email';

  constructor(private readonly transport: Transport) {}

  async send(message: Message): Promise<void> {
    // TODO: deliver the body unchanged through the transport
  }
}

export class SmsNotifier implements Notifier {
  readonly channel = 'sms';

  constructor(private readonly transport: Transport) {}

  async send(message: Message): Promise<void> {
    // TODO: deliver the body through the transport, cut to 157 characters + '...' when longer than 160
  }
}

export class NotificationService {
  constructor(notifiers: Notifier[]) {
    // TODO: index the notifiers by channel and reject duplicates
  }

  channels(): string[] {
    // TODO: return the registered channels in registration order
    return [];
  }

  async notify(channel: string, message: Message): Promise<void> {
    // TODO: delegate to the notifier of this channel or reject with 'Unsupported channel: <channel>'
  }
}

async function main() {
  const transport: Transport = async (delivery) => console.log(delivery);
  const service = new NotificationService([new EmailNotifier(transport), new SmsNotifier(transport)]);
  await service.notify('email', { to: 'ada@example.com', body: 'Your order shipped' });
  await service.notify('sms', { to: '+15550100', body: 'Your order shipped' });
}

main();
