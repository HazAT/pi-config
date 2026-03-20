$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$expectedDir = Join-Path $HOME ".pi/agent"

if ((Resolve-Path $scriptDir).Path -ne (Resolve-Path $expectedDir -ErrorAction SilentlyContinue).Path) {
    if (-not (Test-Path $expectedDir)) {
        Write-Host "⚠️  This repo should be cloned to $expectedDir"
    } else {
        Write-Host "⚠️  This repo should be cloned to $expectedDir"
        Write-Host "   Current location: $scriptDir"
        Write-Host "   Expected: $expectedDir"
    }
    Write-Host ""
    Write-Host "   Run: git clone git@github.com:HazAT/pi-config $expectedDir"
    exit 1
}

Write-Host "Setting up pi-config at $expectedDir"
Write-Host ""

$settingsPath = Join-Path $expectedDir "settings.json"
if (-not (Test-Path $settingsPath)) {
    Write-Host "Creating local-first settings.json..."
    @'
{
  "defaultProvider": "lmstudio",
  "defaultThinkingLevel": "medium",
  "packages": [
    "git:github.com/nicobailon/pi-mcp-adapter",
    {
      "source": "git:github.com/HazAT/pi-smart-sessions",
      "extensions": [
        "+extensions/smart-sessions.ts"
      ]
    },
    {
      "source": "git:github.com/HazAT/pi-parallel",
      "extensions": [
        "+extension/index.ts"
      ]
    },
    "git:github.com/pasky/chrome-cdp-skill",
    "git:github.com/HazAT/glimpse",
    "git:github.com/HazAT/pi-interactive-subagents",
    "git:github.com/HazAT/pi-autoresearch"
  ],
  "hideThinkingBlock": false,
  "extensions": [
    "+extensions/cmux/index.ts"
  ]
}
'@ | Set-Content -LiteralPath $settingsPath -NoNewline
} else {
    Write-Host "settings.json already exists — leaving it unchanged"
    Write-Host ""
}

Write-Host "Installing packages..."
$packages = @(
    'git:github.com/nicobailon/pi-mcp-adapter',
    'git:github.com/HazAT/pi-smart-sessions',
    'git:github.com/HazAT/pi-parallel',
    'git:github.com/pasky/chrome-cdp-skill',
    'git:github.com/HazAT/glimpse',
    'git:github.com/HazAT/pi-interactive-subagents',
    'git:github.com/HazAT/pi-autoresearch'
)

foreach ($package in $packages) {
    try {
        pi install $package | Out-Null
        Write-Host "  installed $package"
    } catch {
        Write-Host "  $package already installed or unavailable"
    }
}

Write-Host ""
Write-Host "✅ Setup complete!"
Write-Host "Restart pi to pick up all changes."
