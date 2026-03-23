$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$expectedDir = Join-Path $HOME ".pi\agent"
$backupRoot = Join-Path $HOME ".pi_backup"

function Resolve-CanonicalPath {
  param([string]$Path)

  try {
    return (Resolve-Path $Path).Path
  } catch {
    return $null
  }
}

function Prompt-YesNo {
  param(
    [string]$Message,
    [bool]$Default = $true
  )

  $suffix = if ($Default) { "[Y/n]" } else { "[y/N]" }
  $response = Read-Host "$Message $suffix"

  if ([string]::IsNullOrWhiteSpace($response)) {
    return $Default
  }

  switch ($response.Trim().ToLowerInvariant()) {
    "y" { return $true }
    "yes" { return $true }
    "n" { return $false }
    "no" { return $false }
    default {
      Write-Host "Please answer y or n." -ForegroundColor Yellow
      return Prompt-YesNo -Message $Message -Default $Default
    }
  }
}

function Prompt-BackendChoice {
  param([string]$Default = "Llama Server")

  Write-Host "Choose your local backend:"
  Write-Host "  1) Llama Server"
  Write-Host "  2) LM Studio"

  $defaultChoice = if ($Default -eq "LM Studio") { "2" } else { "1" }

  while ($true) {
    $response = Read-Host "Selection [$defaultChoice]"
    if ([string]::IsNullOrWhiteSpace($response)) {
      $response = $defaultChoice
    }

    switch ($response.Trim()) {
      "1" { return "Llama Server" }
      "2" { return "LM Studio" }
      default { Write-Host "Choose 1 or 2." -ForegroundColor Yellow }
    }
  }
}

function Set-ConfiguredBackend {
  param(
    [string]$ConfigDir,
    [string]$Provider
  )

  $settingsPath = Join-Path $ConfigDir "settings.json"
  $settings = Get-Content $settingsPath -Raw | ConvertFrom-Json
  $settings.defaultProvider = $Provider
  $settings.defaultModel = "pi-local"
  $settings | ConvertTo-Json -Depth 100 | Set-Content -Encoding utf8 $settingsPath

  Get-ChildItem (Join-Path $ConfigDir "agents") -Filter *.md | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $updated = [regex]::Replace($content, 'model:\s+.+?/pi-local', "model: $Provider/pi-local", 1)
    if ($updated -ne $content) {
      Set-Content -Encoding utf8 $_.FullName $updated
    }
  }
}

function Backup-PiConfig {
  param(
    [string]$SourceDir,
    [string]$DestinationRoot
  )

  $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $destinationDir = Join-Path $DestinationRoot "agent-$timestamp"
  $excludeNames = @(
    ".git",
    ".pi",
    "bin",
    "git",
    "sessions",
    "mcp-cache.json",
    "mcp-npx-cache.json",
    "run-history.jsonl",
    "session-manager-config.toml"
  )

  New-Item -ItemType Directory -Force -Path $destinationDir | Out-Null

  $itemsToCopy = Get-ChildItem -LiteralPath $SourceDir -Force | Where-Object {
    $excludeNames -notcontains $_.Name
  }
  $skippedItems = Get-ChildItem -LiteralPath $SourceDir -Force | Where-Object {
    $excludeNames -contains $_.Name
  } | Select-Object -ExpandProperty Name

  Write-Host "Creating backup at $destinationDir"
  if ($skippedItems) {
    Write-Host "Skipping runtime/local items: $($skippedItems -join ', ')" -ForegroundColor DarkYellow
  }

  $totalItems = $itemsToCopy.Count
  $index = 0

  foreach ($item in $itemsToCopy) {
    $index++
    $percent = if ($totalItems -gt 0) { [int](($index / $totalItems) * 100) } else { 100 }
    $itemType = if ($item.PSIsContainer) { "directory" } else { "file" }
    Write-Progress -Activity "Backing up Pi config" -Status "Copying $($item.Name) ($index of $totalItems)" -PercentComplete $percent
    Write-Host ("[{0}/{1}] Copying {2}: {3}" -f $index, $totalItems, $itemType, $item.Name)

    $targetPath = Join-Path $destinationDir $item.Name
    Copy-Item -LiteralPath $item.FullName -Destination $targetPath -Recurse -Force
  }

  Write-Progress -Activity "Backing up Pi config" -Completed

  Write-Host "Backup created at $destinationDir" -ForegroundColor Green
}

$resolvedScriptDir = Resolve-CanonicalPath $scriptDir
$resolvedExpectedDir = Resolve-CanonicalPath $expectedDir

