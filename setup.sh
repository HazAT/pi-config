#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
EXPECTED_DIR="$HOME/.pi/agent"

# Verify we're in the right place
if [ "$SCRIPT_DIR" != "$EXPECTED_DIR" ]; then
  echo "⚠️  This repo should be cloned to ~/.pi/agent/"
  echo "   Current location: $SCRIPT_DIR"
  echo "   Expected: $EXPECTED_DIR"
  echo ""
  echo "   Run: git clone git@github.com:HazAT/pi-config $EXPECTED_DIR"
  exit 1
fi

echo "Setting up pi-config at $EXPECTED_DIR"
echo ""

# Create settings.json if it doesn't exist
if [ ! -f "$EXPECTED_DIR/settings.json" ]; then
  echo "Creating settings.json..."
  cat > "$EXPECTED_DIR/settings.json" << 'EOF'
{
  "defaultProvider": "anthropic",
  "defaultModel": "claude-opus-4-6",
  "defaultThinkingLevel": "high",
  "packages": [
    "git:github.com/HazAT/pi-subagents",
    "git:github.com/nicobailon/pi-mcp-adapter",
    "git:github.com/HazAT/pi-smart-sessions"
  ],
  "hideThinkingBlock": false
}
EOF
else
  echo "settings.json already exists — skipping creation"
  echo "Make sure your packages list includes:"
  echo '  "git:github.com/HazAT/pi-subagents"'
  echo '  "git:github.com/nicobailon/pi-mcp-adapter"'
  echo '  "git:github.com/HazAT/pi-smart-sessions"'
  echo '  "git:github.com/HazAT/pi-parallel"'
  echo '  "git:git@github.com:HazAT/glimpse.git"'
  echo '  "git:git@github.com:sasha-computer/pi-cmux.git"'
  echo ""
fi

# Install git packages
echo "Installing packages..."
pi install git:github.com/HazAT/pi-subagents 2>/dev/null || echo "  pi-subagents already installed"
pi install git:github.com/nicobailon/pi-mcp-adapter 2>/dev/null || echo "  pi-mcp-adapter already installed"
pi install git:github.com/HazAT/pi-smart-sessions 2>/dev/null || echo "  pi-smart-sessions already installed"
pi install git:github.com/HazAT/pi-parallel 2>/dev/null || echo "  pi-parallel already installed"
pi install git:git@github.com:HazAT/glimpse.git 2>/dev/null || echo "  glimpse already installed"
pi install git:git@github.com:sasha-computer/pi-cmux.git 2>/dev/null || echo "  pi-cmux already installed"
echo ""

# Install claude-tool extension dependencies
if [ -f "$EXPECTED_DIR/extensions/claude-tool/package.json" ]; then
  echo "Installing claude-tool dependencies..."
  cd "$EXPECTED_DIR/extensions/claude-tool" && npm install --silent
  cd "$EXPECTED_DIR"
  echo ""
fi

echo "✅ Setup complete!"
echo ""
echo "Restart pi to pick up all changes."
