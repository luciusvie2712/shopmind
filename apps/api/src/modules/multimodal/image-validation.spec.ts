import { BadRequestException } from '@nestjs/common';
import { validateImageUpload } from './image-validation';
describe('validateImageUpload', () => {
  it('accepts a content-verified PNG', () =>
    expect(
      validateImageUpload(
        {
          mimetype: 'image/png',
          buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]),
        },
        100,
      ),
    ).toBe('image/png'));
  it('rejects a MIME spoof', () =>
    expect(() =>
      validateImageUpload(
        { mimetype: 'image/png', buffer: Buffer.from('not png') },
        100,
      ),
    ).toThrow(BadRequestException));
  it('rejects oversized input', () =>
    expect(() =>
      validateImageUpload(
        { mimetype: 'image/jpeg', buffer: Buffer.alloc(101) },
        100,
      ),
    ).toThrow(BadRequestException));
});
