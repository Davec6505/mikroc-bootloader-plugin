# AI Coding Guide: XC Project Importer Extension

## Architecture Overview

This VS Code extension enables AI-assisted embedded development by importing MPLABX and MikroC projects into VS Code. The core workflow is **import and build**, not code generation.

### Three Independent Import Workflows

1. **MPLABX Project Import** ([projectImporter.ts](../src/projectImporter.ts))
   - Parse `.X/nbproject/Makefile-*.mk` files for toolchain paths, device, flags
   - Auto-detect CRT0 vs custom `startup.S` (look for `-nostartfiles` linker flag in XC32)
   - Copy files to new folder, organize headers in `incs/`, generate cross-platform Makefiles
   - Preserve MCC Harmony 3 structure (`srcs/config/default/peripheral/`)

2. **MikroC Project Import** ([mikrocImporter.ts](../src/mikrocImporter.ts))
   - Parse `.mcp*` files (INI format) for device, clock, source files, libraries
   - Scan source code for function usage → auto-detect required `.emcl` libraries
   - Generate in-place Makefile with PowerShell call operator for MikroC compiler
   - **Critical**: Quote each file/library individually in Makefile, NOT as batch string

3. **XC32 Project Creation** ([extension.ts](../src/extension.ts) → `createXC32Project`)
   - Detect XC32 compiler via quick check of common paths (instant, no PowerShell timeout)
   - Auto-detect DFP (Device Family Pack) from MPLABX installation (`C:/Program Files/Microchip/MPLABX/v*/packs/Microchip/`)
   - **Config Editor Integration**: Opens webview after device selection, before file generation
   - User configures oscillator/PLL settings → saves to `config.json`
   - Generates `#pragma config` statements from config.json
   - Generate template project with folder structure: `srcs/`, `incs/`, `objs/`, `bins/`
   - Create files: `srcs/main.c`, `Makefile`, `tasks.json`, `README.md`, `config.json`
   - Add `-mdfp="$(DFP_PATH)"` flag to Makefile (required for XC32 v4.0+)
   - **DFP_PATH variable**: User-editable Makefile variable for manual DFP path configuration
   - Offer manual browse if compiler/DFP not in standard locations (validates xc32 subfolder)
   - **Directory structure**: Uses `OBJ_DIR = objs` and `BIN_DIR = bins` (NOT build/)
   - **Critical**: Quote all tool paths in Makefile (`"$(COMPILER_BIN)/xc32-gcc.exe"`)

