import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import { GlobalExceptionFilter } from "./common/filters/http-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  // Swagger only when explicitly enabled (public docs UI; API routes stay guarded).
  if (process.env.SWAGGER_ENABLED === "true") {
    const config = new DocumentBuilder()
      .setTitle("Xingyu CRM API")
      .setDescription(
        "CRM API — gestão comercial, atendimento, pedidos e autenticação de homologação",
      )
      .setVersion("0.1.0")
      .addCookieAuth("xingyu_access_token")
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("docs", app, document);
  }

  const port = Number(process.env.API_PORT ?? 3333);
  const host = process.env.API_HOST ?? "0.0.0.0";
  await app.listen(port, host);
  logger.log(`API running on http://${host}:${port}`);
  if (process.env.SWAGGER_ENABLED === "true") {
    logger.log(`Swagger docs at http://localhost:${port}/docs`);
  }
}

bootstrap();
