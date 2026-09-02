import { SetMetadata } from '@nestjs/common';

/** Metadata key JwtAuthGuard reads via Reflector to bypass authentication. */
export const IS_PUBLIC_KEY = 'isPublic';

/** Marks a route as exempt from JwtAuthGuard. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
