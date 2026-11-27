import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateNoteDto } from "./note.dto";

describe("CreateNoteDto", () => {
  it("trims valid note content", async () => {
    const dto = plainToInstance(CreateNoteDto, {
      content: "  anotação interna  ",
      dealId: "deal-1",
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.content).toBe("anotação interna");
  });

  it("rejects blank and oversized notes", async () => {
    const blank = plainToInstance(CreateNoteDto, { content: "   " });
    const oversized = plainToInstance(CreateNoteDto, { content: "x".repeat(5001) });
    expect(await validate(blank)).not.toHaveLength(0);
    expect(await validate(oversized)).not.toHaveLength(0);
  });
});
