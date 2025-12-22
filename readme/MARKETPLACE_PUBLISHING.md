# VS Code Marketplace Publishing Guide

## Prerequisites

Install `@vscode/vsce` (Visual Studio Code Extension Manager):
```powershell
npm install -g @vscode/vsce
```

You need a Personal Access Token (PAT) from Azure DevOps with **Marketplace (Manage)** permissions.

## Common Publishing Commands

### 1. Package Extension Locally (VSIX file)
Create a `.vsix` file without publishing:
```powershell
npx vsce package
```

This creates `pic32-ide-vscode-2.0.0.vsix` in the current directory.

### 2. Publish to Marketplace
Publish the current version to the VS Code Marketplace:
```powershell
npx vsce publish
```

You'll be prompted for your PAT if not logged in.

### 3. Publish with Version Bump
Automatically increment version and publish:
```powershell
# Patch: 2.0.0 → 2.0.1
npx vsce publish patch

# Minor: 2.0.0 → 2.1.0
npx vsce publish minor

# Major: 2.0.0 → 3.0.0
npx vsce publish major

# Specific version
npx vsce publish 2.1.0
```

### 4. Login to Marketplace
Store your PAT for future commands:
```powershell
npx vsce login DavidCoetzee
```

You'll be prompted to enter your Personal Access Token.

### 5. Unpublish Extension
**WARNING: This removes ALL versions permanently!**
```powershell
npx vsce unpublish DavidCoetzee.pic32-ide-vscode
```

You'll be asked to confirm by typing the full extension ID.

### 6. Unpublish Specific Version
Remove only one version (not the entire extension):
```powershell
npx vsce unpublish DavidCoetzee.pic32-ide-vscode@1.2.7
```

## Manual Version Update Workflow

If you want to control the version manually:

1. **Edit `package.json`**:
   ```json
   "version": "2.1.0"
   ```

2. **Commit the version change**:
   ```powershell
   git add package.json
   git commit -m "chore: Bump version to 2.1.0"
   ```

3. **Compile and test**:
   ```powershell
   npm run compile
   # Test the extension in VS Code (F5)
   ```

4. **Package locally** (optional, for testing):
   ```powershell
   npx vsce package
   # Install locally: code --install-extension pic32-ide-vscode-2.1.0.vsix
   ```

5. **Publish to marketplace**:
   ```powershell
   npx vsce publish
   ```

6. **Create git tag**:
   ```powershell
   git tag v2.1.0
   git push origin v2.1.0
   git push origin master
   ```

## Extension Management URLs

### Marketplace Public Page
View the extension as users see it:
```
https://marketplace.visualstudio.com/items?itemName=DavidCoetzee.pic32-ide-vscode
```

### Publisher Management Hub
Manage your extension (requires login):
```
https://marketplace.visualstudio.com/manage/publishers/DavidCoetzee
```

Direct extension hub:
```
https://marketplace.visualstudio.com/manage/publishers/DavidCoetzee/extensions/pic32-ide-vscode/hub
```

## Common Tasks

### Update README Only
If you only changed the README:
```powershell
# Bump patch version (2.0.0 → 2.0.1)
npx vsce publish patch
```

The marketplace will automatically use the new README from your `package.json` → `repository` URL.

### Update Display Name or Description
1. Edit `package.json`:
   ```json
   "displayName": "New Display Name",
   "description": "New description"
   ```

2. Publish:
   ```powershell
   npx vsce publish patch
   ```

### Fix Broken Extension
If you published a broken version:
```powershell
# Fix the code
npm run compile

# Publish hotfix
npx vsce publish patch
```

Users will automatically get the update when VS Code checks for extension updates.

## Troubleshooting

### "Extension not found" Error
Make sure you're using the correct extension ID from `package.json`:
```json
"publisher": "DavidCoetzee",
"name": "pic32-ide-vscode"
```

Full ID: `DavidCoetzee.pic32-ide-vscode`

### Marketplace Page Not Updating
After publishing:
- Wait 5-10 minutes for CDN to update
- Hard refresh browser (Ctrl+F5)
- Clear browser cache

### Cannot Publish - Already Exists
If you changed the extension name but kept the same ID:
```powershell
# Unpublish old extension
npx vsce unpublish DavidCoetzee.old-extension-name

# Publish new one
npx vsce publish
```

### Testing Before Publishing
Always test locally first:
```powershell
# Package locally
npx vsce package

# Install in VS Code
code --install-extension pic32-ide-vscode-2.0.0.vsix

# Test the extension
# Press F5 in VS Code to debug
```

## Pre-Publishing Checklist

Before running `npx vsce publish`:

- [ ] Version number updated in `package.json`
- [ ] README.md is up to date
- [ ] CHANGELOG.md has release notes (if you maintain one)
- [ ] Code compiles without errors (`npm run compile`)
- [ ] Extension tested in VS Code (F5 → Extension Development Host)
- [ ] All changes committed to git
- [ ] No sensitive data in repository
- [ ] Icon exists and is correct (`images/icon.png`)
- [ ] LICENSE file is correct

## Getting a Personal Access Token (PAT)

1. Go to: https://dev.azure.com/
2. Sign in with your Microsoft account
3. Click user settings (top right) → Personal Access Tokens
4. Click "New Token"
5. Settings:
   - Name: "VS Code Marketplace"
   - Organization: All accessible organizations
   - Expiration: 90 days (or custom)
   - Scopes: **Marketplace (Manage)** ✅
6. Click "Create"
7. **COPY THE TOKEN** (you can't see it again!)
8. Run: `npx vsce login DavidCoetzee` and paste the token

## History of This Extension

### v1.2.7 → v2.0.0 Migration
We had two extensions on the marketplace:
- **Old**: `DavidCoetzee.mikroc-bootloader-plugin` (v1.2.7)
- **New**: `DavidCoetzee.pic32-ide-vscode` (v2.0.0)

We unpublished the old one:
```powershell
npx vsce unpublish DavidCoetzee.mikroc-bootloader-plugin
```

This left only `pic32-ide-vscode` v2.0.0 on the marketplace.

## References

- **vsce Documentation**: https://github.com/microsoft/vscode-vsce
- **Publishing Extensions Guide**: https://code.visualstudio.com/api/working-with-extensions/publishing-extension
- **Extension Manifest**: https://code.visualstudio.com/api/references/extension-manifest
