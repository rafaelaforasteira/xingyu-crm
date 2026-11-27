import { ArgumentsHost, HttpException, HttpStatus } from "@nestjs/common";
import { GlobalExceptionFilter } from "./http-exception.filter";

describe("GlobalExceptionFilter", () => {
  it("does not leak stack traces on unexpected 500s", () => {
    const filter = new GlobalExceptionFilter();
    const json = jest.fn();
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status: () => ({ json }) }),
        getRequest: () => ({ url: "/api/orders" }),
      }),
    } as unknown as ArgumentsHost;

    filter.catch(new Error("secret boom\n    at Object.<anonymous>"), host);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: "Internal server error",
        path: "/api/orders",
      }),
    );
    const body = json.mock.calls[0][0] as Record<string, unknown>;
    expect(JSON.stringify(body)).not.toContain("secret boom");
    expect(body.stack).toBeUndefined();
  });

  it("preserves HTTP exception status codes", () => {
    const filter = new GlobalExceptionFilter();
    const json = jest.fn();
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status: (code: number) => ({ json, code }) }),
        getRequest: () => ({ url: "/api/auth/me" }),
      }),
    } as unknown as ArgumentsHost;

    filter.catch(new HttpException("Sessão não autenticada.", 401), host);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        message: "Sessão não autenticada.",
      }),
    );
  });
});
