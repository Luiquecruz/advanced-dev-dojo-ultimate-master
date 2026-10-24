interface Point2D {
  x: number;
  y: number;
}

function distanceFromOrigin(point: Point2D): number {
  // TODO: return the Euclidean distance from (0, 0)
  return 0;
}

// TODO: declare class Pixel with x, y and color (no implements clause)

// TODO: const pixelDistance = distanceFromOrigin(new Pixel(3, 4, 'red'));

// TODO: make EmailAddress a branded string
type EmailAddress = string;

function toEmailAddress(raw: string): EmailAddress {
  // TODO: throw when raw has no "@", otherwise return it branded
  return raw;
}

function sendWelcome(email: EmailAddress): string {
  // TODO: return "Welcome sent to <email>"
  return '';
}
