# XC Project Importer for VS Code

[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**AI-Assisted Microchip Development in VS Code** - Import MPLABX projects and leverage GitHub Copilot for embedded development with XC8, XC16, or XC32 compilers.

## Why This Extension?

This extension was created to solve a fundamental problem: **modern AI coding assistants like GitHub Copilot work best in VS Code, but Microchip embedded development traditionally happens in MPLABX IDE.**

By importing your MPLABX projects into VS Code, you can:
- ✨ **Get AI assistance** - Let Copilot help write peripheral drivers, debug code, and understand complex configurations
- 🚀 **Use modern tooling** - Leverage VS Code's superior editing, search, and extension ecosystem
- 🔄 **Keep MCC workflow** - Continue using MPLABX/MCC for peripheral configuration, then import back to VS Code
- 🛠️ **Build natively** - Compile and flash directly from VS Code with your existing XC8/16/32 toolchain

**Perfect for developers who want to use AI assistance while working with MCC generated code for any Microchip device.**

## Features

### 📥 MPLABX Project Import
- **One-Click Import**: Select your `.X` folder and automatically import entire MPLABX project
- **Universal Compiler Support**: Works with XC8 (8-bit PIC/AVR), XC16 (16-bit PIC24/dsPIC), XC32 (32-bit PIC32)
- **MCC Compatible**: Preserves all MCC-generated peripheral libraries and structure (MCC Classic & Harmony 3)
- **Flag Preservation**: Extracts and preserves CFLAGS and LDFLAGS from original Makefiles
- **Startup Detection**: Automatically detects CRT0 vs custom startup.S configuration (XC32)
- **Full Toolchain**: Uses your existing XC compiler and DFP installations
- **Build System**: Generates GNU Makefiles compatible with Windows, WSL, and Git Bash
- **Metadata Tracking**: Saves project metadata for future re-sync with MPLABX

### ⚡ MikroC Bootloader Support (PIC32 only)
- **One-Click Flashing**: Flash .hex files to PIC32 devices via USB HID bootloader
- **Status Bar Button**: Quick access "⚡ Flash PIC32" button  
- **Auto-Discovery**: Finds .hex files in your workspace
- **Terminal Output**: Real-time flash progress

_Note: Bootloader flashing currently supports PIC32 only. Use MPLABX IPE for other devices._

### 🤖 AI-First Development
This extension is designed for **AI-assisted embedded development**:
- **GitHub Copilot Integration**: Get intelligent code suggestions for any Microchip peripheral
- **Context-Aware Help**: Copilot understands MCC-generated code structure
- **Faster Development**: Let AI help with boilerplate, drivers, and configuration
- **Learning Tool**: Use Copilot to understand complex peripheral interactions
- **Works with All Devices**: PIC10/12/16/18 (XC8), PIC24/dsPIC (XC16), PIC32 (XC32)

## How It Works

### Typical Workflow

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
- **XC Compiler** - One or more of:
  - XC8 (8-bit PIC10/12/16/18, AVR)
  - XC16 (16-bit PIC24, dsPIC30/33)
  - XC32 (32-bit PIC32)
  - Download from [Microchip](https://www.microchip.com/en-us/tools-resources/develop/mplab-xc-compilers)
- **DFP (Device Family Pack)** - Installed with MPLABX or standalone
- **MPLABX IDE** (optional) - For using MCC to configure peripherals
- **GitHub Copilot** (recommended) - For AI-assisted development

#### 2. Hardware (For Flashing)
- **Microchip Device** - Any device supported by your XC compiler
- **USB Connection** (optional) - For PIC32 bootloader flashing
- **MikroC Bootloader Firmware** (optional) - For PIC32 USB HID flashing feature
- **Programmer** (recommended) - MPLAB ICD, PICkit, or compatible for production

#### 3. Build Environment
- **Windows**: MSYS2/Git Bash or native `make` (MinGW)
- **Linux/WSL**: Standard GNU make and bash

### What's Bundled
✅ **MikroC HID Bootloader** (`mikro_hb.exe`) - Built-in!  
✅ **Startup Code Template** - Complete CRT0 replacement for -nostartfiles

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

## Quick Start

### Import Your First MPLABX Project

1. **Open VS Code** in an empty folder
2. Press `Ctrl+Shift+P` and type "**XC Project Importer: Import MPLABX Project**"
3. Select your MPLABX `.X` project folder
4. Wait for import to complete (files copied, Makefiles generated)
5. **Start coding with AI assistance!**

_Works with any XC8/16/32 project. Tested with PIC32MZ (XC32), coming soon: PIC24/dsPIC (XC16)._

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

**Command Line:**
```bash
make                    # Build project
make clean             # Clean build artifacts
```

**VS Code Tasks:**
- Press `Ctrl+Shift+B` to build
- Or use Command Palette: "Tasks: Run Build Task"

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
| **"Cannot find XC compiler"** | Set compiler path in project metadata or ensure XC8/16/32 is in system PATH |
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
| **Debugging** | ✅ Full MPLAB debugger | ⚠️ Use MPLABX for debugging |
| **Programming** | ✅ All programmers | ⚠️ PIC32 bootloader or MPLABX |

**Recommendation**: Use MPLABX for initial setup and debugging, VS Code for development.

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
