import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mineMemory } from "./memory-mine.js";

describe("mineMemory memoryDir allowlist", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "skillsrepo-mine-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("should reject memoryDir outside ~/.claude/projects and the projectDir", async () => {
    await expect(
      mineMemory({ projectDir: dir, memoryDir: "/etc" }),
    ).rejects.toThrow(/not under any allowed root/);
  });

  it("should accept memoryDir under the projectDir", async () => {
    const result = await mineMemory({ projectDir: dir, memoryDir: join(dir, "memory") });
    expect(result.memoryExists).toBe(false);
  });
});
