// Minimatch-style glob-to-regex for matching paths like `**/*.ts`, `src/**/*`, `foo/*.py`.
// Handles the zero-depth case: `**/*.ts` matches `foo.ts` at the root.

export function globToRegExp(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*\//g, "__DSS__")
    .replace(/\*\*/g, "__DS__")
    .replace(/\*/g, "[^/]*")
    .replace(/\?/g, "[^/]")
    .replace(/__DSS__/g, "(?:.*/)?")
    .replace(/__DS__/g, ".*");
  return new RegExp("^" + escaped + "$");
}

export function globMatches(pattern: string, path: string): boolean {
  return globToRegExp(pattern).test(path);
}
