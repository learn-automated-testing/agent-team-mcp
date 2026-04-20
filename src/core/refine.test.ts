import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { refineItem } from "./refine.js";

describe("refineItem name validation", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "skillsrepo-refine-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("should reject a traversal name before touching the filesystem", async () => {
    await expect(
      refineItem({ projectDir: dir, kind: "agent", name: "../../etc/pwn" }),
    ).rejects.toThrow(/kebab-case/);
  });

  it("should reject a name with path separators", async () => {
    await expect(
      refineItem({ projectDir: dir, kind: "skill", name: "a/b" }),
    ).rejects.toThrow(/kebab-case/);
  });

  it("should reject an empty name", async () => {
    await expect(
      refineItem({ projectDir: dir, kind: "agent", name: "" }),
    ).rejects.toThrow(/kebab-case/);
  });
});
