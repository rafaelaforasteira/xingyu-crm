import fs from "node:fs";
import path from "node:path";
import { parse } from "postcss";
import { describe, expect, it } from "vitest";

const themeCss = parse(fs.readFileSync(path.join(__dirname, "../../../app/globals.css"), "utf8"));
const overviewCss = parse(
  fs.readFileSync(path.join(__dirname, "tracking-overview.module.css"), "utf8"),
);

function declarations(css: ReturnType<typeof parse>, selector: string) {
  const values: Record<string, string> = {};
  css.walkRules((rule) => {
    if (!rule.selectors.includes(selector)) return;
    rule.nodes.forEach((node) => {
      if (node.type === "decl") values[node.prop] = node.value;
    });
  });
  return values;
}

type Rgb = [number, number, number];

// Resolve the actual CSS variables and sRGB color-mix used by these two surfaces.
// Unsupported syntax fails explicitly instead of silently assuming a passing color.
function color(value: string | undefined, tokens: Record<string, string>): Rgb {
  if (!value) throw new Error("Missing contrast color/token");
  const variable = /^var\((--[\w-]+)\)$/.exec(value);
  if (variable?.[1]) return color(tokens[variable[1]], tokens);
  const hex = /^#([a-f\d]{6})$/i.exec(value);
  if (hex?.[1]) {
    const digits = hex[1];
    return [0, 2, 4].map((offset) => parseInt(digits.slice(offset, offset + 2), 16) / 255) as Rgb;
  }
  const mix = /^color-mix\(in srgb, (var\(--[\w-]+\)) (\d+)%, (var\(--[\w-]+\))\)$/.exec(value);
  if (mix) {
    const first = color(mix[1], tokens);
    const second = color(mix[3], tokens);
    const weight = Number(mix[2]) / 100;
    return first.map(
      (channel, index) => channel * weight + second[index as 0 | 1 | 2] * (1 - weight),
    ) as Rgb;
  }
  throw new Error(`Unsupported contrast color: ${value}`);
}

function luminance(rgb: Rgb) {
  const [red, green, blue] = rgb.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  ) as Rgb;
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

function contrast(first: Rgb, second: Rgb) {
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

describe.each(["light", "dark"] as const)("Tracking contrast in %s theme", (theme) => {
  const tokens = {
    ...declarations(themeCss, ".tracking-portal"),
    ...(theme === "dark" ? declarations(themeCss, ".dark .tracking-portal") : {}),
  };

  it("keeps the essential net-sales stroke at least 3:1 against its chart surface", () => {
    const series = {
      ...declarations(overviewCss, ".evolution"),
      ...(theme === "dark" ? declarations(overviewCss, ":global(.dark) .evolution") : {}),
    };
    const chart = declarations(overviewCss, ".chartCard");
    const ratio = contrast(color(series["--series-net"], tokens), color(chart.background, tokens));
    expect(ratio).toBeGreaterThanOrEqual(3);
  });

  it("keeps small negative-comparison text at least 4.5:1 on its composed chip background", () => {
    const chip = {
      ...declarations(overviewCss, ".compositionChip"),
      ...declarations(overviewCss, '.compositionChip[data-sentiment="negative"]'),
      ...(theme === "dark"
        ? declarations(overviewCss, ':global(.dark) .compositionChip[data-sentiment="negative"]')
        : {}),
    };
    const ratio = contrast(color(chip.color, tokens), color(chip.background, tokens));
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
