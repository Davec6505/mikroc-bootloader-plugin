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
   - **Flash button**: Creates terminal, calls `mikro_hb.exe` with selected .hex file
   - **PowerShell syntax**: Uses `&` call operator for quoted paths: `& "path/to/make.exe" rebuild`
   - **Makefile rebuild target**: Template includes `rebuild: all` (clean + build)
   - **Environment setup**: Adds bundled bin path to PATH, sets SHELL to bundled sh.exe

### Key Components

- **[bundledTools.ts](../src/bundledTools.ts)**: Provides paths to bundled `make.exe`, `sh.exe`, `rm.exe` (zero external dependencies)
- **[bootloaderUpdater.ts](../src/bootloaderUpdater.ts)**: Auto-checks GitHub releases for `mikro_hb.exe`, downloads to `globalStorageUri` (survives extension updates)
- **[makefileGenerator.ts](../src/makefileGenerator.ts)**: Generates cross-platform Makefiles with proper escaping for paths with spaces
- **[deviceLoader.ts](../src/deviceLoader.ts)**: Loads device definitions from JSON, provides device-specific clock frequencies and config options
- **[configEditor.ts](../src/configEditor.ts)**: Webview provider for oscillator/PLL configuration (new project creation only)

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

**Current Focus** (Jan 19, 2026): Configuration Editor for new project creation

**In Development**:
- **Config Editor Webview** (configEditor.ts) - Oscillator/PLL configuration for new XC32/MikroC projects
  - Compiler-agnostic design: config.json → XC32 #pragma OR MikroC format
  - Only for NEW projects (createXC32Project, createMikroCProject)
  - NOT used for imports (MPLABX/MikroC imports preserve existing config)
  - Real-time clock calculator based on oscillator + PLL settings
  - Device-driven options from JSON (valid PLL ranges, oscillator modes)
  - Mirrors MikroC Project Settings dialog UX

**Next Priority**: Hardware debug support (ICD/PICkit/SNAP integration)

**Not Pursuing**: MCC/Harmony code generation (too complex, 1000+ .ftl templates)

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