4. **Build System Status Bar Buttons** ([extension.ts](../src/extension.ts))
   - **Build button**: Executes `workbench.action.tasks.build` (runs default build task)
   - **Rebuild button**: Creates terminal with bundled make, checks for `rebuild` target in Makefile
   - **Flash button** (`$(zap) Flash`): Creates terminal, calls `mikro_hb.exe` with selected .hex file — MikroE HID bootloader path
   - **Program button** (`$(chip) Program`): ICSP programming via `ipecmd.exe` (MPLAB IPE CLI)
     - Auto-detects `ipecmd.exe` under `C:\Program Files\Microchip\MPLABX\v*\mplab_platform\mplab_ipe\` (latest version)
     - Falls back to manual Browse dialog if MPLAB X IDE not installed
     - Quick-pick programmer: PICkit 4, PICkit 5, ICD 4, ICD 5, SNAP
     - Reads device name from `.vscode/pic32-project.json`, falls back to manual input box
     - Command: `& "ipecmd.exe" -TP<TOOL> -P<DEVICE> -F"<hex>" -E -M`
   - **PowerShell syntax**: Uses `&` call operator for quoted paths: `& "path/to/make.exe" rebuild`
   - **Makefile rebuild target**: Template includes `rebuild: all` (clean + build)
   - **Environment setup**: Adds bundled bin path to PATH, sets SHELL to bundled sh.exe

### Key Components

- **[bundledTools.ts](../src/bundledTools.ts)**: Provides paths to bundled `make.exe`, `sh.exe`, `rm.exe` (zero external dependencies)
- **[bootloaderUpdater.ts](../src/bootloaderUpdater.ts)**: Auto-checks GitHub releases for `mikro_hb.exe`, downloads to `globalStorageUri` (survives extension updates)
- **[makefileGenerator.ts](../src/makefileGenerator.ts)**: Generates cross-platform Makefiles with proper escaping for paths with spaces
- **[deviceLoader.ts](../src/deviceLoader.ts)**: Loads device definitions from JSON, provides device-specific clock frequencies and config options
- **[configEditor.ts](../src/configEditor.ts)**: Webview provider for oscillator/PLL + build settings configuration (new project creation only)
  - `ProjectConfig` interface includes `build?: { heapSize, stackSize, optLevel, buildType }` section
  - Build settings saved to `config.json` and used by `MakefileGenerator` via `{{HEAP_SIZE}}`, `{{STACK_SIZE}}`, `{{OPT_LEVEL}}` tokens
  - Config editor HTML is a TypeScript template string in `_getHtmlForWebview()` — **`src/webview/configEditor.html` is DEAD/unused**
  - Frontend JS is `src/webview/configEditor.js` (copied to `out/webview/` at compile time)

### PIC32MZ EF Peripheral Bus Clock Architecture

PIC32MZ EF devices have **7 peripheral bus clocks** configured at runtime (verified from DFP `p32mz1024efh064.h`):

- **PBCLK1**: System Bus (CPU, Flash, Interrupts, DMA) - Always ON, **no ON bit**, has PBDIV (÷1 to ÷8)
- **PBCLK2**: Communication (UART, SPI, I2C) - Enable/disable + PBDIV (÷1 to ÷8)
- **PBCLK3**: Timers/PWM (Timer2-9, Input Capture, Output Compare) - Enable/disable + PBDIV (÷1 to ÷8)
- **PBCLK4**: GPIO Ports - Enable/disable + PBDIV (÷1 to ÷8)
- **PBCLK5**: Flash Controller, EBI, SQI - Enable/disable + PBDIV (÷1 to ÷8)
- **NO PBCLK6** - `PB6DIV` register does **NOT** exist on PIC32MZ EF (attempting to use it causes compiler error)
- **PBCLK7**: ADC / Reference Clock - Enable/disable + PBDIV (÷1 to ÷8) — **has a real divider!**
- **PBCLK8**: USB, CAN, Ethernet - Enable/disable + PBDIV (÷1 to ÷8)

**PBDIV Register is 0-indexed**: `0=÷1, 1=÷2, 2=÷3 ... 7=÷8`

**Formula**: `PBCLK = SYSCLK / (PBDIV + 1)` where PBDIV register value = 0-7

**Typical defaults (200 MHz SYSCLK)** — confirmed DS60001320 PIC32MZ EF datasheet:
- PB1, PB2-PB5, PB7: PBDIV=1 → ÷2 → 100 MHz
- PB8: PBDIV=0 → ÷1 → 200 MHz (USB/CAN/Ethernet need full SYSCLK)

**Per-bus maximum clock (datasheet limits)**:
- **PB1** (System Bus): max **200 MHz** — runs at SYSCLK, no peripheral limit
- **PB2–PB5, PB7**: max **100 MHz** — peripheral I/O speed limit
- **PB8** (USB/CAN/Ethernet): max **200 MHz** — must track SYSCLK for USB timing
- ⚠️ Do NOT flag PB1 or PB8 as red at 200 MHz — they are correct and expected

**SYSCLK default**: 24 MHz ÷ 3 × 50 ÷ 2 = **200 MHz** (FPLLICLK=PoSC, FPLLIDIV=÷3, FPLLMULT=×50, FPLLODIV=÷2)

**Configuration**:
- Config editor UI shows PBCLK section only for devices starting with "32MZ"
- PBCLK section header shows **"SYSCLK: X MHz"** for reference
- HTML select option values are **0-7** (PBDIV register values, not actual divisors)
- MHz shown in red only when: fractional result OR PB2-PB5/PB7 exceed 100 MHz (NOT PB1/PB8)
- Generates `configure_peripheral_clocks()` function called early in main.c startup
- Runtime configuration via PB1DIV, PB2DIV, PB3DIV, PB4DIV, PB5DIV, PB7DIV, PB8DIV registers
- PB2-PB8 have ON/OFF control via `PBxDIVbits.ON`; PB1 always enabled (no ON bit)

## Critical Development Rules

### Before Changing Code
- **ALWAYS verify assumptions**: Read templates, Makefiles, and actual code before making changes
- **Question user requests**: If something seems wrong, check the facts first and present findings
- **Find all usages**: Use `list_code_usages` tool to find all call sites of functions you're modifying
- **Read adjacent code**: Template replacements and file path handling is fragile - understand the full flow
- **Check interfaces**: TypeScript interfaces in `projectImporter.ts` must match actual usage in `extension.ts`
- **No hasty changes**: Verify templates and existing logic before removing "unnecessary" code

### Common Pitfalls

1. **Windows CRLF Line Endings in Templates**
   ```typescript
   // ❌ WRONG - Fails to match Windows templates
   content.replace('// Header\n', replacement);
   
   // ✅ CORRECT - Use \r\n for Windows
   content.replace('// Header\r\n', replacement);
   ```

2. **MikroC Makefile Quoting (160+ second bug)**
   ```makefile
   # ❌ WRONG - Batch quoted string (160+ sec builds)
   SRCS = "Main.c Config.c Stepper.c"
   
   # ✅ CORRECT - Each file individually quoted
   SRCS = \"Main.c\" \"Config.c\" \"Stepper.c\"
   
   # ✅ Split quotes across variable definition
   MIKROC_PATH ?= \"C:\\Program Files\\mikroC PRO for PIC32
   MIKROC := $(MIKROC_PATH)\\mikroCPIC32.exe\"
   ```

3. **MikroC Compiler Exit Code**
   - `mikroCPIC32.exe` **always returns 0**, even on failure
   - Must check for `.hex` file existence instead of exit code

4. **XC32 Startup Detection**
   ```

