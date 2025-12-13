# Extension Distribution & Updates Guide

## Overview

This document explains the complete workflow for publishing, updating, and distributing the MikroC PIC32 Bootloader extension.

## Table of Contents

1. [Publishing to Marketplace](#publishing-to-marketplace)
2. [Automatic Updates](#automatic-updates)
3. [Binary Distribution](#binary-distribution)
4. [Version Management](#version-management)
5. [CI/CD Pipeline](#cicd-pipeline)

---

## Publishing to Marketplace

### Initial Setup (One-Time)

#### 1. Create VS Code Publisher Account

```bash
# Visit: https://marketplace.visualstudio.com/manage
# Sign in with Microsoft/GitHub account
# Create publisher ID (e.g., "DavidCoetzee")
```

#### 2. Generate Azure DevOps PAT

```
1. Go to https://dev.azure.com/
2. User Settings → Personal Access Tokens
3. New Token:
   - Name: "VS Code Marketplace"
   - Organization: All accessible organizations  
   - Expiration: 90 days (renewable)
   - Scopes: Marketplace (Manage) ✓
4. Copy token immediately (won't be shown again)
```

#### 3. Configure GitHub Repository

```bash
# Add token to GitHub secrets
# Repository → Settings → Secrets → Actions → New secret
Name: VSCE_TOKEN
Value: <paste your PAT>
```

#### 4. Update package.json

```json
{
  "publisher": "DavidCoetzee",
  "version": "1.0.0",
  "repository": {
    "type": "git",
    "url": "https://github.com/Davec6505/mikroc-bootloader-plugin.git"
  }
}
```

### Publishing Workflow

#### Method 1: Automated (GitHub Release → Marketplace)

```bash
# 1. Update version
npm version patch  # 1.0.0 → 1.0.1
# or
npm version minor  # 1.0.0 → 1.1.0

# 2. Update CHANGELOG.md with changes

# 3. Commit and push
git add .
git commit -m "Release v1.0.1"
git push && git push --tags

# 4. Create GitHub Release
gh release create v1.0.1 \
  --title "Version 1.0.1" \
  --notes "$(cat CHANGELOG.md | head -n 20)"

# GitHub Actions will automatically:
# - Build extension
# - Publish to marketplace
# - Attach .vsix to release
```

#### Method 2: Manual Publishing

```bash
# Install vsce (first time)
npm install -g @vscode/vsce

# Login to publisher account
vsce login DavidCoetzee
# Enter PAT when prompted

# Build and publish
npm run compile
vsce publish

# Or publish with version bump
vsce publish patch  # Auto-increment patch version
```

---

## Automatic Updates

### How VS Code Updates Extensions

VS Code automatically checks for updates:
- **Check frequency:** Every few hours (configurable in settings)
- **Update method:** Downloads new .vsix from marketplace
- **User control:** Auto-update (default) or manual

### Extension Update Flow

```
1. User has v1.0.0 installed
2. You publish v1.0.1 to marketplace
3. VS Code detects update (within hours)
4. Auto-installs v1.0.1 (or prompts user)
5. User gets notification: "Extension updated to v1.0.1"
```

### Force Update Check

Users can manually check:
```
Extensions → ... → Check for Extension Updates
```

### Update Notifications

In your extension, you can detect updates and show what's new:

```typescript
// In extension.ts activate()
const currentVersion = context.extension.packageJSON.version;
const previousVersion = context.globalState.get<string>('version');

if (previousVersion !== currentVersion) {
    // Show what's new
    vscode.window.showInformationMessage(
        `MikroC PIC32 Bootloader updated to v${currentVersion}`,
        'View Changes'
    ).then(selection => {
        if (selection === 'View Changes') {
            vscode.env.openExternal(vscode.Uri.parse(
                'https://github.com/Davec6505/mikroc-bootloader-plugin/releases'
            ));
        }
    });
    
    context.globalState.update('version', currentVersion);
}
```

---

## Binary Distribution

### Current Approach: Bundled Binaries

**Included in extension:**
- `bin/win32/make.exe` + dependencies (~6 MB)
- `bin/win32/mikro_hb.exe` (~1 MB)
- **Total:** ~7 MB

**Advantages:**
- ✅ Works offline
- ✅ Instant availability  
- ✅ No download step

**Limitations:**
- ❌ Larger extension size
- ❌ Windows only (currently)
- ❌ Must update extension to update tools

### Future Approach: Download-on-Demand

**Implementation available in:** `src/toolDownloader.ts`

```typescript
// On first use, download tools
await ToolDownloader.downloadWithProgress(context);
```

**Tools hosted on GitHub Releases:**
```
https://github.com/Davec6505/mikroc-bootloader-plugin/releases/download/
  └─ tools-v1.0.0/
      ├─ manifest.json
      ├─ tools-win32.zip (7 MB)
      ├─ tools-linux.zip (5 MB)
      └─ tools-darwin.zip (6 MB)
```

**Advantages:**
- ✅ Smaller extension (~2-3 MB)
- ✅ Multi-platform support
- ✅ Update tools independently

**Limitations:**
- ❌ Requires internet on first use
- ❌ Initial setup delay

### Installing Bundled Tools to PATH

**Option 1: Automatic (Extension)**
```typescript
// Use BundledToolsManager
const toolsManager = new BundledToolsManager(context.extensionPath);
const env = toolsManager.getEnvironment(); // Adds bin/ to PATH
```

**Option 2: Manual (User)**
```powershell
# Run installation script
.\bin\win32\Install-Tools.ps1

# Or with admin for system-wide
.\bin\win32\Install-Tools.ps1 -Scope System

# Uninstall
.\bin\win32\Install-Tools.ps1 -Uninstall
```

---

## Version Management

### Semantic Versioning

Follow semver: `MAJOR.MINOR.PATCH`

```bash
# Breaking changes (rare)
npm version major  # 1.0.0 → 2.0.0

# New features (most updates)
npm version minor  # 1.0.0 → 1.1.0

# Bug fixes (frequent)
npm version patch  # 1.0.0 → 1.0.1
```

### Pre-Release Versions

For beta testing:

```bash
# Create pre-release
npm version prerelease --preid=beta  # 1.0.0 → 1.0.1-beta.0

# Publish to marketplace as pre-release
vsce publish --pre-release
```

Users opt-in to pre-releases:
```
Extensions → ... → Install Pre-Release Version
```

### CHANGELOG.md Format

```markdown
# Changelog

## [1.0.1] - 2025-12-11
### Added
- Bundled GNU Make and MikroC bootloader
- Automatic PATH configuration

### Fixed
- Timer frequency calculation bug
- UART ring buffer template errors

### Changed
- Updated main.c template to be minimal

## [1.0.0] - 2025-12-10
### Added
- Initial release
- Configuration bit editor
- XC32 project generator
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

**File:** `.github/workflows/publish.yml`

**Triggers:**
1. Manual dispatch (with version input)
2. GitHub release published

**Steps:**
1. Checkout code
2. Setup Node.js 20
3. Install dependencies (`npm ci`)
4. Compile TypeScript (`npm run compile`)
5. Package extension (`vsce package`)
6. Publish to marketplace (`vsce publish`)
7. Upload .vsix artifact
8. Attach .vsix to GitHub release

### Monitoring

**Build Status:**
```
Repository → Actions tab
View workflow runs and logs
```

**Marketplace Stats:**
```
https://marketplace.visualstudio.com/manage/publishers/DavidCoetzee
View installs, ratings, reviews
```

### Troubleshooting CI/CD

**"VSCE_TOKEN secret not found"**
```bash
# Add token to GitHub secrets:
Repository → Settings → Secrets → Actions
Name: VSCE_TOKEN
Value: <your PAT>
```

**"Failed to publish: unauthorized"**
```bash
# Token expired or invalid, regenerate:
1. Create new PAT at https://dev.azure.com/
2. Update VSCE_TOKEN secret in GitHub
```

**"Package size exceeds 100MB"**
```bash
# Check size
ls -lh *.vsix

# Reduce size:
- Remove unnecessary files from bin/
- Check .vscodeignore excludes source files
- Consider download-on-demand for large tools
```

---

## Quick Reference

### Publish New Version

```bash
# 1. Make changes, test locally
npm run compile
code --install-extension mikroc-pic32-bootloader-X.X.X.vsix

# 2. Update version
npm version patch
# Updates package.json and creates git tag

# 3. Update CHANGELOG.md

# 4. Commit and push
git add .
git commit -m "Release vX.X.X"
git push && git push --tags

# 5. Create GitHub release (triggers CI/CD)
gh release create vX.X.X --generate-notes
```

### Manual Emergency Publish

```bash
vsce login DavidCoetzee
vsce publish
```

### Unpublish Version (Careful!)

```bash
# Only if serious issue found immediately after publish
vsce unpublish DavidCoetzee.mikroc-pic32-bootloader@X.X.X
```

### Check Marketplace Listing

```bash
vsce show DavidCoetzee.mikroc-pic32-bootloader
```

---

## Next Steps

1. **Immediate:**
   - [ ] Create publisher account
   - [ ] Generate PAT
   - [ ] Add VSCE_TOKEN to GitHub secrets
   - [ ] Test publish to marketplace

2. **Short-term:**
   - [ ] Monitor initial user feedback
   - [ ] Set up download-on-demand for cross-platform
   - [ ] Create tutorial videos

3. **Long-term:**
   - [ ] Add Linux/macOS binary support
   - [ ] Implement telemetry (opt-in)
   - [ ] Build user community

## Support

- **Issues:** https://github.com/Davec6505/mikroc-bootloader-plugin/issues
- **Discussions:** https://github.com/Davec6505/mikroc-bootloader-plugin/discussions
- **Email:** (your email)
