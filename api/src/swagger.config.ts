import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { OpenAPIObject } from '@nestjs/swagger';

/** Single source of truth for the Swagger document definition, shared by
 *  `main.ts` (live `/api/docs` UI, served fresh on every boot) and
 *  `generate-openapi.ts` (the committed `openapi.json` snapshot) so the two
 *  can never silently diverge in how the document itself is built. */
export function buildSwaggerDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('UAEAF Backend API')
    .setDescription('UAE Athletics Federation platform API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  return SwaggerModule.createDocument(app, config);
}
