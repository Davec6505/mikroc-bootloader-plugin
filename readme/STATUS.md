# Project Status

**Last Updated**: January 20, 2026  
**Version**: 2.5.26  
**Branch**: master

---

## 🎯 Development Roadmap

### Current Focus: Config Editor Integration Complete - Ready for Testing

**Priority Order**:
1. **Config Editor Testing** (Current - Jan 20, 2026) - End-to-end validation of XC32 project creation workflow
2. **Debug Support** (Next) - ICD/PICkit/SNAP integration, F5 debugging in VS Code
3. **XC8 Support** (Future) - 8-bit PIC and AVR after XC32 is rock-solid

**Not Pursuing**: MCC/Harmony project generation (too complex, leave to MPLABX)

**Recently Completed**: 
- Config editor JSON-based #pragma config generation (v2.5.26 - Jan 20, 2026)
- Config editor Promise resolution race condition fixed (v2.5.26 - Jan 20, 2026)
- MakefileGenerator integration for project creation (v2.5.26 - Jan 20, 2026)

---

## ✅ Completed Features

### 1. Configuration Editor Integration (v2.5.26 - Jan 20, 2026) ⚠️ READY FOR TESTING
- **Config Editor UI**: 21 configuration options (oscillator, PLL, watchdog, debug, protection)
- **Real-time clock calculator**: Dynamic PLL math with system frequency display
- **Modal workflow**: Integrated into new XC32 project creation
- **Promise resolution fix**: Resolve config before panel dispose to prevent race condition
- **MakefileGenerator integration**: Uses proven MPLABX importer templates
- **JSON-based config bits**: Pre-validated #pragma config from device JSON files
- **PLL value substitution**: User's PLL settings merged into device-specific templates
- **Family-aware**: Automatic PIC32MZ vs PIC32MX config bit selection
- **Status**: Compiled and ready for end-to-end testing
- **Next**: Delete C:\Temp\XC2, recreate project, verify compilation succeeds
- **Files**: 
  - `src/configEditor.ts` (webview provider, generateXC32Config refactored)
  - `src/extension.ts` (createXC32Project with config editor integration)
  - `devices/pic32mz-ef.json`, `devices/pic32mx.json` (config bit templates)
  - `src/webview/configEditor.js`, `src/webview/configEditor.css` (UI)

### 2. Build System Status Bar Integration (v2.5.8-2.5.12 - Jan 18, 2026)
- **Build button**: Executes default build task (Ctrl+Shift+B equivalent)
- **Rebuild button**: Runs `make rebuild` (or `make clean ; make` fallback)
- **Flash button**: Flashes .hex file using MikroC bootloader
- **PowerShell compatibility**: Uses `&` call operator for quoted paths
- **Environment setup**: Bundled make.exe with proper PATH and SHELL
- **Rebuild target detection**: Checks Makefile for `rebuild:` target before execution
- **Terminal integration**: Creates named terminals with proper environment variables
- **Files**: `src/extension.ts` (buildProject, rebuildProject, flashDevice functions)

### 3. Device-Specific Clock Configuration (v2.5.13 - Jan 19, 2026)
- **Device-specific frequencies**: PIC32MX devices configured for 50/72/80/120MHz based on family
- **Configuration bit variants**: 4 clock-speed-specific #pragma config templates in pic32mx.json
- **Metadata-driven**: maxClockMHz and configVariant fields for all 104 PIC32MX devices
- **Automatic selection**: getDeviceClockFrequency() with regex-based family detection
- **PLL settings**: Correct FPLLIDIV/FPLLMULT/FPLLODIV for each clock speed variant
- **Files**: `devices/pic32mx.json`, `src/deviceLoader.ts`, `src/extension.ts`

### 3. XC32 Project Creation & Compiler Detection (v2.3.1-2.3.2 - Jan 13-14, 2026)
- **Hybrid XC32 detection**: Fast common path check (99% case), manual browse fallback
- **DFP auto-detection**: Automatically finds Device Family Packs from MPLABX installation
- **Project templates**: Creates complete buildable projects with srcs/, incs/, objs/, bins/
- **-mdfp flag support**: XC32 v4.0+ compatibility with proper DFP path inclusion
- **DFP_PATH variable**: User-editable Makefile variable for manual DFP configuration
- **Browse for DFP**: Manual browse option with xc32 subfolder validation
- **Directory structure**: Correct objs/ and bins/ folders (not build/)
- **User guidance**: Clear installation instructions for missing DFPs
- **Files**: `src/extension.ts` (createXC32Project, detectXC32Compiler, detectDFP, downloadDFP)

