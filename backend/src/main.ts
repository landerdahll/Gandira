import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    rawBody: true, // needed for Stripe webhook signature verification
  });

  const config = app.get(ConfigService);
  const isDev = config.get('NODE_ENV') !== 'production';
  const frontendUrl = config.get<string>('FRONTEND_URL');

  // ── Security headers
  app.use(
    helmet({
      contentSecurityPolicy: isDev ? false : undefined,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // ── Compression
  app.use(compression());

  // ── Cookie parser (for refresh token cookie)
  app.use(cookieParser());

  // ── CORS — allow multiple origins (comma-separated in FRONTEND_URL)
  const allowedOrigins = (frontendUrl ?? '')
    .split(',')
    .map((u: string) => u.trim())
    .filter(Boolean);
  app.enableCors({
    origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ── API versioning
  app.enableVersioning({ type: VersioningType.URI });
  app.setGlobalPrefix('api');

  // ── Global validation pipe
  // whitelist strips unknown fields, forbidNonWhitelisted rejects them — prevents mass assignment
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // ── Global logging interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());

  // ── Swagger (dev only)
  if (isDev) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('OutraHora API')
      .setDescription('Plataforma de venda e gestão de ingressos')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig));
  }

  // ── Health check (used by Render)
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.get('/health', (_req: any, res: any) => res.json({ status: 'ok' }));

  const port = config.get<number>('PORT', 3001);
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 OutraHora API running on http://localhost:${port}/api`);
  if (isDev) console.log(`📚 Swagger: http://localhost:${port}/api/docs`);
}

bootstrap();
