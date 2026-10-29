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

const SMS_LIMIT = 160;

export class EmailNotifier implements Notifier {
  readonly channel = 'email';

  constructor(private readonly transport: Transport) {}

  async send(message: Message): Promise<void> {
    await this.transport({ channel: this.channel, to: message.to, text: message.body });
  }
}

export class SmsNotifier implements Notifier {
  readonly channel = 'sms';

  constructor(private readonly transport: Transport) {}

  async send(message: Message): Promise<void> {
    const text = message.body.length <= SMS_LIMIT ? message.body : `${message.body.slice(0, SMS_LIMIT - 3)}...`;
    await this.transport({ channel: this.channel, to: message.to, text });
  }
}

export class NotificationService {
  private readonly byChannel = new Map<string, Notifier>();

  constructor(notifiers: Notifier[]) {
    for (const notifier of notifiers) {
      if (this.byChannel.has(notifier.channel)) {
        throw new Error(`Duplicate notifier for channel: ${notifier.channel}`);
      }
      this.byChannel.set(notifier.channel, notifier);
    }
  }

  channels(): string[] {
    return [...this.byChannel.keys()];
  }

  async notify(channel: string, message: Message): Promise<void> {
    const notifier = this.byChannel.get(channel);
    if (!notifier) {
      throw new Error(`Unsupported channel: ${channel}`);
    }
    await notifier.send(message);
  }
}

async function main() {
  const transport: Transport = async (delivery) => console.log(delivery);
  const service = new NotificationService([new EmailNotifier(transport), new SmsNotifier(transport)]);
  await service.notify('email', { to: 'ada@example.com', body: 'Your order shipped' });
  await service.notify('sms', { to: '+15550100', body: 'Your order shipped' });
}

main();