### 4. MPLABX Project Import (v2.3.0-2.3.1 - Jan 11, 2026)
- **tasks.json auto-generation**: Creates build tasks automatically during import
- **Bundled make.exe**: Zero external dependencies - no MSYS2/Git Bash needed
- **Ctrl+Shift+B support**: Build directly from VS Code with bundled tools
- **Enhanced Makefile help**: Detailed `make help` with DRY_RUN options
- **Files**: `src/extension.ts` (tasks.json generation), `src/templates/xc32/tasks.json.template`

### 4. MikroC Project Import (Dec 21-22, 2025)
- **Universal compiler support**: PIC32, PIC, dsPIC, AVR, ARM
- **All .mcp* file types**: .mcp32, .mcp16, .mcp8, .mcp18, .mcppi, .mcpdsp, .mcpav, .mcpar
- **In-place import**: No file copying, Makefile created in project folder
- **Dynamic parsing**: Detects compiler paths, device, libraries, PLD files
- **Library conversion**: Maps library names to .emcl format with device suffixes
- **Windows path formatting**: Proper backslashes with trailing \\
- **Auto-open**: Project opens automatically after import
- **Build integration**: VS Code tasks (Build/Clean/Flash)
- **VERIFIED WORKING**: Generates Makefiles that compile identically to MikroC IDE

### 5. Bootloader Auto-Update System (Dec 22, 2025)
- **Automatic updates**: Checks GitHub releases once per 24 hours
- **GitHub integration**: Downloads from Davec6505/MikroC_bootloader repo
- **Global storage**: Downloaded versions persist across extension updates
- **Path priority**: Uses downloaded version first, falls back to bundled
- **Manual trigger**: Command palette "Check for Bootloader Updates"
- **Silent failures**: No user notification on check errors, console logging only
- **Cross-platform**: Supports Windows (mikro_hb.exe) and Linux (mikro_hb)
- **Progress UI**: Download progress notification, success message on completion
- **Files**: `src/bootloaderUpdater.ts`, integrated with `bundledTools.ts` and `extension.ts`

### 6. Configuration Editor (WebView UI - Deprecated)
- Device selection with package type support
- Visual configuration bit editing (40 settings)
- System clock and PBCLK configuration
- Multi-peripheral configuration (Timers, UARTs)
- Pin configuration with PPS remapping
- Save/load schemes (.cfgsch files)
- Real-time register calculation preview

### 7. Project Generators (Deprecated in favor of Import workflows)

#### XC32 Project Generator (Now: XC32 Project Creation)
- See feature #1 above - now integrated into main import workflow
- Creates template projects with detected compiler/DFP paths
- **STATUS**: Active, integrated into v2.3.1

#### MikroC Project Generator
- MikroC PRO for PIC32 compatible
- Makefile-based builds
- Peripheral library generation

### 3. Peripheral Libraries (MCC Compatible)

#### Clock System
- Full PBCLK1-8 configuration
- PMD (Peripheral Module Disable) support
- Automatic frequency calculation
- Files: `peripheral/clk/plib_clk.{h,c}`

#### GPIO Peripheral
- Complete MCC-compatible API
- Pin-level and port-level functions
- All device pins in GPIO_PIN enumeration
- GetLatch functions
- PPS remapping support
- Files: `peripheral/gpio/plib_gpio.{h,c}`

#### Timer Peripheral
- Timer1 (16-bit Type A)
- Timer2-9 (16-bit Type B, 32-bit pairs)
- Interrupt support with priority/sub-priority
- Multiple timers per project
- Files: `peripheral/tmr1/`, `peripheral/tmr/tmr{N}/`

#### UART Peripheral
- UART1-6 support (device dependent)
- Operating modes: Blocking, Non-Blocking, Ring Buffer
- Configurable baud rates, parity, stop bits
- Baud rate error calculation
- Multiple UARTs per project
- Files: `peripheral/uart/uart{N}/`

