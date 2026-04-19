#!/bin/sh
# skillsrepo: pre-commit workflow gate
# Blocks commits when .claude/state.json shows status=needs-fixes or blocked.
# Bypass with: git commit --no-verify

STATE=".claude/state.json"
[ -f "$STATE" ] || exit 0

STATUS=$(node -e "
try {
  const s = JSON.parse(require('node:fs').readFileSync('$STATE', 'utf8'));
  process.stdout.write(s.status || '');
} catch { process.exit(0); }
" 2>/dev/null)

case "$STATUS" in
  needs-fixes|blocked)
    echo "❌ skillsrepo: commit blocked — workflow status is '$STATUS'."
    echo "   Resolve the workflow (.claude/state.json) before committing."
    echo "   Bypass with: git commit --no-verify"
    exit 1
    ;;
esac

exit 0
