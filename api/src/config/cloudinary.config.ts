import { registerAs } from '@nestjs/config';

/** Credentials for the image store. Read here rather than from
 *  `process.env` at the point of use so the whole surface of what this
 *  application needs from its environment stays visible in one folder. */
export const cloudinaryConfig = registerAs('cloudinary', () => ({
  cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
  apiKey: process.env.CLOUDINARY_API_KEY ?? '',
  apiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
}));
