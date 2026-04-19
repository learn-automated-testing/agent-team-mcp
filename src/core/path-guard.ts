import { homedir } from "node:os";
import { isAbsolute, relative, resolve } from "node:path";

export function claudeProjectsRoot(): string {
  return resolve(homedir(), ".claude", "projects");
}

export function assertPathUnderAllowedRoots(
  candidate: string,
  allowedRoots: readonly string[],
  label: string,
): string {
  const resolved = resolve(candidate);
  for (const root of allowedRoots) {
    const rel = relative(resolve(root), resolved);
    if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))) {
      return resolved;
    }
  }
  throw new Error(
    `${label}: path ${JSON.stringify(resolved)} is not under any allowed root (${allowedRoots
      .map((r) => JSON.stringify(resolve(r)))
      .join(", ")})`,
  );
}
