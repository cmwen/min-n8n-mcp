#!/usr/bin/env bash
set -e

echo "🚀 Preparing @cmwen/min-n8n-mcp for release..."

# Check if we're on main branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "main" ]; then
  echo "❌ Must be on main branch to release. Current branch: $BRANCH"
  exit 1
fi

# Check if working directory is clean
if ! git diff-index --quiet HEAD --; then
  echo "❌ Working directory must be clean"
  exit 1
fi

echo "✅ On main branch with clean working directory"

# Run tests
echo "🧪 Running tests..."
pnpm test:ci

echo "🔍 Running type check..."
pnpm type-check

echo "🧹 Running linter..."
pnpm lint

echo "🏗️  Building project..."
pnpm build

echo "📦 Testing built package..."
node dist/cli.js --help > /dev/null

echo "✅ All checks passed! Ready to publish."
echo ""
echo "To publish:"
echo "1. Update version in package.json manually"
echo "2. Run: git add package.json && git commit -m 'chore: bump version to X.X.X'"
echo "3. Run: git tag vX.X.X"
echo "4. Run: git push origin main --tags"
echo "5. Run: pnpm publish"
echo ""
echo "Or use the GitHub release workflow for automated publishing."
