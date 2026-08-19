import { Controller, Get, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { createOpenApiDocument, OPENAPI_COOKIE_NAME, OPENAPI_TITLE } from "./openapi";

@ApiTags("health")
@Controller("health")
class HealthStubController {
  @Get()
  @ApiOperation({ summary: "Health check" })
  check() {
    return { status: "ok" };
  }
}

@ApiTags("auth")
@Controller("auth")
class AuthStubController {
  @Get("me")
  @ApiOperation({ summary: "Usuário autenticado atual" })
  me() {
    return { id: "u1" };
  }
}

describe("OpenAPI document", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthStubController, AuthStubController],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("is a serializable OpenAPI 3 document with cookie auth", () => {
    const document = createOpenApiDocument(app);
    expect(document.openapi).toMatch(/^3\./);
    expect(document.info.title).toBe(OPENAPI_TITLE);
    expect(JSON.stringify(document)).not.toContain("passwordHash");
    expect(JSON.stringify(document)).not.toContain("refreshTokenHash");
    const schemes = document.components?.securitySchemes ?? {};
    const cookieScheme = Object.values(schemes).find(
      (scheme) =>
        typeof scheme === "object" &&
        scheme !== null &&
        "name" in scheme &&
        scheme.name === OPENAPI_COOKIE_NAME,
    );
    expect(cookieScheme).toBeDefined();
    expect(document.paths?.["/api/health"] || document.paths?.["/health"]).toBeTruthy();
  });
});