5. **XC32 Compiler Detection (Hybrid Approach)**
   ```typescript
   // ✅ CORRECT - Fast common path check first (99% case)
   const commonPaths = [
       'C:/Program Files/Microchip/xc32',
       'C:/Program Files (x86)/Microchip/xc32'
   ];
   
   // ❌ WRONG - Recursive PowerShell search across all drives
   // Times out even with 60s timeout, blocks extension
   Get-PSDrive -PSProvider FileSystem | ForEach-Object { ... }
   ```

6. **DFP (Device Family Pack) Requirements**
   - XC32 v4.0+ requires `-mdfp` flag for all builds
   - Standard location: `C:/Program Files/Microchip/MPLABX/v6.25/packs/Microchip/PIC32MZ-EF_DFP/<version>`
   - Always detect and include in Makefile: `CFLAGS = -mprocessor=$(DEVICE) -mdfp="$(DFP_PATH)" -O2`
   - Guide users to download from `https://packs.download.microchip.com/` if missingtypescript
   // Check linker flags for -nostartfiles (NOT -no-startup-files)
   const usesCrt0 = !ldflags.includes('-nostartfiles');
   ```

## Development Workflow

### Building & Testing
```bash
npm run watch           # Auto-compile TypeScript on save
# Press F5 in VS Code   # Launch Extension Development Host
npm run copy-templates  # After editing src/templates/
```

### Project Structure
```
src/
├── extension.ts          # Entry point, command registration
├── projectImporter.ts    # MPLABX parser (Makefile parsing)
├── mikrocImporter.ts     # MikroC parser (INI parsing, library detection)
├── makefileGenerator.ts  # Cross-platform Makefile generation
├── bootloaderUpdater.ts  # GitHub release checker
├── bundledTools.ts       # Path resolution for bundled tools
└── templates/xc32/       # Project templates (copied to out/)

