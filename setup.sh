#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
EXPECTED_DIR="$HOME/.pi/agent"
BACKUP_ROOT="$HOME/.pi_backup"

prompt_yes_no() {
  local message="$1"
  local default="${2:-Y}"
  local prompt

  if [ "$default" = "Y" ]; then
    prompt="[Y/n]"
  else
    prompt="[y/N]"
  fi

  while true; do
    read -r -p "$message $prompt " answer
    answer="${answer:-$default}"
    case "${answer,,}" in
      y|yes) return 0 ;;
      n|no) return 1 ;;
      *)
        echo "Please answer y or n."
        ;;
    esac
  done
}

prompt_backend_choice() {
  local default="${1:-Llama Server}"
  local default_choice="1"
  if [ "$default" = "LM Studio" ]; then
    default_choice="2"
  fi

  echo "Choose your local backend:"
  echo "  1) Llama Server"
  echo "  2) LM Studio"

  while true; do
    read -r -p "Selection [$default_choice] " answer
    answer="${answer:-$default_choice}"
    case "$answer" in
      1) echo "Llama Server"; return 0 ;;
      2) echo "LM Studio"; return 0 ;;
      *) echo "Choose 1 or 2." ;;
    esac
  done
}

set_configured_backend() {
  local config_dir="$1"
  local provider="$2"
  sed -i.bak "s/\"defaultProvider\": \".*\"/\"defaultProvider\": \"$provider\"/" "$config_dir/settings.json"
  sed -i.bak "s/\"defaultModel\": \".*\"/\"defaultModel\": \"pi-local\"/" "$config_dir/settings.json"
  find "$config_dir/agents" -name '*.md' -type f -print0 | while IFS= read -r -d '' file; do
    sed -i.bak "0,/^model: .*\\/pi-local/s//model: $provider\\/pi-local/" "$file"
    rm -f "$file.bak"
  done
  rm -f "$config_dir/settings.json.bak"
}

backup_pi_config() {
  local timestamp destination
  timestamp="$(date +%Y%m%d-%H%M%S)"
  destination="$BACKUP_ROOT/agent-$timestamp"
  local skipped=()
  local items=()
  local path name index total

  mkdir -p "$destination"

  shopt -s dotglob nullglob
  for path in "$EXPECTED_DIR"/*; do
    name="$(basename "$path")"
    case "$name" in
      .git|.pi|bin|git|sessions|mcp-cache.json|mcp-npx-cache.json|run-history.jsonl|session-manager-config.toml)
        skipped+=("$name")
        continue
        ;;
    esac
    items+=("$path")
  done
  shopt -u dotglob nullglob

  echo "Creating backup at $destination"
  if [ "${#skipped[@]}" -gt 0 ]; then
    printf 'Skipping runtime/local items: %s\n' "$(IFS=', '; echo "${skipped[*]}")"
  fi

  total="${#items[@]}"
  index=0
  for path in "${items[@]}"; do
    index=$((index + 1))
    name="$(basename "$path")"
    echo "[$index/$total] Copying $name"
    cp -R "$path" "$destination/"
  done

  echo "Backup created at $destination"
}

if [ "$SCRIPT_DIR" != "$EXPECTED_DIR" ]; then
  echo "This repo should be cloned to $EXPECTED_DIR"
  echo "Current location: $SCRIPT_DIR"
  echo "Expected: $EXPECTED_DIR"
  exit 1
fi

if command -v pwsh >/dev/null 2>&1; then
  exec pwsh -File "$SCRIPT_DIR/setup.ps1"
fi

echo "Setting up pi config at $EXPECTED_DIR"
echo

SELECTED_PROVIDER="$(prompt_backend_choice)"

if prompt_yes_no "Create a backup of the current pi config in $BACKUP_ROOT before installing?" Y; then
  backup_pi_config
else
  echo "Skipping backup."
fi

set_configured_backend "$EXPECTED_DIR" "$SELECTED_PROVIDER"
echo "Configured local backend: $SELECTED_PROVIDER"

packages=(
  "git:github.com/nicobailon/pi-mcp-adapter"
  "git:github.com/HazAT/pi-smart-sessions"
  "git:github.com/HazAT/pi-parallel"
  "git:github.com/pasky/chrome-cdp-skill"
  "git:github.com/HazAT/pi-interactive-subagents"
  "git:github.com/HazAT/pi-autoresearch"
)

echo
if prompt_yes_no "Install configured pi packages now?" Y; then
  echo "Installing packages..."
  for package in "${packages[@]}"; do
    echo "  $package"
    if ! pi install "$package"; then
      echo "    skipped (already installed or install failed)"
    fi
  done
else
  echo "Skipping package installation."
fi

echo
if [ "$SELECTED_PROVIDER" = "LM Studio" ]; then
  if prompt_yes_no "Run the LM Studio CLI check now?" Y; then
    echo "LM Studio checks:"
    if lms --help >/dev/null 2>&1; then
      echo "  LM Studio CLI detected."
    else
      echo "  LM Studio CLI not detected. Install LM Studio and make sure 'lms' is on PATH."
    fi
  else
    echo "Skipping LM Studio CLI check."
  fi
else
  if prompt_yes_no "Check the llama server endpoint now?" Y; then
    echo "Llama server checks:"
    if curl -fsS http://127.0.0.1:1234/v1/models >/dev/null 2>&1; then
      echo "  Llama server responded on http://127.0.0.1:1234/v1."
    else
      echo "  Llama server did not respond on http://127.0.0.1:1234/v1/models."
      echo "  Start your server and make sure it exposes an OpenAI-compatible /v1 endpoint on port 1234."
    fi
  else
    echo "Skipping llama server endpoint check."
  fi
fi

echo
if [ "$SELECTED_PROVIDER" = "LM Studio" ]; then
  echo "Recommended LM Studio load commands:"
  echo "  lms server start"
  echo "  lms load <your-chosen-local-model> --identifier pi-local -c 32768"
  echo
  echo "Examples:"
  echo "  lms load huihui-qwen3-coder-30b-a3b-instruct-abliterated-i1 --identifier pi-local -c 32768"
  echo "  lms load qwen3.5-9b-claude-code --identifier pi-local -c 32768"
else
  echo "Recommended llama server setup:"
  echo "  Start llama-server with your preferred model and expose an OpenAI-compatible API on http://127.0.0.1:1234/v1"
  echo "  Keep the model name exposed as pi-local if your launcher supports aliases, or keep a single model loaded."
fi

echo
echo "Verify local models:"
if [ "$SELECTED_PROVIDER" = "LM Studio" ]; then
  echo "  lms ps"
else
  echo "  curl http://127.0.0.1:1234/v1/models"
fi
echo "  pi --list-models"

echo
echo "Backup agent:"
echo "  Start pi and use the backup-config agent when you want another snapshot under $BACKUP_ROOT."

echo
echo "Optional Codex login:"
echo "  Start pi, then run /login and choose ChatGPT Plus/Pro (Codex)."
echo "  Use planner-codex, reviewer-codex, or researcher-codex when you want cloud help."

echo
echo "Setup complete."
echo "Restart pi after your pi-local local model is available through $SELECTED_PROVIDER."