#### EVIC (Interrupt Controller)
- Three-layer architecture (MCC compatible)
- `interrupts.h` - Forward declarations
- `interrupts.c` - ISR vectors with `__ISR(_VECTOR, iplNSRS)`
- Peripheral handler functions with callbacks
- Interrupt priority/sub-priority configuration

### 4. Device Support
- **PIC32MZ EFH Family**:
  - PIC32MZ1024EFH064 (64-pin)
  - PIC32MZ1024EFH100 (100-pin)
  - PIC32MZ2048EFH064 (64-pin)
  - PIC32MZ2048EFH100 (100-pin)

### 5. Build System Integration
- GNU Make bundled for Windows
- MSYS detection for native Make
- Cross-platform Makefiles (Windows/Linux/macOS)
- XC32 compiler auto-detection
- DFP auto-detection
- VS Code tasks for Build/Clean/Rebuild/Flash

### 6. Bootloader Integration
- MikroElektronika USB HID bootloader support
- Flash command with .hex file detection
- Status bar quick-flash button
- Terminal integration for real-time output

---

## 🏗️ Architecture

### Frontend (WebView)
- **File**: `src/webview/configEditor.js` (2150+ lines)
- **Tech**: Vanilla JavaScript
- **Communication**: vscode.postMessage() API
- **State**: Global objects for config, timers, UARTs, pins

### Backend (TypeScript)
- **File**: `src/configEditor.ts`
- **Responsibilities**: 
  - WebviewPanel creation
  - Message handling
  - File I/O
  - Project generation delegation

### Generator Modules
- `harmonyClkGen.ts` - Clock configuration
- `harmonyGpioGen.ts` - GPIO initialization
- `harmonyTimerGen.ts` - Timer peripherals
- `harmonyUartGen.ts` - UART peripherals
- `ppsCodeGen.ts` - PPS remapping
- `xc32ProjectGen.ts` - XC32 project structure
- `mikrocProjectGen.ts` - MikroC project structure

---

## 📁 Generated Project Structure

```
project_name/
├── .vscode/
│   ├── tasks.json              # Build/Clean/Flash tasks
│   └── c_cpp_properties.json   # IntelliSense configuration
│
├── config/
│   └── config.h                # Configuration bits
│
├── peripheral/
│   ├── clk/                    # Clock system
│   ├── evic/                   # Interrupt controller
│   ├── gpio/                   # GPIO peripheral
│   ├── tmr1/                   # Timer1 (Type A)
│   ├── tmr/                    # Timer2-9 (Type B)
│   │   ├── plib_tmr_common.h
│   │   ├── tmr2/
│   │   └── tmr3/ ...
│   └── uart/                   # UART1-6
│       ├── plib_uart_common.h
│       ├── uart1/
│       └── uart2/ ...
│
├── bins/                       # Output binaries
├── objs/                       # Object files
├── incs/                       # Additional includes
│
├── interrupts.h                # Interrupt declarations
├── interrupts.c                # ISR vectors
├── device.h                    # Device header
├── definitions.h               # System definitions
├── startup.S                   # XC32 startup code
├── main.c                      # Application code
│
├── Makefile                    # Root makefile
├── srcs/
│   └── Makefile                # Source makefile
│
└── README.md                   # ✅ VERIFIED - Generated
```

---

## 🚧 In Progress: Configuration Editor

### Architecture (Jan 19, 2026)

**Goal**: MikroC-style config editor for new project creation (NOT for imports)

**Workflow Integration**:
- Only appears during `createXC32Project()` and `createMikroCProject()`
- NOT used when importing existing MPLABX/MikroC projects (preserve existing config)
- Opens after device selection, before file generation

**Core Design**:
1. **Compiler-Agnostic Config Storage**
   - Stores semantic settings in `config.json` (project root)
   - Format: oscillator type, frequency, PLL dividers/multipliers, peripheral settings
   - Example: `{ "oscillator": { "type": "XT", "frequency": 8000000 }, "pll": { "inputDiv": 2, "mult": 20, "outputDiv": 1 } }`

2. **Device-Driven Options**
   - Parses device JSON for valid PLL ranges, oscillator modes, config bit options
   - Validates user selections against device constraints
   - Example: PIC32MX allows DIV_1/2/3/4/5/8/10/12, MUL_15-24, etc.

