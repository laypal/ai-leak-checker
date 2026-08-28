# Keyboard Shortcuts (Cursor IDE)

> Part of the [AI Tooling Usage Guide](index.md).
`````
Cmd/Ctrl + K        → Open Cursor chat
@skills             → Invoke skill (tab-complete)
@security-reviewer  → Invoke subagent (tab-complete)
Cmd/Ctrl + L        → Select current file for context


Integration with Git Workflow
Pre-Commit Hook

# .husky/pre-commit

# Run security check on staged files
STAGED=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|js)$')

if [ -n "$STAGED" ]; then
  echo "Running security review on staged files..."
  # Trigger @security-reviewer via CLI or skip if manual review needed
fi

Pre-Push Hook


# .husky/pre-push

# Full compliance check before pushing
npm run test:unit || exit 1
npm run lint || exit 1

echo "Consider running:"
echo "  @documentation-sync"
echo "  @manifest-v3-compliance"
`````
