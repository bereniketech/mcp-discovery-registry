#!/bin/bash
# Git credential helper for this repository
# Configures git to use Windows Credential Manager for authentication

# Run this script once to configure git for this repo:
# ./setup-git-credentials.sh

git config --local credential.helper wincred
git config --local user.name "bereniketech"
git config --local credential.https://github.com.useHttpPath true

echo "✓ Git credentials configured for this repository"
echo "  - Credential helper: Windows Credential Manager (wincred)"
echo "  - User: bereniketech"
echo ""
echo "Your GitHub PAT has been stored in Windows Credential Manager"
echo "Git will automatically use it for https:// operations"
