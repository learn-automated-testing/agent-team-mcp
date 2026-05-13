import { readFile, readdir } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { assertPathUnderAllowedRoots, claudeProjectsRoot } from "./path-guard.js";

/**
 * Summary of a single PRD discovered under `docs/requirements/`.
 *
 * Mirrors the shape of `RuleSummary` in {@link ./rules.ts} so callers can
 * reason by analogy across `list_rules` and `list_prds`.
 */
export interface PrdSummary {
  /** Canonical id like `"PRD-010"` (the `PRD-NNN` prefix of the folder). */
  readonly id: string;
  /** Slug like `"list-prds"` (the part after `PRD-NNN-`). */
  readonly slug: string;
  /** First `# ` heading in the PRD body, or the folder name as fallback. */
  readonly title: string;
  /**
   * Status read from the PRD body line `> **Status:** <state>`. `"unknown"`
   * if the line is missing or unparseable — never throws.
   */
  readonly status: string;
  /** Absolute path to the `PRD-NNN-<slug>.md` file. */
  readonly path: string;
  /** Number of `EPIC-*` siblings inside the PRD folder. */
  readonly epicCount: number;
}

export interface ListPrdsInput {
  readonly projectDir: string;
}

export interface ListPrdsResult {
  readonly total: number;
  readonly prds: readonly PrdSummary[];
}

const PRD_DIR_RE = /^PRD-(\d+)-(.+)$/;
const PRD_FILE_RE = /^PRD-\d+-.+\.md$/;
const EPIC_PREFIX = "EPIC-";

/**
 * Read a directory, returning [] when the directory does not exist (or is not
 * a directory). Any other error is wrapped with the operation name so callers
 * see what we were trying to read.
 */
async function safeReaddir(dir: string): Promise<string[]> {
  try {
    return await readdir(dir);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "ENOTDIR") return [];
    throw new Error(
      `safeReaddir(${JSON.stringify(dir)}) failed: ${(err as Error).message}`,
    );
  }
}

async function safeReadFile(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch (err) {
    throw new Error(
      `readPrdBody(${JSON.stringify(path)}) failed: ${(err as Error).message}`,
    );
  }
}

/**
 * The first `# ` heading wins. Returns `fallback` when the body has no h1.
 * Strips a leading `PRD-NNN — ` (em-dash or hyphen) prefix so the title reads
 * as a human-friendly description, matching what `workflow-report.ts` does
 * for stories.
 */
function extractTitle(body: string, fallback: string): string {
  for (const rawLine of body.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    const m = line.match(/^#\s+(.+)$/);
    if (m) {
      const heading = m[1].trim();
      const stripped = heading.replace(/^PRD-\d+\s*[—–-]\s*/u, "");
      return stripped || heading;
    }
  }
  return fallback;
}

/**
 * Parse `> **Status:** <state>` from the body. The capture is the first
 * non-whitespace token after `Status:` so values like `done (2026-05-10)`
 * yield `done`. Returns `"unknown"` when the line is absent or unmatchable.
 */
function extractStatus(body: string): string {
  for (const rawLine of body.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    const m = line.match(/^>\s*\*\*Status:\*\*\s*(\S+)/);
    if (m) return m[1].trim();
  }
  return "unknown";
}

interface PrdFolder {
  readonly id: string;
  readonly slug: string;
  readonly folderName: string;
  readonly absDir: string;
}

function parsePrdFolderName(name: string, requirementsDir: string): PrdFolder | null {
  const m = name.match(PRD_DIR_RE);
  if (!m) return null;
  const id = `PRD-${m[1]}`;
  const slug = m[2];
  return { id, slug, folderName: name, absDir: join(requirementsDir, name) };
}

async function summarisePrd(folder: PrdFolder): Promise<PrdSummary> {
  const childNames = await safeReaddir(folder.absDir);
  const epicCount = childNames.filter((n) => n.startsWith(EPIC_PREFIX)).length;
  const prdFileName = childNames.find((n) => PRD_FILE_RE.test(n));

  if (!prdFileName) {
    // No PRD-*.md inside the folder — surface what we can without throwing,
    // mirroring the resilience contract for malformed bodies.
    return {
      id: folder.id,
      slug: folder.slug,
      title: folder.folderName,
      status: "unknown",
      path: join(folder.absDir, `${folder.folderName}.md`),
      epicCount,
    };
  }

  const path = join(folder.absDir, prdFileName);
  const body = await safeReadFile(path);
  return {
    id: folder.id,
    slug: folder.slug,
    title: extractTitle(body, folder.folderName),
    status: extractStatus(body),
    path,
    epicCount,
  };
}

/**
 * List every PRD under `docs/requirements/` of the given project, sorted by
 * id ascending. Read-only — never writes. `projectDir` is validated against
 * the same allowlist used by `mineMemory` / `measureTeam` /
 * `generateWorkflowReport` to prevent path traversal.
 *
 * @throws when `projectDir` is outside the allowlist.
 * @throws when a PRD body cannot be read for an unexpected reason.
 */
export async function listPrds(input: ListPrdsInput): Promise<ListPrdsResult> {
  const projectDir = assertPathUnderAllowedRoots(
    input.projectDir,
    [claudeProjectsRoot(), homedir(), tmpdir()],
    "listPrds.projectDir",
  );

  const requirementsDir = join(projectDir, "docs", "requirements");
  const entries = await safeReaddir(requirementsDir);
  const folders: PrdFolder[] = [];
  for (const name of entries) {
    const folder = parsePrdFolderName(name, requirementsDir);
    if (folder) folders.push(folder);
  }

  const prds = await Promise.all(folders.map(summarisePrd));
  // Lexicographic sort on the zero-padded id is numerically equivalent.
  const sorted = [...prds].sort((a, b) => a.id.localeCompare(b.id));

  return { total: sorted.length, prds: sorted };
}