3. **Real-Time Clock Calculator**
   - Displays calculated system clock frequency as user changes settings
   - Formula: `(Crystal Frequency ÷ FPLLIDIV) × FPLLMULT ÷ FPLLODIV`
   - Example: `(8MHz ÷ 2) × 20 ÷ 1 = 80MHz`

4. **Dual Output Generators**
   - **XC32 Output**: Generates exact `#pragma config` statements from config.json
   - **MikroC Output** (future): Generates MikroC format from same config.json
   - Maintains exact format currently used (line-by-line #pragma with comments)

5. **Webview GUI**
   - Mirrors MikroC Project Settings dialog layout (screenshots provided)
   - Left panel: PLL settings, oscillator selection, peripheral config
   - Right panel: Device name, calculated clock, build type, config register preview
   - Buttons: Load Scheme, Save Scheme, Default, OK, Cancel

**File Structure**:
- `src/configEditor.ts` - Backend webview provider, config parser/generator
- `src/webview/configEditor.html` - GUI layout matching MikroC style
- `src/webview/configEditor.css` - Styling
- `src/webview/configEditor.js` - Frontend logic, clock calculator, validation
- `config.json` - Per-project configuration (gitignored in template)

**Config JSON Schema**:
```json
{
  "device": "32MZ2048EFH100",
  "compiler": "XC32",
  "oscillator": {
    "primary": { "type": "XT", "frequency": 8000000 },
    "secondary": { "enabled": false }
  },
  "pll": {
    "inputDiv": 2,
    "multiplier": 20,
    "outputDiv": 1,
    "usbInputDiv": 2,
    "usbEnabled": false
  },
  "clock": {
    "systemFrequency": 80000000,
    "peripheralDiv": 1,
    "switchingEnabled": false
  },
  "watchdog": { "enabled": false, "postscaler": "PS1048576" },
  "debug": { "enabled": true, "icesel": "ICS_PGx2" },
  "protection": { "codeProtect": false, "writeProtect": false },
  "interrupts": {
    "mode": "multi",
    "shadowRegisters": true,
    "srsCount": 7,
    "vectorSpacing": 32,
    "ebase": "0x9FC01000"
  }
}
```

**Integration Steps**:
1. Parse device JSON → extract available config options
2. Show webview with device constraints
3. User configures oscillator/PLL/settings
4. Calculate and display resulting clock frequency
5. Save config.json to project root
6. Generate #pragma config statements from config.json
7. Insert into main.c template before code generation

**Critical Constraints**:
- Must output EXACT `#pragma config` format currently used (preserves MPLABX compatibility)
- Config editor code must be reusable for MikroC projects (compiler-agnostic design)
- Only shown for NEW projects, never for imports (imports preserve existing config)

---

## 🎯 Critical Design Decisions

### 1. MCC Harmony 3 Folder Structure
Each peripheral instance in its own subfolder:
- Timer1: `peripheral/tmr1/plib_tmr1.{h,c}`
- Timer2-9: `peripheral/tmr/tmr{N}/plib_tmr{N}.{h,c}`
- UART1-6: `peripheral/uart/uart{N}/plib_uart{N}.{h,c}`
- Common headers at parent level

### 2. ISR Macro Format (CRITICAL)
```c
// ✅ CORRECT
#include <sys/attribs.h>  // MUST be in device.h
void __ISR(_TIMER_1_VECTOR, ipl1SRS) TIMER_1_Handler(void)

// ❌ WRONG
void __ISR(_TIMER_1_VECTOR, IPL1SRS)  // Uppercase fails
```

### 3. Windows CRLF Line Endings
- All template files use `\r\n`
- String replacements must match exact byte sequences
- **CRITICAL**: Template.replace() fails if line endings don't match

### 4. Three-Layer Interrupt Architecture
1. `interrupts.h` - Forward declarations
2. `interrupts.c` - ISR vectors routing to handlers
3. `plib_tmrX.c / plib_uartX.c` - Handler implementations with callbacks

### 5. Timer Peripheral Includes
```c
// ✅ CORRECT - Timer source MUST include definitions.h
#include "device.h"
#include "plib_tmr1.h"
#include "interrupts.h"
#include "definitions.h"  // ← REQUIRED for CPU_CLOCK_FREQUENCY
```

---

## ✅ Verified Working Features

**Tested in c:\Temp\xc32-test project**:
- ✅ Makefile generation (Root + srcs/)
- ✅ README.md generation
- ✅ All peripheral files generated
- ✅ "Open Project" dialog appears after generation
- ✅ Device selection
- ✅ Configuration bit editing
- ✅ Timer configuration
- ✅ UART configuration
- ✅ GPIO and pin configuration

---

## 📋 Known Limitations

### Current Constraints
- Only PIC32MZ EFH family supported
- Windows primary platform (cross-platform makefiles generated)
- XC32 compiler required (no alternative toolchains)
- DFP must be installed manually

### Future Enhancements
1. **Add More Peripherals**:
   - SPI (Master/Slave)
   - I2C (Master/Slave)
   - ADC (analog input)
   - PWM (output compare)
   - CAN bus

2. **Add More Devices**:
   - PIC32MZ EFC (External Flash Controller)
   - PIC32MZ EFE (Ethernet)
   - PIC32MX family

3. **Enhanced Features**:
   - Pin conflict detection
   - Peripheral dependency checking
   - Project templates library
   - Code preview before generation

---

## 🛠️ Development Environment

- **Node.js**: v16+ required
- **TypeScript**: 5.x
- **VS Code**: 1.95+
- **Build**: `npm run watch` or `npm run compile`
- **Debug**: F5 in VS Code (Extension Development Host)

### Build Commands
```bash
# Watch mode (auto-recompile)
npm run watch

# One-time compile
npm run compile

# Package extension
npx vsce package
```

---

## 📝 Documentation Files

- **README.md** - User guide, features, installation
- **readme/FLOW.md** - Code flow and entry points
- **readme/STATUS.md** - This file (project status)
- **.github/copilot-instructions.md** - Technical details, critical findings

---

## 🔍 Testing Status

### Manual Testing (Complete)
- ✅ Device selection
- ✅ Configuration bit editing
- ✅ Clock configuration
- ✅ Timer configuration (single & multiple)
- ✅ UART configuration (all modes)
- ✅ GPIO and pin configuration
- ✅ XC32 project generation
- ✅ Makefile generation (VERIFIED WORKING)
- ✅ README generation (VERIFIED WORKING)
- ✅ "Open Project" dialog (VERIFIED WORKING)
- ✅ MikroC project generation

### Hardware Testing
- ✅ Bootloader flashing with real hardware
- ⏳ Generated code on hardware (pending)

---

## 📦 Distribution

- **Package**: `xc-project-importer-2.1.0.vsix`
- **Published**: VS Code Marketplace (December 21, 2025)
- **Install**: Search "XC Project Importer" or install from VSIX
- **Bundled Tools**: make.exe, mikro_hb.exe (auto-updates)

---

## 🚀 Next Steps

### Immediate Priorities
1. **Create GitHub Release** for MikroC_bootloader repo with v1.0.0 tag
   - Attach mikro_hb.exe (Windows) and mikro_hb (Linux) as assets
   - Test auto-update mechanism with real release
2. **Test auto-update** on different platforms
3. **Version bump** to 2.2.0 when auto-update verified working

### Future Enhancements
- MPLABX project import improvements
- Additional peripheral support (SPI, I2C, ADC)
- Hardware testing of generated code
- Linux/macOS testing
- **Publish**: VS Code Marketplace (future)

---

## 🚀 Current Capabilities Summary

**Working Features**:
1. ✅ Full configuration UI with device selection
2. ✅ XC32 project generation with all files (Makefile, README, etc.)
3. ✅ MCC Harmony 3 compatible peripheral libraries
4. ✅ Multi-peripheral support (Clock, GPIO, EVIC, Timer, UART)
5. ✅ Interrupt architecture (3-layer MCC style)
6. ✅ Build system integration (Make + VS Code tasks)
7. ✅ Bootloader flashing
8. ✅ Pin configuration and PPS remapping

**Project is FEATURE COMPLETE** for current scope.

---

**Status**: ✅ **FULLY FUNCTIONAL**  
**Next Phase**: Add SPI/I2C/ADC peripherals or expand device families
