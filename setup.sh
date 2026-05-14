#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
EXPECTED_DIR="$HOME/.pi/agent"

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

if [ ! -f "$EXPECTED_DIR/settings.json" ]; then
  echo "Creating settings.json..."
  cat > "$EXPECTED_DIR/settings.json" << 'EOF'
{
  "lastChangelogVersion": "0.74.0",
  "defaultProvider": "openai-codex",
  "defaultModel": "gpt-5.5",
  "defaultThinkingLevel": "xhigh",
  "packages": [
    "git:github.com/pasky/chrome-cdp-skill",
    "git:github.com/HazAT/pi-parallel"
  ],
  "hideThinkingBlock": false,
  "enabledModels": ["anthropic/claude-opus-4-7", "openai-codex/gpt-5.5"]
}
EOF
else
  echo "settings.json already exists — skipping creation"
fi

echo ""

if ! command -v pi >/dev/null 2>&1; then
  echo "pi CLI not found. Install pi, then run ./setup.sh again to install packages."
  exit 1
fi

echo "Installing configured packages..."
pi install git:github.com/pasky/chrome-cdp-skill 2>/dev/null || echo "  chrome-cdp-skill already installed"
pi install git:github.com/HazAT/pi-parallel 2>/dev/null || echo "  pi-parallel already installed"
echo ""

echo "✅ Setup complete!"
echo ""
echo "Restart pi to pick up all changes."
