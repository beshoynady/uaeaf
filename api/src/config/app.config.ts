import { registerAs } from '@nestjs/config';

/** Application-level settings not specific to any other config namespace. */
export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  environment: process.env.NODE_ENV ?? 'development',
}));
