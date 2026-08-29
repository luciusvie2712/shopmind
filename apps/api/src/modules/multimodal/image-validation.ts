import { BadRequestException } from '@nestjs/common';
export type SupportedImageMime = 'image/jpeg' | 'image/png';
export function validateImageUpload(
  file: { readonly buffer: Buffer; readonly mimetype: string } | undefined,
  maxBytes: number,
): SupportedImageMime {
  if (
    file === undefined ||
    file.buffer.length === 0 ||
    file.buffer.length > maxBytes
  )
    throw new BadRequestException('Image file size is invalid');
  const jpeg =
    file.buffer.length >= 3 &&
    file.buffer[0] === 0xff &&
    file.buffer[1] === 0xd8 &&
    file.buffer[2] === 0xff;
  const png =
    file.buffer.length >= 8 &&
    file.buffer
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (file.mimetype === 'image/jpeg' && jpeg) return 'image/jpeg';
  if (file.mimetype === 'image/png' && png) return 'image/png';
  throw new BadRequestException('Only valid JPEG and PNG images are supported');
}