bin/win32/                # Bundled GNU tools (make.exe, sh.exe, rm.exe)
```

### Metadata Tracking
Projects store metadata in `.vscode/pic32-project.json`:
```typescript
interface ProjectMetadata {
    projectType: 'mplabx' | 'mikroc';
    sourceProject: string;        // Original .X folder path
    device: string;
    imported: string;             // ISO timestamp
    lastSync: string;             // ISO timestamp
    usesBootloader?: boolean;     // true=Flash button, false=Program button, absent=show both
    toolchain: { compiler, compilerPath, dfpPath };
    folders: { mccGenerated, userCode[] };
}
```

## Platform-Specific Behavior

### Windows (Primary Platform)
- PowerShell used for XC32 compiler detection and MikroC builds
- Bundled tools: `make.exe`, `sh.exe`, `rm.exe` in `bin/win32/`
- Path handling: Always forward slashes `/` in Makefiles, backslashes `\` in PowerShell

### Linux Support (TODO markers in code)
- XC32 detection: Search `/opt/microchip/xc32`, `/usr/local/microchip/xc32`
- Remove `.exe` extensions from tool paths
- MikroC: Use Wine or native Linux compiler (if available)

## Adding New Features

### Supporting PIC32MX Devices
See [devices/pic32mx.json](../devices/pic32mx.json) and [devices/pic32mz-ef.json](../devices/pic32mz-ef.json) for device lists. To add devices:

1. Edit the appropriate JSON file in `devices/` directory
2. Follow the schema: `{ label: "32MXXXXX", description: "Memory, features" }`
3. Devices are loaded at runtime via [deviceLoader.ts](../src/deviceLoader.ts)

**Adding New Families (PIC8, PIC16, dsPIC):**
1. Create `devices/pic8.json` (or pic16.json, dspic33.json, etc.)
2. Use same JSON schema: `{ family, description, configBits: [...], devices: [...] }`
3. **configBits** array contains #pragma config lines for XC32/XC16/XC8 projects
4. Device loader automatically picks up all .json files
5. No code changes needed in extension.ts

### Not yet Supporting XC8/XC16 Compilers
1. Update `detectCompilerFamily()` in [projectImporter.ts](../src/projectImporter.ts)
2. Handle compiler-specific flags (XC8 uses different syntax than XC32)
3. Update Makefile templates for 8-bit/16-bit toolchain differences

## Roadmap & Known Issues

**Current Status** (Feb 21, 2026): Active development — Edit Config command added, PBCLK max MHz corrected per datasheet

**Recently Completed** (v2.5.33-v2.5.38):

- **PBCLK Max MHz Per Bus Corrected** (v2.5.38) - Datasheet-verified per-bus speed limits
  - PB1 (System Bus) and PB8 (USB/CAN/Ethernet) correctly allow up to 200 MHz — no longer flagged red
  - PB2–PB5, PB7 remain max 100 MHz (peripheral I/O speed limit)
  - Added **"SYSCLK: X MHz"** info line at top of PBCLK section for reference
  - Confirmed: 24 MHz ÷ 3 × 50 ÷ 2 = 200 MHz SYSCLK default from DS60001320

- **Edit Project Config Command** (v2.5.37) - Open config editor on any existing project
  - Command palette: `XC Project Importer: Edit Project Configuration (Oscillator, PLL, Build Settings)`
  - Reads `.vscode/pic32-project.json` for device + toolchain, pre-populates editor with `config.json`
  - On OK: writes `config.json` + regenerates Makefile with updated heap/stack/optLevel
  - Detects PLL/clock changes and warns about needing `#pragma config` update in source
  - Registered as `pic32-ide.editConfig`

- **Smart Flash/Program Button Visibility** (v2.5.36) - Buttons shown/hidden per project type
  - `usesBootloader: true` in metadata → show Flash (`$(zap)`), hide Program (`$(chip)`)
  - `usesBootloader: false` → hide Flash, show Program
  - No metadata file → show both (unknown project / fresh workspace)
  - MPLABX import sets `usesBootloader: !usesCrt0`; XC32 create sets from user selection

- **Program Device Button via ICSP** (v2.5.35) - New `$(chip) Program` status bar button for direct hardware programming
  - Detects `ipecmd.exe` from any MPLAB X IDE installation automatically (latest version wins)
  - Programmer quick-pick: PICkit 4, PICkit 5, ICD 4, ICD 5, SNAP
  - Device auto-read from `.vscode/pic32-project.json`; manual input fallback
  - ipecmd flags: `-E` (erase) + `-M` (program) via PowerShell `&` call operator
  - Branch **DAP-DEV** created for future custom Debug Adapter Protocol research

- **Build Settings Panel in Config Editor** (v2.5.34) - Right panel now includes editable build parameters
  - Heap Size (bytes, default 4096) — feeds `{{HEAP_SIZE}}` Makefile token
  - Stack Size (bytes, default 4096) — feeds `{{STACK_SIZE}}` Makefile token
  - Optimization Level select (-O0/-O1/-O2/-O3/-Os) — feeds `{{OPT_LEVEL}}` token
  - Build Type radio (Release / ICD Debug) — stored in config.json
  - All values saved in `config.json` under `build:` key and read back by `extension.ts`

