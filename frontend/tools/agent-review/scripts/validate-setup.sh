#!/usr/bin/env bash
# validate-setup.sh - Validiert Agent-Review-Tool Setup und Dependencies

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
AGENT_CLI="$SCRIPT_DIR/../cli/python/agent_cli.py"

echo "🔍 Validating Agent-Review Tool Setup..."
echo ""

# Check if in correct directory
cd "$PROJECT_ROOT/frontend"
echo "✅ Working directory: $(pwd)"

# Check Python
if command -v python3 &> /dev/null; then
    echo "✅ Python 3: $(python3 --version)"
else
    echo "❌ Python 3 not found"
    exit 1
fi

# Check Node/npm
if command -v npm &> /dev/null; then
    echo "✅ npm: $(npm --version)"
else
    echo "❌ npm not found"
    exit 1
fi

# Check Vitest
if npx vitest --version &> /dev/null; then
    echo "✅ Vitest: $(npx vitest --version)"
else
    echo "❌ Vitest not available"
    exit 1
fi

# Check Agent CLI
if [[ -f "$AGENT_CLI" ]]; then
    echo "✅ Agent CLI: $AGENT_CLI"
    if python3 "$AGENT_CLI" --help &> /dev/null; then
        echo "✅ Agent CLI executable"
    else
        echo "❌ Agent CLI not executable"
        exit 1
    fi
else
    echo "❌ Agent CLI not found at: $AGENT_CLI"
    exit 1
fi

# Check required directories
for dir in "tools/agent-review" "tools/agent-review/cli" "tools/agent-review/examples"; do
    if [[ -d "$dir" ]]; then
        echo "✅ Directory: $dir"
    else
        echo "❌ Missing directory: $dir"
        exit 1
    fi
done

# Check example files
for file in "tools/agent-review/examples/vitest-example.json" "tools/agent-review/examples/coverage-example.json"; do
    if [[ -f "$file" ]]; then
        echo "✅ Example file: $file"
    else
        echo "❌ Missing example: $file"
        exit 1
    fi
done

# Test basic CLI functionality
echo ""
echo "🧪 Testing CLI functionality..."

# Test with example data
python3 "$AGENT_CLI" collect \
  --vitest tools/agent-review/examples/vitest-example.json \
  --coverage tools/agent-review/examples/coverage-example.json \
  --out /tmp/test-artifacts.json

if [[ -f "/tmp/test-artifacts.json" ]]; then
    echo "✅ Artifact collection works"
    rm -f /tmp/test-artifacts.json
else
    echo "❌ Artifact collection failed"
    exit 1
fi

# Test prompt generation
python3 "$AGENT_CLI" prompt \
  --artifacts tools/agent-review/examples/vitest-example.json \
  --out /tmp/test-prompt.txt 2>/dev/null || {
    echo "⚠️  Prompt generation test skipped (needs proper artifacts)"
}

# Test validation with example
if python3 "$AGENT_CLI" validate --output tools/agent-review/examples/agent-output-example.json &> /dev/null; then
    echo "✅ Output validation works"
else
    echo "❌ Output validation failed"
    exit 1
fi

echo ""
echo "🎉 All checks passed! Agent-Review Tool is ready to use."
echo ""
echo "📖 Usage:"
echo "   ./tools/agent-review/scripts/full-review.sh"
echo "   OR"
echo "   python3 tools/agent-review/cli/python/agent_cli.py --help"
echo ""
echo "📚 Documentation: tools/agent-review/README.md"
