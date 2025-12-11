# Bundling Guide - Self-Contained Distribution

## Overview
This guide explains how to create a self-contained VS Code extension that includes GNU Make and MikroC bootloader tools.

## Directory Structure
```
mikroc-bootloader-plugin/
├── bin/
│   ├── win32/          # Windows binaries
│   │   ├── make.exe
│   │   ├── sh.exe
│   │   ├── rm.exe
│   │   ├── mikro_hb.exe
│   │   └── ... (other GNU utilities)
│   ├── linux/          # Linux binaries (future)
│   └── darwin/         # macOS binaries (future)
├── out/
├── src/
└── package.json
```

## Step 1: Obtain GNU Make for Windows

### Option A: Extract from Git for Windows (Minimal)
Download Git for Windows portable: https://git-scm.com/download/win

Extract these files from `\usr\bin\`:
- `make.exe`
- `sh.exe` 
- `msys-2.0.dll` (required by make.exe)
- `msys-intl-8.dll`
- `msys-iconv-2.dll`

### Option B: Use Chocolatey to Install Make
```powershell
choco install make
# Then copy from C:\ProgramData\chocolatey\lib\make\tools\install\bin\
```

### Option C: Download ezwinports Make
From: https://sourceforge.net/projects/ezwinports/files/
- Minimal, standalone make.exe

## Step 2: Obtain MikroC Bootloader

Copy from your existing installation:
```powershell
Copy-Item "C:\Users\davec\GIT\MikroC_bootloader\bins\mikro_hb.exe" `
          "bin\win32\mikro_hb.exe"
```

## Step 2.5: Create Installation Script

✅ **COMPLETED** - `bin\win32\Install-Tools.ps1` script created.

This script allows users to optionally add bundled tools to their PATH:
```powershell
# User installation (no admin required)
.\bin\win32\Install-Tools.ps1

# System-wide installation (requires admin)
.\bin\win32\Install-Tools.ps1 -Scope System

# Uninstall
.\bin\win32\Install-Tools.ps1 -Uninstall
```

## Step 3: Update Extension to Use Bundled Tools

The extension should:
1. Detect bundled tools in `bin/{platform}/`
2. Fall back to system PATH if not found
3. Provide clear error messages

## Step 4: Update .vscodeignore

Add to `.vscodeignore`:
```
src/**
.vscode/**
.vscode-test.mjs
tsconfig.json
**/*.ts
**/*.map
.gitignore
```

Remove from `.vscodeignore` (ensure these are included):
```
# DON'T ignore bin/ - we want it packaged
# !bin/**
```

## Step 5: Update package.json

Add bundled tools info:
```json
{
  "contributes": {
    "configuration": {
      "properties": {
        "mikroc-pic32-bootloader.useBundledTools": {
          "type": "boolean",
          "default": true,
          "description": "Use bundled GNU Make and utilities (Windows only)"
        }
      }
    }
  }
}
```

## Step 6: Package Extension

```bash
# Install vsce if needed
npm install -g @vscode/vsce

# Compile TypeScript and copy templates
npm run compile

# Package extension with all assets (includes bin/ directory)
vsce package

# Output: mikroc-pic32-bootloader-X.X.X.vsix
```

Check the packaged size:
```powershell
Get-Item mikroc-pic32-bootloader-*.vsix | Select-Object Name, @{N='Size(MB)';E={[math]::Round($_.Length/1MB,2)}}
```

## Step 7: Distribution

### VS Code Marketplace
- Marketplace has size limits (~100MB)
- Check your .vsix size: GNU Make tools are ~5-10MB
- MikroC bootloader is small (~1-2MB)
- Should fit comfortably

### GitHub Releases
- No size limit
- Attach .vsix to release
- Include README with installation instructions

### Direct Installation
Users can install with:
```bash
code --install-extension mikroc-pic32-bootloader-X.X.X.vsix
```

## Platform Support

### Windows (Priority 1)
✅ Bundle make.exe, mikro_hb.exe, required DLLs

### Linux (Future)
- GNU Make usually pre-installed
- Just need mikro_hb (if Linux version exists)

### macOS (Future)  
- Make pre-installed via Xcode Command Line Tools
- Need mikro_hb for macOS (if exists)

## License Considerations

### GNU Make
- GPLv3 licensed
- You MUST provide source or link to source
- Add to LICENSE or NOTICE file

### MikroC Bootloader
- Check license from https://github.com/Davec6505/MikroC_bootloader
- Ensure redistribution is allowed

## Size Optimization

Current sizes (approximate):
- Extension code: ~1-2MB
- GNU Make + deps: ~5-10MB  
- MikroC bootloader: ~1-2MB
- Templates: <1MB
- **Total: ~10-15MB** (well under VS Code Marketplace 100MB limit)

## Testing Bundled Version

1. Package extension: `vsce package`
2. Uninstall development version
3. Install packaged .vsix
4. Test on clean machine without MSYS2/Make installed
5. Verify make.exe from bundled bin/ is used

## Next Steps

1. Copy GNU utilities to `bin/win32/`
2. Copy mikro_hb.exe to `bin/win32/`
3. Update extension.ts to detect/use bundled tools
4. Test packaging
5. Create GitHub release
