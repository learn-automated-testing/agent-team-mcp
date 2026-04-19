import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { measureTeam } from "./measure.js";

describe("measureTeam transcriptPath allowlist", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "skillsrepo-measure-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("should reject transcriptPath outside the allowed roots", async () => {
    await expect(
      measureTeam({ projectDir: dir, transcriptPath: "/etc/passwd" }),
    ).rejects.toThrow(/not under any allowed root/);
  });

  it("should not read arbitrary files via the transcript heuristic", async () => {
    const report = await measureTeam({ projectDir: dir, transcript: "/etc/passwd" });
    expect(report.transcriptSource).toBe("(literal)");
  });
});
