import { ArgumentMetadata, ValidationPipe } from "@nestjs/common";
import { PaginationQueryDto } from "./pagination.dto";
import { MAX_PAGE_SIZE } from "../constants";

async function transform(value: unknown) {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  });
  const metadata: ArgumentMetadata = { type: "query", metatype: PaginationQueryDto, data: "" };
  return pipe.transform(value, metadata);
}

describe("PaginationQueryDto", () => {
  it("accepts a normal page", async () => {
    const result = await transform({ page: "1", pageSize: "20" });
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it("rejects pageSize above the maximum", async () => {
    await expect(transform({ pageSize: String(MAX_PAGE_SIZE + 1) })).rejects.toBeDefined();
  });

  it("rejects page 0 and negative sizes", async () => {
    await expect(transform({ page: "0" })).rejects.toBeDefined();
    await expect(transform({ pageSize: "-1" })).rejects.toBeDefined();
  });
});
