// Minimatch-style glob-to-regex for matching paths like `**/*.ts`, `src/**/*`, `foo/*.py`.
// Handles the zero-depth case: `**/*.ts` matches `foo.ts` at the root.

const PATTERN_CACHE = new Map<string, RegExp>();

export function globToRegExp(pattern: string): RegExp {
  const cached = PATTERN_CACHE.get(pattern);
  if (cached) return cached;
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*\//g, "__DSS__")
    .replace(/\*\*/g, "__DS__")
    .replace(/\*/g, "[^/]*")
    .replace(/\?/g, "[^/]")
    .replace(/__DSS__/g, "(?:.*/)?")
    .replace(/__DS__/g, ".*");
  const re = new RegExp("^" + escaped + "$");
  PATTERN_CACHE.set(pattern, re);
  return re;
}

export function globMatches(pattern: string, path: string): boolean {
  return globToRegExp(pattern).test(path);
}
