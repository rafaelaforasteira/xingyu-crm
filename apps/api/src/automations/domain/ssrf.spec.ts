import { assertSafeHttpUrl } from "../domain/ssrf";

describe("http ssrf guard", () => {
  it("blocks localhost and metadata endpoints", () => {
    expect(() => assertSafeHttpUrl("http://127.0.0.1/secret")).toThrow();
    expect(() => assertSafeHttpUrl("http://169.254.169.254/latest")).toThrow();
    expect(() => assertSafeHttpUrl("http://localhost:8080")).toThrow();
  });

  it("allows public https", () => {
    expect(assertSafeHttpUrl("https://hooks.example.com/xingyu").hostname).toBe("hooks.example.com");
  });
});
