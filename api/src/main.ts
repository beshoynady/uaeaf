import helmet from 'helmet';
import compression from 'compression';
import { json, urlencoded } from 'express';
import { NestFactory } from '@nestjs/core';
import { RequestMethod, ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import { API_DEFAULT_VERSION, API_GLOBAL_PREFIX } from './common/constants/api-versioning.constant.js';

/** Bootstraps the HTTP application: security middleware, global validation,
 *  Swagger documentation, then starts listening. */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Every route now resolves under /api/v1/... — one shared API version
  // for the whole backend, decided before any frontend exists so the path
  // move is cheap now. `/health` is excluded from the prefix here (and
  // marked VERSION_NEUTRAL on the controller) because it's an
  // uptime-monitoring endpoint, not a versioned API route — infra
  // shouldn't have to track API version bumps just to keep probing it.
  app.setGlobalPrefix(API_GLOBAL_PREFIX, { exclude: [{ path: 'health', method: RequestMethod.GET }] });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: API_DEFAULT_VERSION });

  app.use(helmet());
  app.use(compression());
  // Explicit request body size cap (schema-audit-2026-09-04.md §3.7/§6.7,
  // P1 finding): relying on the framework's undocumented default is not
  // an intentional control. No route in this codebase accepts raw file
  // bytes/base64 in a JSON body (media uploads are URL references, see
  // CreateMediaAssetDto), so 1mb is generous for every legitimate payload
  // while still bounding the platform's only unauthenticated write route
  // (POST /contact-messages).
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('UAEAF Backend API')
    .setDescription('UAE Athletics Federation platform API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = config.get<number>('app.port') ?? 3000;
  await app.listen(port);
}

await bootstrap();
