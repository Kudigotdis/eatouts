# Agent Audit: Uncommitted Changes
# Scans for uncommitted changes and compares against AGENT_CHANGE_LOG.md
# Run from repo root

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

Write-Host "=== AGENT COMMIT AUDIT ===" -ForegroundColor Cyan
Write-Host "Repo: $repoRoot" -ForegroundColor Gray
Write-Host ""

# Get git status
$status = git status --short 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: git status failed" -ForegroundColor Red
    Write-Host $status
    exit 1
}

$lines = $status | Where-Object { $_ -ne "" }
$count = ($lines | Measure-Object).Count

Write-Host "Uncommitted files: $count" -ForegroundColor Yellow
if ($count -gt 0) {
    $lines | ForEach-Object { Write-Host "  $_" -ForegroundColor White }
    Write-Host ""
    Write-Host "WARNING: Uncommitted changes detected!" -ForegroundColor Red
    Write-Host "Agent must commit these before ending session/task." -ForegroundColor Red
} else {
    Write-Host "No uncommitted changes." -ForegroundColor Green
}

Write-Host ""
Write-Host "=== END AUDIT ===" -ForegroundColor Cyan
exit $count