if (-not $resolvedExpectedDir -or $resolvedScriptDir -ne $resolvedExpectedDir) {
  Write-Host "This repo should be cloned to $expectedDir" -ForegroundColor Yellow
  Write-Host "Current location: $scriptDir"
  Write-Host "Expected: $expectedDir"
  exit 1
}

Write-Host "Setting up pi config at $expectedDir"
Write-Host ""

$selectedProvider = Prompt-BackendChoice

if (Prompt-YesNo "Create a backup of the current pi config in $backupRoot before installing?" $true) {
  Backup-PiConfig -SourceDir $expectedDir -DestinationRoot $backupRoot
} else {
  Write-Host "Skipping backup."
}

Set-ConfiguredBackend -ConfigDir $expectedDir -Provider $selectedProvider
Write-Host "Configured local backend: $selectedProvider" -ForegroundColor Green

$packages = @(
  "git:github.com/nicobailon/pi-mcp-adapter",
  "git:github.com/HazAT/pi-smart-sessions",
  "git:github.com/HazAT/pi-parallel",
  "git:github.com/pasky/chrome-cdp-skill",
  "git:github.com/HazAT/pi-interactive-subagents",
  "git:github.com/HazAT/pi-autoresearch"
)

Write-Host ""
if (Prompt-YesNo "Install configured pi packages now?" $true) {
  Write-Host "Installing packages..."
  foreach ($package in $packages) {
    Write-Host "  $package"
    & pi install $package | Out-Host
    if ($LASTEXITCODE -ne 0) {
      Write-Host "    skipped (already installed or install failed)" -ForegroundColor DarkYellow
    }
  }
} else {
  Write-Host "Skipping package installation."
}

Write-Host ""
if ($selectedProvider -eq "LM Studio") {
  if (Prompt-YesNo "Run the LM Studio CLI check now?" $true) {
    Write-Host "LM Studio checks:"
    & lms --help *> $null
    if ($LASTEXITCODE -eq 0) {
      Write-Host "  LM Studio CLI detected."
    } else {
      Write-Host "  LM Studio CLI not detected. Install LM Studio and make sure 'lms' is on PATH." -ForegroundColor Yellow
    }
  } else {
    Write-Host "Skipping LM Studio CLI check."
  }
} else {
  if (Prompt-YesNo "Check the llama server endpoint now?" $true) {
    Write-Host "Llama server checks:"
    try {
      $response = Invoke-RestMethod -Uri "http://127.0.0.1:1234/v1/models" -TimeoutSec 5
      $count = @($response.data).Count
      Write-Host "  Llama server responded on http://127.0.0.1:1234/v1 ($count model(s) reported)."
    } catch {
      Write-Host "  Llama server did not respond on http://127.0.0.1:1234/v1/models." -ForegroundColor Yellow
      Write-Host "  Start your server and make sure it exposes an OpenAI-compatible /v1 endpoint on port 1234." -ForegroundColor Yellow
    }
  } else {
    Write-Host "Skipping llama server endpoint check."
  }
}

Write-Host ""
if ($selectedProvider -eq "LM Studio") {
  Write-Host "Recommended LM Studio load commands:"
  Write-Host "  lms server start"
  Write-Host "  lms load <your-chosen-local-model> --identifier pi-local -c 32768"
  Write-Host ""
  Write-Host "Examples:"
  Write-Host "  lms load huihui-qwen3-coder-30b-a3b-instruct-abliterated-i1 --identifier pi-local -c 32768"
  Write-Host "  lms load qwen3.5-9b-claude-code --identifier pi-local -c 32768"
} else {
  Write-Host "Recommended llama server setup:"
  Write-Host "  Start llama-server with your preferred model and expose an OpenAI-compatible API on http://127.0.0.1:1234/v1"
  Write-Host "  Keep the model name exposed as pi-local if your launcher supports aliases, or keep a single model loaded."
}

Write-Host ""
Write-Host "Verify local models:"
if ($selectedProvider -eq "LM Studio") {
  Write-Host "  lms ps"
} else {
  Write-Host "  Invoke-RestMethod http://127.0.0.1:1234/v1/models"
}
Write-Host "  pi --list-models"

Write-Host ""
Write-Host "Backup agent:"
Write-Host "  Start pi and use the backup-config agent when you want another snapshot under $backupRoot."

Write-Host ""
Write-Host "Optional Codex login:"
Write-Host "  Start pi, then run /login and choose ChatGPT Plus/Pro (Codex)."
Write-Host "  Use planner-codex, reviewer-codex, or researcher-codex when you want cloud help."

Write-Host ""
Write-Host "Setup complete."
Write-Host "Restart pi after your pi-local local model is available through $selectedProvider."
