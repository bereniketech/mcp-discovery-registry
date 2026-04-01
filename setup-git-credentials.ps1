# Git credential helper setup for this repository
# Configures git to use Windows Credential Manager for authentication
# 
# Run this script once in PowerShell:
# .\setup-git-credentials.ps1

# Configure git to use Windows Credential Manager
git config --local credential.helper wincred
git config --local user.name "bereniketech"
git config --local credential.https://github.com.useHttpPath $true

Write-Host "✓ Git credentials configured for this repository" -ForegroundColor Green
Write-Host "  - Credential helper: Windows Credential Manager (wincred)" -ForegroundColor Cyan
Write-Host "  - User: bereniketech" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your GitHub PAT has been stored in Windows Credential Manager" -ForegroundColor Yellow
Write-Host "Git will automatically use it for https:// operations" -ForegroundColor Yellow
Write-Host ""
Write-Host "Configuration saved in: .git/config" -ForegroundColor Gray

# Verify the configuration
Write-Host ""
Write-Host "Current git config for this repo:" -ForegroundColor Cyan
git config --local --list | Select-String "credential|user"
