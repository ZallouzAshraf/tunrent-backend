import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { validateEnvironment } from './config/env.validation';

async function bootstrap() {
  validateEnvironment();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const isProd = configService.get<string>('app.nodeEnv') === 'production';

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cookieParser());

  const allowedOrigins =
    configService.get<string[]>('app.corsOrigins') ?? [];

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const normalized = origin.replace(/\/$/, '');
      if (allowedOrigins.includes(normalized)) {
        callback(null, true);
        return;
      }

      if (!isProd) {
        console.warn(`[cors] blocked origin: ${origin}`);
      }
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  if (!isProd) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('TunRent API')
      .setDescription(
        'Plateforme SaaS Multi-Tenant de Location de Voitures — Tunisie',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = configService.get<number>('app.port') || 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`TunRent API running on port ${port}`);
  if (!isProd) {
    console.log(`Swagger docs: http://localhost:${port}/api/docs`);
  }
}

void bootstrap();
