# Install Bundled Tools to PATH
# This script adds the bundled GNU Make and MikroC bootloader to your system PATH
# Run this if you want to use the bundled tools outside of VS Code

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("User", "System")]
    [string]$Scope = "User",
    
    [Parameter(Mandatory=$false)]
    [switch]$Uninstall
)

# Determine the bin directory (relative to script location)
$BinDir = Join-Path $PSScriptRoot "bin\win32"

if (-not (Test-Path $BinDir)) {
    Write-Error "Bundled tools directory not found: $BinDir"
    Write-Error "Make sure this script is in the extension root directory."
    exit 1
}

# Get the full path
$BinDir = Resolve-Path $BinDir

Write-Host "Bundled Tools Directory: $BinDir" -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator for System scope
if ($Scope -eq "System") {
    $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    
    if (-not $isAdmin) {
        Write-Error "System-wide installation requires Administrator privileges."
        Write-Host "Please run this script as Administrator, or use -Scope User for user-only installation." -ForegroundColor Yellow
        exit 1
    }
}

# Get the appropriate PATH variable
$PathTarget = if ($Scope -eq "System") { 
    [System.EnvironmentVariableTarget]::Machine 
} else { 
    [System.EnvironmentVariableTarget]::User 
}

$CurrentPath = [Environment]::GetEnvironmentVariable("Path", $PathTarget)

if ($Uninstall) {
    # Remove from PATH
    Write-Host "Uninstalling bundled tools from $Scope PATH..." -ForegroundColor Yellow
    
    if ($CurrentPath -like "*$BinDir*") {
        # Remove the directory from PATH
        $PathArray = $CurrentPath -split ';' | Where-Object { $_ -ne $BinDir -and $_ -ne "$BinDir\" }
        $NewPath = $PathArray -join ';'
        
        [Environment]::SetEnvironmentVariable("Path", $NewPath, $PathTarget)
        
        Write-Host "✓ Removed from $Scope PATH: $BinDir" -ForegroundColor Green
        Write-Host ""
        Write-Host "Restart your terminal for changes to take effect." -ForegroundColor Cyan
    } else {
        Write-Host "Bundled tools are not in $Scope PATH." -ForegroundColor Yellow
    }
} else {
    # Install to PATH
    Write-Host "Installing bundled tools to $Scope PATH..." -ForegroundColor Yellow
    
    # Check if already in PATH
    if ($CurrentPath -like "*$BinDir*") {
        Write-Host "Bundled tools are already in $Scope PATH." -ForegroundColor Green
        exit 0
    }
    
    # Verify tools exist
    $MakeExe = Join-Path $BinDir "make.exe"
    $BootloaderExe = Join-Path $BinDir "mikro_hb.exe"
    
    if (-not (Test-Path $MakeExe)) {
        Write-Error "make.exe not found in $BinDir"
        exit 1
    }
    
    Write-Host "Found tools:" -ForegroundColor Cyan
    Write-Host "  - make.exe" -ForegroundColor Green
    if (Test-Path $BootloaderExe) {
        Write-Host "  - mikro_hb.exe" -ForegroundColor Green
    }
    Write-Host ""
    
    # Add to PATH (prepend so bundled tools take precedence)
    $NewPath = "$BinDir;$CurrentPath"
    [Environment]::SetEnvironmentVariable("Path", $NewPath, $PathTarget)
    
    Write-Host "✓ Added to $Scope PATH: $BinDir" -ForegroundColor Green
    Write-Host ""
    Write-Host "Restart your terminal for changes to take effect." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "You can now use 'make' and 'mikro_hb' from any directory." -ForegroundColor Green
}

Write-Host ""
Write-Host "Current PATH entries:" -ForegroundColor Cyan
$UpdatedPath = [Environment]::GetEnvironmentVariable("Path", $PathTarget)
$UpdatedPath -split ';' | Where-Object { $_ -ne "" } | ForEach-Object {
    if ($_ -eq $BinDir -or $_ -eq "$BinDir\") {
        Write-Host "  → $_" -ForegroundColor Green
    } else {
        Write-Host "    $_" -ForegroundColor Gray
    }
}
