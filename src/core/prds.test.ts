import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { listPrds } from "./prds.js";

interface PrdFixture {
  readonly folder: string;
  readonly fileBody: string;
  readonly epics?: readonly string[];
}

function writePrd(root: string, fixture: PrdFixture): string {
  const dir = join(root, "docs", "requirements", fixture.folder);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${fixture.folder}.md`);
  writeFileSync(path, fixture.fileBody, "utf8");
  for (const epic of fixture.epics ?? []) {
    mkdirSync(join(dir, epic), { recursive: true });
  }
  return path;
}

function statusBody(prdId: string, slug: string, status: string): string {
  return [
    `# ${prdId} — ${slug}`,
    "",
    `> **Status:** ${status} (2026-05-10)`,
    "> **Owner:** <TBD>",
    "",
    "## Problem statement",
    "",
    "Body content.",
    "",
  ].join("\n");
}

function bodyWithoutStatus(prdId: string, slug: string): string {
  return [
    `# ${prdId} — ${slug}`,
    "",
    "## Problem statement",
    "",
    "This PRD is missing its Status blockquote on purpose.",
    "",
  ].join("\n");
}

describe("listPrds (EPIC-013 US-001)", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "agent-team-prds-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("should return total: 0 and an empty array when docs/requirements is missing", async () => {
    const result = await listPrds({ projectDir: dir });
    expect(result).toEqual({ total: 0, prds: [] });
  });

  it("should return PRD entries sorted by id ascending", async () => {
    writePrd(dir, {
      folder: "PRD-002-beta",
      fileBody: statusBody("PRD-002", "beta", "ready"),
    });
    writePrd(dir, {
      folder: "PRD-001-alpha",
      fileBody: statusBody("PRD-001", "alpha", "draft"),
    });
    const result = await listPrds({ projectDir: dir });
    expect(result.prds.map((p) => p.id)).toEqual(["PRD-001", "PRD-002"]);
  });

  it("should populate every field on each entry from the folder + body", async () => {
    const epics = ["EPIC-100-one", "EPIC-101-two"];
    const path = writePrd(dir, {
      folder: "PRD-001-alpha",
      fileBody: statusBody("PRD-001", "alpha", "draft"),
      epics,
    });
    const result = await listPrds({ projectDir: dir });
    expect(result.prds[0]).toEqual({
      id: "PRD-001",
      slug: "alpha",
      title: "alpha",
      status: "draft",
      path,
      epicCount: 2,
    });
  });

  it("should yield status 'unknown' when the PRD body has no Status blockquote", async () => {
    writePrd(dir, {
      folder: "PRD-003-no-status",
      fileBody: bodyWithoutStatus("PRD-003", "no-status"),
    });
    const result = await listPrds({ projectDir: dir });
    expect(result.prds[0].status).toBe("unknown");
  });

  it("should keep listing other PRDs when one has a malformed body", async () => {
    writePrd(dir, {
      folder: "PRD-001-alpha",
      fileBody: statusBody("PRD-001", "alpha", "draft"),
    });
    writePrd(dir, {
      folder: "PRD-002-malformed",
      fileBody: bodyWithoutStatus("PRD-002", "malformed"),
    });
    const result = await listPrds({ projectDir: dir });
    expect(result.total).toBe(2);
  });

  it("should set epicCount to the number of EPIC-* siblings in the PRD folder", async () => {
    writePrd(dir, {
      folder: "PRD-001-alpha",
      fileBody: statusBody("PRD-001", "alpha", "ready"),
      epics: ["EPIC-100-one", "EPIC-101-two", "EPIC-102-three"],
    });
    const result = await listPrds({ projectDir: dir });
    expect(result.prds[0].epicCount).toBe(3);
  });

  it("should ignore non-PRD folders inside docs/requirements", async () => {
    writePrd(dir, {
      folder: "PRD-001-alpha",
      fileBody: statusBody("PRD-001", "alpha", "draft"),
    });
    mkdirSync(join(dir, "docs", "requirements", "scratch"), { recursive: true });
    const result = await listPrds({ projectDir: dir });
    expect(result.total).toBe(1);
  });

  it("should reject a projectDir outside the allowlist (path traversal)", async () => {
    const traversal = join(dir, "..", "..", "..", "..", "..", "..", "etc");
    await expect(listPrds({ projectDir: traversal })).rejects.toThrow(
      /listPrds\.projectDir/,
    );
  });

  it("should expose itself through the registered MCP tool wrapper", async () => {
    writePrd(dir, {
      folder: "PRD-001-alpha",
      fileBody: statusBody("PRD-001", "alpha", "draft"),
      epics: ["EPIC-100-one"],
    });

    const { registerListPrds } = await import("../tools/listPrds.js");

    interface Captured {
      name: string;
      handler: (args: { projectDir: string }) => Promise<{
        content: ReadonlyArray<{ type: string; text: string }>;
      }>;
    }
    let captured: Captured | null = null;
    const fakeServer = {
      registerTool(
        name: string,
        _meta: unknown,
        handler: Captured["handler"],
      ): void {
        captured = { name, handler };
      },
    } as unknown as Parameters<typeof registerListPrds>[0];

    registerListPrds(fakeServer);
    expect(captured).not.toBeNull();
    expect(captured!.name).toBe("list_prds");

    const out = await captured!.handler({ projectDir: dir });
    const parsed = JSON.parse(out.content[0].text) as {
      total: number;
      prds: Array<{ id: string; epicCount: number }>;
    };
    expect(parsed).toEqual({
      total: 1,
      prds: [
        expect.objectContaining({ id: "PRD-001", epicCount: 1 }),
      ],
    });
  });
});
