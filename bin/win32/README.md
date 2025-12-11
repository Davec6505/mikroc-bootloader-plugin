# Bundled Tools Installation Scripts

## Overview

This directory contains bundled GNU utilities and MikroC bootloader for Windows.

**Total Size:** ~7 MB

**Contents:**
- `make.exe` - GNU Make 4.x
- `sh.exe` - Shell interpreter
- `rm.exe` - File removal utility
- `mikro_hb.exe` - MikroC HID Bootloader
- `msys-2.0.dll` - MSYS2 runtime
- `msys-intl-8.dll` - Internationalization support
- `msys-iconv-2.dll` - Character encoding conversion

## Install-Tools.ps1

PowerShell script to add bundled GNU Make and MikroC bootloader to your system PATH.

### Usage

#### User-Level Installation (Recommended)
```powershell
# From extension directory
.\bin\win32\Install-Tools.ps1

# Or specify explicitly
.\bin\win32\Install-Tools.ps1 -Scope User
```

#### System-Wide Installation (Requires Administrator)
```powershell
# Run PowerShell as Administrator, then:
.\bin\win32\Install-Tools.ps1 -Scope System
```

#### Uninstall
```powershell
# Remove from user PATH
.\bin\win32\Install-Tools.ps1 -Uninstall

# Remove from system PATH (requires Administrator)
.\bin\win32\Install-Tools.ps1 -Scope System -Uninstall
```

### What It Does

1. **Validates** - Checks that bundled tools exist
2. **Adds to PATH** - Prepends `bin\win32` to your PATH environment variable
3. **Persists** - Changes persist across terminal sessions
4. **Verifies** - Shows updated PATH entries

### After Installation

Restart your terminal, then verify:
```powershell
make --version
mikro_hb --help
```

### Notes

- **User scope** (default): Only affects current user, no admin required
- **System scope**: Affects all users, requires Administrator privileges
- Tools are prepended to PATH, so they take precedence over system installations
- No files are copied - PATH points to the extension's bin directory

### Uninstallation

To remove from PATH:
```powershell
.\bin\win32\Install-Tools.ps1 -Uninstall
```

Or manually edit environment variables:
1. Windows Key + R → `sysdm.cpl` → Advanced → Environment Variables
2. Remove the extension's `bin\win32` directory from Path

### Troubleshooting

**"Execution policy" error:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**"Access denied" (System scope):**
- Run PowerShell as Administrator
- Or use `-Scope User` instead

**Tools not found after installation:**
- Restart your terminal
- Check PATH: `$env:PATH -split ';' | Select-String "mikroc"`
