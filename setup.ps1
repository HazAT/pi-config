$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$expectedDir = Join-Path $HOME ".pi\agent"

if ($scriptDir -ne $expectedDir) {
    Write-Host "⚠️  This repo should be cloned to $expectedDir"
    Write-Host "   Current location: $scriptDir"
    Write-Host "   Expected: $expectedDir"
    Write-Host ""
    Write-Host "   Run: git clone git@github.com:HazAT/pi-config $expectedDir"
    exit 1
}

Write-Host "Setting up pi-config at $expectedDir"
Write-Host ""

$settingsPath = Join-Path $expectedDir "settings.json"
if (-not (Test-Path $settingsPath)) {
    Write-Host "Creating settings.json..."
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
'@ | Set-Content -Encoding UTF8 $settingsPath
} else {
    Write-Host "settings.json already exists — skipping creation"
    Write-Host ""
}

Write-Host "Installing packages..."
$packages = @(
    "git:github.com/nicobailon/pi-mcp-adapter",
    "git:github.com/HazAT/pi-smart-sessions",
    "git:github.com/HazAT/pi-parallel",
    "git:github.com/pasky/chrome-cdp-skill",
    "git:github.com/HazAT/glimpse",
    "git:github.com/HazAT/pi-interactive-subagents",
    "git:github.com/HazAT/pi-autoresearch"
)

foreach ($package in $packages) {
    try {
        pi install $package 2>$null
    } catch {
        $packageName = ($package -split '/')[-1]
        Write-Host "  $packageName already installed"
    }
}

Write-Host ""
Write-Host "✅ Setup complete!"
Write-Host ""
Write-Host "Restart pi to pick up all changes."
