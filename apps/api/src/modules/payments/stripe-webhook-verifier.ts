import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifyStripeSignature(
  rawBody: Buffer,
  signature: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): void {
  const parts = signature
    .split(',')
    .map((part) => part.split('=', 2) as [string, string]);
  const timestamp = Number(parts.find(([key]) => key === 't')?.[1]);
  const signatures = parts
    .filter(([key]) => key === 'v1')
    .map(([, value]) => value);
  if (
    !Number.isInteger(timestamp) ||
    Math.abs(nowSeconds - timestamp) > 300 ||
    signatures.length === 0
  )
    throw new Error('Invalid Stripe webhook signature');
  const expected = createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody.toString('utf8')}`)
    .digest();
  const valid = signatures.some((value) => {
    if (!/^[a-f0-9]{64}$/i.test(value)) return false;
    const actual = Buffer.from(value, 'hex');
    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  });
  if (!valid) throw new Error('Invalid Stripe webhook signature');
}
