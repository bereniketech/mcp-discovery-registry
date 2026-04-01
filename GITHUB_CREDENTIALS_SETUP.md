# GitHub Credentials Setup — bereniketech

## ✓ Credentials Configured

Your GitHub credentials have been added to this repository:

**Credential Manager Status:**
- ✓ Windows Credential Manager: `github.com` entry added
- ✓ Username: `bereniketech`
- ✓ Personal Access Token (PAT): Stored securely

**Git Configuration (local to this repo):**
- ✓ Credential helper: `wincred` (Windows Credential Manager)
- ✓ User name: `bereniketech`
- ✓ HTTP path enabled for credential lookups

## Verify Credentials

To verify the credentials are working:

```bash
# Test git access
git ls-remote https://github.com/bereniketech/mcp-discovery-registry.git

# List local git config
git config --local --list
```

## Credential Manager Access

If you need to view or modify credentials in Windows Credential Manager:

**PowerShell:**
```powershell
# List all git-related credentials
cmdkey /list | Select-String github

# Delete a credential (if needed)
cmdkey /delete:github.com
```

**GUI:**
1. Windows → Settings → Credential Manager
2. View → Windows Credentials
3. Look for "git:https://github.com" entry

## Git Operations

Git will automatically use your stored PAT for:
- `git clone https://github.com/...`
- `git push`
- `git pull`
- Other https-based operations

No need to enter credentials each time — they're loaded from Credential Manager automatically.

## Security Notes

- ✓ Credentials are stored in **Windows Credential Manager** (encrypted)
- ✓ Not stored in `.git/config` or any plain text file
- ✓ Local git config only points to the credential helper
- ✓ `.gitignore` protects any local config files

## Reset/Change Credentials

If you need to update the PAT later:

```powershell
# Remove old credential
cmdkey /delete:github.com

# Add new credential
cmdkey /add:github.com /user:bereniketech /pass:"NEW_PAT_HERE"
```

## Troubleshooting

**"The credential helper 'wincred' is not found"**
- `wincred` is built into Windows. This error shouldn't occur on Windows systems.

**"Access denied"**
- Verify the PAT has the correct scopes (public_repo, read:user)
- Check that the username is correct: `bereniketech`

**"fatal: Authentication failed"**
- Check if the PAT has expired in GitHub settings
- Regenerate a new PAT and update Credential Manager
