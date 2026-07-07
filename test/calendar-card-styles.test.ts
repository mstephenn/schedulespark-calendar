import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const styles = readFileSync("src/styles.css", "utf8");

describe("calendar card styling", () => {
  it("gives the outer calendar container rounded corners and a card shadow", () => {
    expect(styles).toMatch(/\.sscal\s*\{[^}]*border-radius:\s*12px;[^}]*\}/s);
    expect(styles).toMatch(/\.sscal\s*\{[^}]*box-shadow:[^;]+;[^}]*\}/s);
  });

  it("rounds event blocks to match the container's corner radius scale", () => {
    expect(styles).toMatch(/\.sscal__event\s*\{[^}]*border-radius:\s*6px;[^}]*\}/s);
    expect(styles).not.toMatch(/\.sscal__event\s*\{[^}]*border-radius:\s*4px;[^}]*\}/s);
  });
});
