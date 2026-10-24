interface Point2D {
  x: number;
  y: number;
}

function distanceFromOrigin(point: Point2D): number {
  return Math.hypot(point.x, point.y);
}

class Pixel {
  constructor(public x: number, public y: number, public color: string) {}
}

const pixelDistance = distanceFromOrigin(new Pixel(3, 4, 'red'));

type EmailAddress = string & { readonly brand: 'EmailAddress' };

function toEmailAddress(raw: string): EmailAddress {
  if (!raw.includes('@')) {
    throw new Error(`Invalid email address: ${raw}`);
  }
  return raw as EmailAddress;
}

function sendWelcome(email: EmailAddress): string {
  return `Welcome sent to ${email}`;
}
