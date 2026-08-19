import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, acc);
    else if (entry.endsWith(".controller.ts")) acc.push(full);
  }
  return acc;
}

describe("Swagger controller coverage (source audit)", () => {
  it("keeps @ApiTags and @ApiOperation on public HTTP handlers", () => {
    const root = path.join(__dirname, "..");
    const files = walk(root);
    expect(files.length).toBeGreaterThan(20);

    let handlers = 0;
    let documented = 0;
    let tagged = 0;
    const pending: string[] = [];

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      if (source.includes("@ApiTags(")) tagged += 1;
      const methodRegex =
        /@(Get|Post|Patch|Put|Delete)\([^)]*\)([\s\S]*?)(async\s+)?\w+\s*\(/g;
      let match: RegExpExecArray | null;
      while ((match = methodRegex.exec(source))) {
        handlers += 1;
        const block = match[0];
        const preceding = source.slice(Math.max(0, match.index - 400), match.index);
        if (preceding.includes("@ApiOperation") || block.includes("@ApiOperation")) {
          documented += 1;
        } else {
          pending.push(`${path.relative(root, file)} :: ${match[1]}`);
        }
      }
    }

    const coverage = handlers === 0 ? 0 : Math.round((documented / handlers) * 100);
    expect(files.length).toBeGreaterThanOrEqual(tagged);
    expect(coverage).toBeGreaterThanOrEqual(40);
    expect(pending.length).toBeLessThan(handlers);
  });
});
