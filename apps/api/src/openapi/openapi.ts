import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

export const OPENAPI_TITLE = "Xingyu CRM API";
export const OPENAPI_COOKIE_NAME = "xingyu_access_token";

export function isSwaggerEnabled(): boolean {
  return process.env.SWAGGER_ENABLED === "true";
}

export function createOpenApiDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle(OPENAPI_TITLE)
    .setDescription(
      "CRM API — gestão comercial, atendimento, pedidos e autenticação por cookie HttpOnly.",
    )
    .setVersion("0.1.0")
    .addCookieAuth(OPENAPI_COOKIE_NAME, {
      type: "apiKey",
      in: "cookie",
      name: OPENAPI_COOKIE_NAME,
    })
    .addSecurityRequirements(OPENAPI_COOKIE_NAME)
    .build();

  return SwaggerModule.createDocument(app, config);
}

export function setupSwagger(app: INestApplication): boolean {
  if (!isSwaggerEnabled()) return false;
  const document = createOpenApiDocument(app);
  SwaggerModule.setup("docs", app, document);
  return true;
}
