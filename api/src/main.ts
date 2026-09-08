import helmet from 'helmet';
import compression from 'compression';
import { json, urlencoded } from 'express';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ApiExceptionFilter } from './common/filters/api-exception.filter.js';
import { SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import { configureApiRouting } from './api-routing.config.js';
import { buildSwaggerDocument } from './swagger.config.js';

/** Bootstraps the HTTP application: security middleware, global validation,
 *  Swagger documentation, then starts listening. */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  configureApiRouting(app);

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
  // Registered 2026-09-08. Until then the API had no exception filter at
  // all, so anything that was not already an HttpException reached the
  // caller as a bare 500 — a duplicate email, a Mongoose `required`
  // violation, a malformed id in a path param. See the filter for why each
  // of those is a 4xx and why an unexpected failure's detail is logged
  // rather than returned.
  app.useGlobalFilters(new ApiExceptionFilter());

  const document = buildSwaggerDocument(app);
  SwaggerModule.setup('api/docs', app, document);

  const port = config.get<number>('app.port') ?? 3000;
  await app.listen(port);
}

await bootstrap();
