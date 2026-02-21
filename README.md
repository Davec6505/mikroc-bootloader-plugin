# XC PIC32MX/MZ Project Importer & Creator for VS Code

[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/DavidCoetzee.xc-project-importer)](https://marketplace.visualstudio.com/items?itemName=DavidCoetzee.xc-project-importer)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/DavidCoetzee.xc-project-importer)](https://marketplace.visualstudio.com/items?itemName=DavidCoetzee.xc-project-importer)

**Create new PIC32 projects OR import existing MPLABX projects** - Full XC32 compiler support for PIC32MX/MZ with visual configuration editor, AI-assisted development (GitHub Copilot), and native build/flash from VS Code.

## Why This Extension?

This extension was created to solve a fundamental problem: **modern AI coding assistants like GitHub Copilot work best in VS Code, but Microchip PIC32 embedded development traditionally happens in MPLABX IDE.**

By **creating new PIC32 projects** or **importing existing MPLABX projects** into VS Code, you can:
- ✨ **Get AI assistance** - Let Copilot help write peripheral drivers, debug code, and understand complex configurations
- 🚀 **Use modern tooling** - Leverage VS Code's superior editing, search, and extension ecosystem
- 🔄 **Keep MCC workflow** - Continue using MPLABX/MCC for peripheral configuration, then import back to VS Code
- 🛠️ **Build natively** - Compile and flash directly from VS Code with your existing XC32 toolchain

**Perfect for developers who want to use AI assistance while working with MCC generated code or building new projects for any Microchip device.**

## Quick Start

1. **Install XC32 Compiler** ([Download](https://www.microchip.com/en-us/tools-resources/develop/mplab-xc-compilers))
2. **Open Command Palette** (`Ctrl+Shift+P`)
3. **Run:** `XC Project Importer: Import MPLABX Project`
4. **Choose:**
   - **Create New XC32 Project** → Select device → Configure clocks → Start coding
   - **Import Existing MPLABX Project** → Select .X folder → Start coding
5. **Build:** Press `Ctrl+Shift+B` or click **Build** button in status bar
6. **Flash/Program:** Click **⚡ Flash** (MikroE bootloader) or **🔌 Program** (ICSP via PICkit/ICD/SNAP)

**That's it!** Your project is ready for AI-assisted development with GitHub Copilot.
## Features

### 📥 MPLABX Project Import & Creation

**Import Existing Projects:**
- **One-Click Import**: Select your `.X` folder and automatically import entire MPLABX project
- **XC32 Compiler Support**: Full support for XC32 (32-bit MIPS32 PIC32MX/MZ devices)
- **MCC Compatible**: Preserves all MCC-generated peripheral libraries and structure (MCC Classic & Harmony 3)
- **Flag Preservation**: Extracts and preserves CFLAGS and LDFLAGS from original Makefiles
- **Startup Detection**: Automatically detects CRT0 vs custom startup.S configuration (XC32)
- **Metadata Tracking**: Saves project metadata for future re-sync with MPLABX

**Create New XC32 Projects:**
- **Template Generation**: Create complete XC32 project from scratch with proper structure
- **Device Selection**: Choose from 150+ PIC32MX/MZ devices with device-specific configuration
- **Interactive Configuration Editor**: Visual UI for full project configuration:
  - **Oscillator & PLL**: Real-time clock calculation, device-specific PLL constraints
  - **Peripheral Bus Clocks** (PIC32MZ EF): Independent dividers for PB1–PB5, PB7, PB8 — live MHz display per bus with SYSCLK reference; PB1/PB8 correctly allow 200 MHz (USB/CAN timing)
  - **Watchdog, Debug, Code Protection**: All `#pragma config` settings
  - **Build Settings**: Heap Size, Stack Size, Optimization Level (-O0 to -Os), Build Type
  - Pre-validated #pragma config templates for each device family
- **Auto-Detection**: Automatically finds XC32 compiler and DFP (Device Family Pack)
- **Ready to Build**: Generated with working Makefile, main.c template, and VS Code tasks
- **Bootloader Option**: Optional MikroC bootloader startup.S generation

**Both Options Include:**
- **Full Toolchain**: Uses your existing XC compiler and DFP installations
- **Build System**: Generates GNU Makefiles compatible with Windows, WSL, and Git Bash

### 📦 MikroC Project Import
- **In-Place Import**: Import MikroC PRO projects directly (no file copying)
- **PIC32 Support**: Works with MikroC PRO for PIC32 compiler
- **Auto-Detection**: Finds any `.mcp32` file
- **Makefile Generation**: Creates GNU Makefile with all project settings preserved
- **Compiler Detection**: Automatically finds MikroC installation or allows custom path
- **Auto-Open**: Project opens automatically after successful import
- **Build Integration**: VS Code tasks for Build, Clean, Flash (Ctrl+Shift+B)

### 🛠️ Build & Flash Buttons

Four status bar buttons give you one-click access to every stage:

| Button | Icon | Action |
|--------|------|--------|
| **Build** | `$(tools)` | Runs `make` via VS Code default build task |
| **Rebuild** | `$(refresh)` | Runs `make clean && make` in integrated terminal |
| **Flash** | `$(zap)` | Sends `.hex` to PIC32 via **MikroE USB HID bootloader** (`mikro_hb.exe`) |
| **Program** | `$(chip)` | Programs device via **ICSP** using MPLAB IPE (`ipecmd.exe`) |

**Program** button details:
- Auto-detects `ipecmd.exe` from any installed MPLAB X IDE version
- Programmer quick-pick: **PICkit 4, PICkit 5, ICD 4, ICD 5, SNAP**
- Reads device name from project metadata (`.vscode/pic32-project.json`)
- Runs: `ipecmd.exe -TP<TOOL> -P<DEVICE> -F<hex> -E -M` (erase + program)
- Falls back to manual browse if MPLAB X IDE is not installed (MPLAB X IDE is free)

**Flash** button details:
- Uses bundled `mikro_hb.exe` (MikroE USB HID bootloader host)
- Auto-updates daily from [MikroC_bootloader](https://github.com/Davec6505/MikroC_bootloader) GitHub releases
- Device must be running the MikroE PIC32 USB HID bootloader firmware

### 🤖 AI-First Development
This extension is designed for **AI-assisted embedded development**:
- **GitHub Copilot Integration**: Get intelligent code suggestions for any Microchip peripheral
- **Context-Aware Help**: Copilot understands MCC-generated code structure
- **Faster Development**: Let AI help with boilerplate, drivers, and configuration
- **Learning Tool**: Use Copilot to understand complex peripheral interactions
- **PIC32M Family Only**: Full support for all PIC32MX/MZ devices (XC32)

## How It Works

### Option 1: Import Existing MPLABX Project

1. **Design in MPLABX/MCC**
   - Use MCC to configure clock, GPIO, timers, UART, etc.
   - Generate code with MCC Harmony 3
   - Save and close MPLABX

2. **Import to VS Code**
   - Run `XC Project Importer: Import MPLABX Project`
   - Select your `.X` project folder
   - Extension copies files, organizes structure, generates Makefiles

3. **Develop with AI Assistance**
   - Open files in VS Code
   - Use GitHub Copilot to write application code
   - Get AI help with peripheral APIs, interrupts, protocols
   - Build and debug directly in VS Code

### Option 2: Create New XC32 Project

1. **Create from Template**
   - Run `XC Project Importer: Import MPLABX Project` → Choose "Create New XC32 Project"
   - Select target PIC32MX/MZ device
   - **Configure in visual editor**: Set oscillator, PLL, peripheral bus clocks, watchdog, debug settings, AND build settings
     - Open on existing projects anytime via Command Palette: `XC Project Importer: Edit Project Configuration`
     - See real-time clock calculation as you adjust values; SYSCLK shown at top, each peripheral bus shows its resulting MHz
     - PB1 (System Bus) and PB8 (USB/CAN) correctly allow 200 MHz; PB2–PB5/PB7 warn if over 100 MHz
     - Set Heap Size, Stack Size, Optimization Level — written directly into your Makefile
     - Device-specific constraints prevent invalid configurations
   - Extension auto-detects XC32 compiler and DFP

2. **Develop with AI Assistance**
   - Project opens with working main.c template and proper device configuration
   - All #pragma config statements generated from your settings
   - Use GitHub Copilot to write application code
   - Build with Ctrl+Shift+B, click the Build/Rebuild buttons in the status bar, or type `make` in terminal

3. **Optional: Add MCC Peripherals**
   - Open project in MPLABX to add MCC-generated code
   - Re-import to VS Code to preserve structure
   - Continue development with AI assistance

4. **Build and Flash**
   - Run `make` to build (or use VS Code tasks)
   - Flash with bootloader or use MPLABX for programming

5. **Re-sync When Needed**
   - Update peripheral config in MPLABX/MCC
   - Re-import to VS Code (preserves your application code)

## What Gets Imported

✅ **MCC Generated Code** - All peripheral libraries (plib_*.c/h)  
✅ **User Application Code** - Files from `src/` and `.X` folder  
✅ **Startup Code** - CRT0 or custom startup.S (auto-detected)  
✅ **Linker Script** - Device-specific .ld file  
✅ **Build Flags** - Compiler and linker flags from MPLABX  
✅ **Header Organization** - Clean incs/ folder structure  
✅ **Makefiles** - Cross-platform GNU Make build system

## Requirements

### What You Need

#### 1. Software (Required)
- **VS Code** 1.106.1 or later
- **XC32 Compiler** OR **MikroC PRO for PIC32 Compiler**:
  - **XC32** (32-bit PIC32MX/MZ) - All variants supported
  - **MikroC PRO for PIC32** (PIC32 with MikroElektronika libraries)
  - Download XC32: [Microchip](https://www.microchip.com/en-us/tools-resources/develop/mplab-xc-compilers)
  - Download MikroC: [MikroElektronika](https://www.mikroe.com/mikroc)
- **DFP (Device Family Pack)** - Installed with MPLABX or standalone (XC compilers only)
- **MPLABX IDE** (optional) - For using MCC to configure peripherals (XC workflow)
- **MikroC IDE** (optional) - For configuring project settings (MikroC workflow)
- **GitHub Copilot** (recommended) - For AI-assisted development

#### 2. Hardware (For Flashing)
- **Microchip Device** - Any device supported by your XC compiler
- **USB Connection** (optional) - For PIC32 bootloader flashing
- **MikroC Bootloader Firmware** (optional) - For PIC32 USB HID flashing feature
- **Programmer** (recommended) - MPLAB ICD, PICkit, or compatible for production

**Note**: No external build tools required! Extension includes GNU Make and all necessary utilities.

### What's Bundled (Zero External Dependencies!)
✅ **GNU Make** (`make.exe`) - Complete build system with all required DLLs  
✅ **Shell Utilities** (`sh.exe`, `rm.exe`) - Unix-like commands for Windows  
✅ **MikroC HID Bootloader** (`mikro_hb.exe`) - Built-in, auto-updates from [GitHub](https://github.com/Davec6505/MikroC_bootloader)  
✅ **Startup Code Template** - Complete 604-line CRT0 replacement for `-nostartfiles`  
✅ **VS Code Tasks** - Ready-to-use Build/Clean/Flash tasks (Ctrl+Shift+B)

**Just install the extension and import your project - everything else is included!**

**Auto-Update System**: The bootloader checks for updates once per day from the MikroC_bootloader repository. Updates are downloaded to VS Code's global storage and persist across extension updates. You can manually trigger an update check via the Command Palette.

## Installation

### From VS Code Marketplace (Recommended)
1. Open VS Code
2. Press `Ctrl+Shift+X` to open Extensions
3. Search for "**XC Project Importer**"
4. Click **Install**

### From VSIX File
1. Download the latest `.vsix` from [Releases](https://github.com/Davec6505/mikroc-bootloader-plugin/releases)
2. Open VS Code
3. Press `Ctrl+Shift+P`
4. Type "Extensions: Install from VSIX"
5. Select the downloaded file

### First-Time Setup: Adding Build Tools to PATH (Optional)

The extension includes bundled GNU Make and utilities - **no external installation required!** VS Code tasks (Ctrl+Shift+B) work immediately.

However, if you want to use `make` directly from any terminal (Command Prompt, PowerShell, etc.), you have three options:

#### Option 1: Automatic Setup (Recommended)
1. When extension activates, you'll see a prompt: _"To use 'make' from any terminal, the bundled tools need to be added to your PATH"_
2. Click **"Add to PATH"**
3. **Restart VS Code completely** (close all windows)
4. Open any terminal - `make` command now works everywhere!

#### Option 2: Manual Command
1. Press `Ctrl+Shift+P`
2. Type: **"XC Project Importer: Add Bundled Tools to PATH"**
3. Click **"Add to PATH"**
4. **Restart VS Code completely**

#### Option 3: Manual PATH Configuration
If automatic setup fails, add manually:

**Windows:**
1. Press `Win+R`, type: `sysdm.cpl`
2. Click **Advanced** → **Environment Variables**
3. Under "User variables", select **Path** → **Edit**
4. Click **New**, add: `C:\Users\<YourUsername>\.vscode\extensions\davidcoetzee.xc-project-importer-X.X.X\bin\win32`
5. Click **OK**, restart VS Code

**Alternative: Copy Path**
- Run the command from Option 2
- If it fails, click **"Copy Path"**
- Paste into PATH manually using steps above

**Note:** 
- ✅ VS Code tasks work immediately - no PATH setup required
- ✅ PATH setup only needed for using `make` in external terminals
- ✅ No admin rights required - adds to User PATH only
- ✅ Persists across VS Code updates

## Quick Start

### Import MPLABX Project

1. **Open VS Code** in an empty folder
2. Press `Ctrl+Shift+P` and type "**XC Project Importer: Import MPLABX Project**"
3. Select your MPLABX `.X` project folder
4. Wait for import to complete (files copied, Makefiles and tasks.json generated)
5. **Build with `Ctrl+Shift+B`** - All tools bundled, no setup needed!
6. **Start coding with AI assistance!**

_Supports XC32 projects for all PIC32MX and PIC32MZ devices._

### Import MikroC Project

1. **Open VS Code**
2. Press `Ctrl+Shift+P` and type "**XC Project Importer: Import MikroC Project**"
3. Select your MikroC project folder (contains .mcp32 file)
4. Extension auto-detects compiler and generates Makefile
5. **Project opens automatically - ready to build!**

**Key Features:**
- ✅ **In-place import** - No file copying, Makefile created in your project folder
- ✅ **PIC32 only** - MikroC PRO for PIC32 (.mcp32 files)
- ✅ **Flexible compiler paths** - Auto-detect or specify custom location
- ✅ **Build with Ctrl+Shift+B** - Integrated VS Code tasks

**Workflow:**
1. Import once when you need to build outside MikroC IDE
2. Edit code in VS Code with AI assistance
3. Build with `make`, Ctrl+Shift+B, or click Build/Rebuild buttons in status bar
4. Re-open `.mcp32` file in MikroC IDE when you need to change project settings
5. Re-import to update Makefile

### Example: Using Copilot

```c
// In main.c, type a comment and let Copilot suggest code:
// Initialize UART2 for 115200 baud and print "Hello World"

// Copilot will suggest using the imported UART2 APIs:
UART2_Initialize();
const char* msg = "Hello World\r\n";
UART2_Write((uint8_t*)msg, strlen(msg));
```

### Building

**VS Code Tasks (Recommended):**
- Click **Build** or **Rebuild** buttons in the status bar (bottom left)
- Press **`Ctrl+Shift+B`** to build (uses bundled make.exe)
- Or use Command Palette: "Tasks: Run Build Task"
- All build tools included - no external dependencies!

**Command Line:**
```bash
make                    # Build project (if make is in PATH)
make clean             # Clean build artifacts
```

### Bootloader Flashing

**Method 1: Status Bar Button (Quickest)**
1. Connect your PIC32 device in bootloader mode
2. Click the "⚡ Flash PIC32" button in the status bar
3. Select .hex file if multiple exist
4. Monitor terminal output for flash progress

**Method 2: Command Palette**
1. Press `Ctrl+Shift+P`
2. Type "**MikroC PIC32: Flash Device**"
3. Select the .hex file to flash
4. Monitor progress in integrated terminal

## Project Structure After Import

```
your-project/
├── Makefile                    # Root makefile (runs srcs/Makefile)
├── .vscode/
│   ├── tasks.json             # Build/clean/flash tasks
│   └── pic32-project.json     # Import metadata
├── bins/                      # Compiled output (.elf, .hex)
├── objs/                      # Object files (mirrors srcs/ structure)
├── incs/                      # All header files organized
│   ├── global.h
│   └── config/default/
│       ├── definitions.h
│       ├── device.h
│       ├── interrupts.h
│       └── peripheral/
│           ├── clk/
│           ├── gpio/
│           ├── tmr/
│           ├── tmr1/
│           └── uart/
├── srcs/                      # All source files
│   ├── Makefile               # Build system
│   ├── main.c                 # Your application code
│   ├── startup/
│   │   └── startup.S          # Startup code (if using -nostartfiles)
│   └── config/default/
│       ├── initialization.c
│       ├── interrupts.c
│       ├── exceptions.c
│       └── peripheral/
│           ├── clk/plib_clk.c
│           ├── gpio/plib_gpio.c
│           ├── tmr/plib_tmr2.c
│           ├── tmr1/plib_tmr1.c
│           └── uart/plib_uart2.c
├── other/                     # Linker scripts, maps
│   └── p32MZ2048EFH100.ld
└── README.md                  # Generated project info
```

## Why VS Code + AI for Embedded?

Traditional embedded IDEs weren't designed for AI assistance. Here's what you gain:

### 🤖 Better AI Assistance
- **Context Understanding**: Copilot learns from your entire codebase
- **Peripheral Knowledge**: Trained on millions of embedded code examples
- **Pattern Recognition**: Suggests based on common Microchip/MCC patterns

### 📝 Superior Editing
- **Multi-cursor editing** - Change all peripheral instances at once
- **Powerful search/replace** - Find uses across entire codebase instantly  
- **Git integration** - Track changes, branch, merge easily
- **IntelliSense** - Better autocomplete than MPLABX

### 🔌 Extension Ecosystem  
- **GitHub Copilot** - AI pair programmer
- **GitLens** - Advanced git visualization
- **C/C++ Tools** - Microsoft's industry-standard C/C++ support
- **Live Share** - Collaborate in real-time

## AI-Assisted Development Tips

### Getting the Most from Copilot

**1. Write Descriptive Comments**
```c
// Initialize Timer2 as a millisecond timer at 100Hz with interrupt callback
// that increments a millisecond counter
```
Copilot will suggest complete initialization code.

**2. Use Function Signatures**
```c
void configure_motor_pwm(uint32_t frequency_hz, uint8_t duty_percent) {
    // Copilot suggests: Configure OCMP module for PWM...
}
```

**3. Ask for Explanations**
```c
// What does this MCC-generated clock configuration do?
// Copilot can explain PLL settings, dividers, frequencies
```

**4. Refactor Legacy Code**
```c
// Refactor this polling UART code to use interrupts with ring buffer
// Copilot suggests using UART2_ReadCallbackRegister()...
```

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| **"Cannot find XC compiler"** | Set compiler path in project metadata or ensure XC32 is in system PATH |
| **"Device Family Pack not found"** | Install DFP from MPLABX or set DFP path in metadata |
| **Build errors after import** | Check that original MPLABX project compiles first |
| **Missing startup.S** | Extension auto-generates for XC32 `-nostartfiles` projects |
| **"Bootloader not found"** | PIC32 device not in bootloader mode or USB not connected |

### Debug Steps

1. **Check Import Logs**: View Output panel (View > Output > XC Project Importer)
2. **Verify Original Project**: Build in MPLABX first to confirm it works
3. **Check Paths**: Open `.vscode/pic32-project.json` to verify compiler/DFP paths
4. **Test Makefile**: Run `make DRY_RUN=1` to see commands without executing
5. **Check Console Logs**: Look for `[CFLAGS Parser]` and `[LDFLAGS Parser]` debug output

## Comparison: MPLABX vs VS Code

| Feature | MPLABX IDE | VS Code + XC Importer |
|---------|-----------|-------------------|
| **MCC Configuration** | ✅ Native | ⚠️ Use MPLABX, then import |
| **Code Editing** | ⚠️ Basic | ✅ Modern, fast |
| **AI Assistance** | ❌ None | ✅ GitHub Copilot |
| **Git Integration** | ⚠️ Limited | ✅ Excellent |
| **Extensions** | ❌ Limited | ✅ Thousands available |
| **Build System** | ✅ Integrated | ✅ Makefile-based |
| **Debugging** | ✅ Full MPLAB debugger | ⚠️ Use MPLABX for step-debug (DAP research in progress) |
| **Programming** | ✅ All programmers | ✅ PIC32 bootloader  +  ICSP via PICkit/ICD/SNAP (`ipecmd`) |

**Recommendation**: Use MPLABX for initial setup and debugging, VS Code for development.

## Troubleshooting

### "make: command not found"

**Problem**: Terminal can't find `make` command.

**Solutions:**

1. **Use VS Code Tasks (Immediate Solution)**
   - Press `Ctrl+Shift+B` to build
   - Works without PATH setup!

2. **Add Tools to PATH (For Terminal Usage)**
   - Press `Ctrl+Shift+P`
   - Type: "XC Project Importer: Add Bundled Tools to PATH"
   - Click "Add to PATH"
   - **Restart VS Code completely**
   - Try `make` again in new terminal

3. **Verify PATH Addition**
   ```powershell
   # PowerShell - Check if tools are in PATH
   $env:PATH -split ';' | Select-String "xc-project-importer"
   ```

4. **Manual PATH Check**
   - Press `Win+R`, type: `sysdm.cpl`
   - Advanced → Environment Variables
   - Look for extension path in User PATH
   - Should contain: `...\extensions\davidcoetzee.xc-project-importer-X.X.X\bin\win32`

### Build Errors After Import

**DFP Not Found** (XC32 v4.0+)
```
error: cannot find Device Family Pack (DFP)
```
**Solution:**
- Install DFP from: https://www.microchip.com/packs
- Or browse to existing DFP location when prompted
- Update `DFP_PATH` in Makefile if needed

**Compiler Not Found**
```
xc32-gcc.exe: command not found
```
**Solution:**
- Verify XC32 installation path in Makefile
- Update `XC32_PATH` variable to match your installation
- Check that `bin/xc32-gcc.exe` exists at that path

### MikroC Build Issues

**Long Build Times (160+ seconds)**
- Old Makefile format issue
- Re-import project to get updated Makefile with proper quoting

**Compiler Always Returns Success**
- MikroC compiler always exits with code 0
- Check for .hex file existence to verify build success

### PATH Setup Failed

**Error: "Failed to automatically add tools to PATH"**

**Solutions:**

1. **Use Manual Instructions**
   - Extension will show detailed steps
   - Follow the sysdm.cpl instructions above

2. **Copy Path to Clipboard**
   - When error appears, click "Copy Path"
   - Add manually to Environment Variables

3. **Alternative: Use VS Code Tasks Only**
   - No PATH needed!
   - Always use `Ctrl+Shift+B` to build
   - Or run from Command Palette: "Tasks: Run Build Task"

## Roadmap

### ✅ Completed (v2.0.0)
- [x] MPLABX project import
- [x] CFLAGS/LDFLAGS parsing
- [x] MCC Harmony 3 structure preservation
- [x] Startup.S auto-generation
- [x] Cross-platform Makefile generation
- [x] MikroC bootloader flashing

### 🚧 In Progress
- [ ] Re-sync command (update MCC files while preserving user code)
- [ ] Better build error parsing and IntelliSense integration
- [ ] Full XC16 (PIC24/dsPIC) testing and validation
- [ ] XC8 (8-bit PIC/AVR) support

### 📋 Planned
- [ ] Direct MCC integration (configure peripherals in VS Code)
- [ ] Debugger support via OpenOCD or MPLAB CLI
- [ ] Project template generator (start new projects without MPLABX)
- [ ] Support for more bootloaders (HID, serial, CAN)

## Development

### Building from Source
```bash
git clone https://github.com/Davec6505/mikroc-bootloader-plugin.git
cd mikroc-bootloader-plugin
npm install
npm run compile
npx @vscode/vsce package
```

### Testing Locally (Extension Development Host)
1. Open the extension project in VS Code
2. Press **F5** to launch Extension Development Host
3. A new VS Code window opens with the extension loaded
4. Test import/build/flash features in the dev host
5. Changes require restarting the dev host (Ctrl+R in dev window)

**Live Development with Watch Mode:**
```bash
npm run watch    # Auto-compile TypeScript on file save
```
Then press F5 - changes apply when you restart the dev host (Ctrl+R).

### Project Architecture
See detailed documentation:
- [readme/PLUGIN_SEPARATION.md](readme/PLUGIN_SEPARATION.md) - Why separation from MikroC generation
- [readme/ARCHITECTURE_LESSONS_LEARNED.md](readme/ARCHITECTURE_LESSONS_LEARNED.md) - Design decisions
- [readme/MCC_INTERRUPT_ARCHITECTURE.md](readme/MCC_INTERRUPT_ARCHITECTURE.md) - MCC Harmony 3 patterns
- `.github/copilot-instructions.md` - Critical implementation details

## Contributing

Contributions welcome! Please:
1. Read [CONTRIBUTING.md](CONTRIBUTING.md)
2. Check existing issues and discussions
3. Open an issue before major changes
4. Follow existing code style (TypeScript + ESLint)

## Changelog

### v2.5.38 (February 2026)
- 🐛 Fixed: **PBCLK per-bus maximum MHz** corrected per DS60001320 PIC32MZ EF datasheet
  - PB1 (System Bus) and PB8 (USB/CAN/Ethernet) now correctly show up to 200 MHz — previously flagged red incorrectly
  - PB2–PB5, PB7 retain 100 MHz maximum (peripheral I/O speed limit)
  - Added **SYSCLK: X MHz** reference line at top of Peripheral Bus Clock section
  - Default confirmed: 24 MHz ÷ 3 × 50 ÷ 2 = **200 MHz** SYSCLK

### v2.5.37 (February 2026)
- ✨ Added: **Edit Project Configuration** command — open the visual config editor on any existing project
  - Command Palette: `XC Project Importer: Edit Project Configuration (Oscillator, PLL, Build Settings)`
  - Pre-populates editor from existing `config.json`
  - On save: writes `config.json` + regenerates Makefile with updated build settings
  - Warns if PLL/clock settings changed (requires `#pragma config` update in source)
  - **Build Now** quick action offered after save

### v2.5.36 (February 2026)
- ✨ Added: **Smart Flash/Program button visibility** based on project type
  - Bootloader projects show `$(zap) Flash`, hide `$(chip) Program`
  - ICSP projects show `$(chip) Program`, hide `$(zap) Flash`
  - Unknown/legacy projects show both
  - Controlled by `usesBootloader` field in `.vscode/pic32-project.json`

### v2.5.35 (February 2026)
- ✨ Added: **Program Device button** — ICSP programming via MPLAB IPE (`ipecmd.exe`)
  - Supports PICkit 4, PICkit 5, ICD 4, ICD 5, SNAP (quick-pick selection)
  - Auto-detects `ipecmd.exe` from MPLAB X IDE installation; manual browse fallback
  - Device name auto-read from project metadata
  - Runs erase + program in integrated terminal
- 🔧 Branch `DAP-DEV` created for hardware debug adapter protocol research

### v2.5.34 (February 2026)
- ✨ Added: **Build Settings panel** in Config Editor right panel
  - Heap Size (bytes) — mapped to `{{HEAP_SIZE}}` Makefile token
  - Stack Size (bytes) — mapped to `{{STACK_SIZE}}` Makefile token
  - Optimization Level select: -O0, -O1, -O2 (default), -O3, -Os
  - Build Type radio: Release / ICD Debug
  - All saved in `config.json` and applied when generating Makefile
- 🐛 Fixed: **PIC32MZ EF PBCLK architecture** corrected from hardware datasheet
  - Removed PB6 (register does not exist on EF family — compiler error if used)
  - Added PB8 for USB/CAN/Ethernet (PBDIV=0 → ÷1 → 200 MHz default)
  - PBDIV option labels now show raw register values (0–7) matching the datasheet
  - Each peripheral bus shows live MHz calculation, highlighted red if invalid
- 🐛 Fixed: Config Editor JS event listeners now correctly target `[1,2,3,4,5,7,8]` bus IDs
- 🐛 Fixed: OK button now reliably generates code (JS rewritten with correct HTML element IDs)

### v2.5.27 (January 2026)
- 🐛 Fixed: User header files (app.h, etc.) from MCC Harmony projects now properly imported
- ✨ Added: Visual configuration editor for new XC32 project creation
  - Interactive oscillator/PLL configuration with real-time clock calculation
  - Device-specific constraints and pre-validated #pragma config templates
  - Mirrors MikroC Project Settings UI for familiar workflow

### v2.0.0 (December 2024)
- 🎉 Complete rewrite focused on MPLABX import workflow
- ✨ AI-first development approach with Copilot integration
- 🔧 CFLAGS/LDFLAGS parsing from MPLABX Makefiles
- 🚀 Auto-detection of CRT0 vs startup.S configuration
- 📦 Complete 604-line startup.S template included
- 🗂️ Proper MCC Harmony 3 folder structure preservation
- 🛠️ Cross-platform GNU Makefile generation
- 🧹 Removed 17k+ lines of unused generation code

See [CHANGELOG.md](CHANGELOG.md) for full version history.

## License

MIT License - see [LICENSE](LICENSE) file for details.

**This project is not affiliated with Microchip Technology Inc. or MikroElektronika.**

## Support & Community

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/Davec6505/mikroc-bootloader-plugin/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/Davec6505/mikroc-bootloader-plugin/discussions)
- 📖 **Documentation**: [readme/](readme/) folder
- 💬 **Questions**: Open a discussion or issue

## Acknowledgments

This extension exists to bring **AI-assisted development to embedded systems**:
- **GitHub Copilot** - For making embedded development faster and more accessible
- **Microchip** - For PIC32 MCUs, XC32 compiler, and MCC Harmony 3
- **MikroElektronika** - For the MikroC HID bootloader
- **VS Code Team** - For the incredible editor and extension API

---

**⭐ If this extension helps you leverage AI for embedded development, please star the repo!**

**Built by developers, for developers who want to code smarter with AI.**