- **PIC32MZ EF PBCLK Architecture Corrections** (v2.5.34) - Verified from DFP headers
  - Removed PB6 (register does not exist on EF family — causes compiler error)
  - Added PB8 (USB/CAN/Ethernet, PBDIV=0 → ÷1 → 200 MHz default)
  - PBDIV option labels changed to show raw register values `0 (÷1)` through `7 (÷8)`
  - PBCLK event listeners in `configEditor.js` fixed: loop `[1,2,3,4,5,7,8]` (was wrong `1..6`)
  - Real-time MHz display per bus, red if fractional or >100 MHz for PB2-PB5/PB7

- **Config Editor JS Complete Rewrite** (v2.5.33) - Correct HTML element IDs
  - All element IDs sourced from the real TypeScript template string in `configEditor.ts`
  - Previous `configEditor.html` was a dead file — all HTML lives in `_getHtmlForWebview()`
  - OK button now correctly builds and posts full config including PBCLK and build sections

- **PATH Environment Management** (v2.5.29) - Exact string tracking to prevent duplicates

**Active Branch**: `DAP-DEV` — USB HID Debug Monitor (serial-free live debug over existing bootloader USB link)
**Branch Strategy**: DAP-DEV holds all debug monitor work; merges to master when each milestone ships

**Not Pursuing**: Hardware JTAG/DAP (Microchip already ships `mplab-core-da`); MCC/Harmony code generation

---

## DAP-DEV: USB HID Debug Monitor

### Concept
Keep the USB HID stack alive in the user application (runs in interrupt, zero main-loop cost).
The existing MikroE bootloader USB channel becomes dual-purpose: firmware flashing AND live debug queries.
No serial port, no hardware debugger, no drivers — HID is driverless on Windows.

### Workspace Structure (4 projects)
```
workspace.code-workspace
├── mikroc-bootloader-plugin/   ← VS Code extension (TypeScript)
├── PIC32MZ_Bootloader/         ← MikroC USB HID bootloader source (C)
├── PIC32MX_Bootloader/         ← MikroC USB HID bootloader source (C)
└── mikro_hb/                   ← Host PC flash/debug tool source (C, MinGW)
```

### HID Debug Command Protocol (0xDx namespace — must not collide with bootloader commands)
| Cmd   | Name               | Payload                  | Response                    |
|-------|--------------------|--------------------------|-----------------------------|
| `0xD0`| Ping / identify    | —                        | `0xD0` + firmware version   |
| `0xD1`| Read 32-bit word   | 4-byte address           | 4-byte value                |
| `0xD2`| Read memory block  | address + count          | up to 56 bytes              |
| `0xD3`| Write 32-bit word  | 4-byte addr + 4-byte val | ACK                         |
| `0xD4`| Read watch list    | —                        | up to 10× addr+value pairs  |
| `0xD5`| Set watch list     | 10× addresses            | ACK                         |
| `0xD6`| Reset to bootloader| —                        | (device resets via RSWRST)  |
| `0xD7`| Read CPU status    | —                        | PC, SP, STATUS              |

### PIC32 Debug Stub (shared C library, both MZ and MX)
```c
// Hooks into existing USB HID receive handler — dispatches 0xDx commands
void HID_Debug_Handler(uint8_t *rxBuf, uint8_t *txBuf) {
    switch (rxBuf[0]) {
        case 0xD1: // Read 32-bit word (volatile pointer)
            *(uint32_t*)&txBuf[1] = *(volatile uint32_t*)*(uint32_t*)&rxBuf[1]; break;
        case 0xD6: // Reset to bootloader via RSWRST
            write_bootloader_magic();
            SYSKEY = 0xAA996655; SYSKEY = 0x556699AA;
            RSWRSTSET = _RSWRST_SWRST_MASK; (void)RSWRST; break;
        // ... etc
    }
}
```
- Compile-time flag `DEBUG_STUB_ENABLED` controls inclusion
- Shipped as a template in `src/templates/debug_stub/` — auto-copied to new projects

### VS Code Extension additions (DAP-DEV)
- `node-hid` npm dependency — driverless HID on Windows, no install required
- `hidDebugger.ts` — connect/disconnect, send commands, parse 64-byte HID reports
- `debugPanel.ts` — WebView with:
  - Device connected indicator + firmware version
  - 10-slot watch list (configurable addresses, 500ms auto-poll)
  - SFR quick-access buttons (UART1/SPI1/TMR1/PORTA etc.)
  - Manual memory read (enter address → value)
  - **Reset to Bootloader** one-click button
