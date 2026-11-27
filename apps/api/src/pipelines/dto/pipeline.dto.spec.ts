import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreatePipelineDto } from "./pipeline.dto";

describe("CreatePipelineDto management validation", () => {
  const valid = { name: "Pipeline", description: "x".repeat(140), color: "#2563EB", icon: "target" };

  it("accepts a 140-character description and a registry icon", async () => {
    expect(await validate(plainToInstance(CreatePipelineDto, valid))).toHaveLength(0);
  });

  it("rejects 141 characters, invalid colors, and arbitrary icons", async () => {
    const dto = plainToInstance(CreatePipelineDto, { ...valid, description: "x".repeat(141), color: "blue", icon: "<svg>" });
    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(expect.arrayContaining(["description", "color", "icon"]));
  });
});
