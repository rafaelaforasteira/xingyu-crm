import { ArgumentMetadata, ValidationPipe } from "@nestjs/common";
import { LoginDto } from "./login.dto";

async function transform(value: unknown) {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
  const metadata: ArgumentMetadata = { type: "body", metatype: LoginDto, data: "" };
  return pipe.transform(value, metadata);
}

describe("LoginDto", () => {
  it("normalizes email and accepts a valid payload", async () => {
    const result = (await transform({
      email: "  Admin@Xingyu.Local ",
      password: "ChangeMeNow123!",
    })) as LoginDto;
    expect(result.email).toBe("admin@xingyu.local");
  });

  it("rejects missing password, invalid email and extra fields", async () => {
    await expect(transform({ email: "admin@xingyu.local" })).rejects.toBeDefined();
    await expect(
      transform({ email: "not-an-email", password: "x" }),
    ).rejects.toBeDefined();
    await expect(
      transform({
        email: "admin@xingyu.local",
        password: "secret",
        organizationId: "org-b",
        role: "ADMIN",
      }),
    ).rejects.toBeDefined();
  });
});
