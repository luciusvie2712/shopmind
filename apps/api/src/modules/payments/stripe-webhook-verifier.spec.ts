import { createHmac } from 'node:crypto';
import { verifyStripeSignature } from './stripe-webhook-verifier';
describe('verifyStripeSignature', () => {
  it('accepts a current valid signature and rejects tampering', () => {
    const body = Buffer.from('{"id":"evt_test"}');
    const timestamp = 1_800_000_000;
    const secret = 'whsec_test';
    const signature = createHmac('sha256', secret)
      .update(`${timestamp}.${body.toString()}`)
      .digest('hex');
    expect(() =>
      verifyStripeSignature(
        body,
        `t=${timestamp},v1=${signature}`,
        secret,
        timestamp,
      ),
    ).not.toThrow();
    expect(() =>
      verifyStripeSignature(
        Buffer.from('tampered'),
        `t=${timestamp},v1=${signature}`,
        secret,
        timestamp,
      ),
    ).toThrow();
  });
  it('rejects replay outside tolerance', () =>
    expect(() =>
      verifyStripeSignature(
        Buffer.from('{}'),
        't=1,v1=' + '0'.repeat(64),
        'whsec_test',
        1000,
      ),
    ).toThrow());
});