- `pic32-ide.openDebugPanel` command registered
- `$(debug) Debug` status bar button — appears when HID device detected
- Watch list persisted in `config.json` between sessions

### Build Setup (all C, all using bundled make.exe)
| Project              | Compiler         | Build method                          |
|----------------------|------------------|---------------------------------------|
| PIC32MZ_Bootloader   | MikroC PRO PIC32 | MikroC importer → auto-Makefile       |
| PIC32MX_Bootloader   | MikroC PRO PIC32 | MikroC importer → auto-Makefile       |
| mikro_hb             | MinGW GCC        | tasks.json + bundled make.exe/rm.exe  |
| mikroc-bootloader-plugin | TypeScript/npm | npm run compile (already working)  |

### Phase Plan
- **Phase 1**: All 4 projects building in VS Code
- **Phase 2**: Bootloader USB protocol documented (VID/PID, report size, existing command bytes)
- **Phase 3**: Debug command set finalised — confirm no collisions with bootloader commands
- **Phase 4**: `debug_stub.c` running on MZ hardware, `0xD1` read verified over USB
- **Phase 5**: VS Code debug panel showing live memory reads + Reset to Bootloader
- **Phase 6**: Watch list, SFR browser, session persistence — ship as v2.6.0

### Critical Rules for This Feature
- **Never break normal flashing** — debug commands must be in a namespace the bootloader ignores
- **Interrupt-safe only** — stub runs in USB interrupt context, no blocking, no malloc
- **Opt-in** — `DEBUG_STUB_ENABLED` compile flag; disabled by default in release builds
- **node-hid rebuild** — after adding node-hid, must run `electron-rebuild` for the VS Code runtime
  ```bash
  npm install node-hid
  npx electron-rebuild -v <electron-version> node-hid
  ```

**Common Issues**:
- Template path resolution after `vsce package` - use `context.extensionPath`, not `__dirname`
- MikroC library detection - scan source code, don't rely on project file alone
- MPLABX linker script paths - may be absolute or relative, normalize before copying

---

## APPENDIX: Historical Context (MCC Code Generation - Deprecated)

The sections below document MCC Harmony 3 peripheral code generation that was explored but is **not currently pursued**. Preserved for reference if code generation is revisited.

<details>
<What>What is this?
<summary>Click to expand: XC32 ISR Macros, Timer/GPIO Generation, MCC Folder Structure</summary>
</What>

### XC32 ISR Macro Format
**The __ISR macro REQUIRES <sys/attribs.h> to be included:**
```c
// Correct ISR syntax
void __attribute__((used)) __ISR(_TIMER_1_VECTOR, ipl1SRS) TIMER_1_Handler(void)
{
    TIMER_1_InterruptHandler();
}
```
- IPL must be LOWERCASE: `ipl1SRS`, not `IPL1SRS`
- `__ISR` macro defined in `xc32/pic32m/include/pic32m-libs/sys/attribs.h`

### MCC Harmony 3 Interrupt Architecture (3-layer system)
1. **interrupts.h** - Forward declarations
2. **interrupts.c** - ISR vectors routing to handlers
3. **plib_tmrX.c** - Actual interrupt handlers with callbacks

### MCC Harmony 3 Folder Structure
Each peripheral instance has its own subfolder:
```
peripheral/
├── tmr1/           # Timer1 (Type A)
├── tmr/            # Parent for Timer2-9
│   ├── tmr2/
│   └── tmr3/
└── uart/
    ├── uart1/
    └── uart2/
```

### Timer Peripheral Includes
```c
#include "definitions.h"  // REQUIRED for CPU_CLOCK_FREQUENCY
uint32_t TMR1_FrequencyGet(void) {
    return (CPU_CLOCK_FREQUENCY / 1U);
}
```

### GPIO Initialization (MCC Style)
```c
void GPIO_Initialize(void) {
    LATB = 0x0U;          /* Initial Latch Value */
    TRISBCLR = 0x600U;    /* Direction Control */
    ANSELBCLR = 0xf00U;   /* Digital Mode Enable */
}
```

</details>
