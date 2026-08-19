import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import { GlobalExceptionFilter } from "./common/filters/http-exception.filter";
import { ensureUploadDir } from "./common/upload/upload.util";
import { setupSwagger } from "./openapi/openapi";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = new Logger("Bootstrap");

  const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:3000";
  const origins = corsOrigin
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  if (origins.includes("*")) {
    throw new Error(
      'CORS_ORIGIN não pode ser "*" quando credentials=true. Informe origens explícitas (ex.: http://localhost:3000).',
    );
  }

  app.enableCors({
    origin: origins,
    credentials: true,
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Demo-User-Id",
      "X-Organization-Id",
    ],
  });

  app.use(cookieParser());
  app.setGlobalPrefix("api");

  const uploadDir = ensureUploadDir();
  app.useStaticAssets(uploadDir, { prefix: "/api/uploads/files/" });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  const swaggerEnabled = setupSwagger(app);

  const port = Number(process.env.API_PORT ?? 3333);
  const host = process.env.API_HOST ?? "0.0.0.0";
  await app.listen(port, host);
  logger.log(`API running on http://${host}:${port}`);
  logger.log(`Uploads directory: ${uploadDir}`);
  if (swaggerEnabled) {
    logger.log(`Swagger docs at http://localhost:${port}/docs`);
  }
}

bootstrap();
