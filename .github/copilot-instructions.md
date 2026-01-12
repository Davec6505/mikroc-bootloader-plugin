# GitHub Copilot Instructions for MikroC Bootloader VS Code Extension

## ⚠️ CRITICAL DEVELOPMENT RULES ⚠️

### **RULE #1: READ BEFORE YOU CODE**
**ALWAYS READ THE ENTIRE PROJECT CONTEXT BEFORE MAKING CHANGES**
- Use `semantic_search` to understand related code
- Use `grep_search` to find all usages of functions you're changing
- Use `read_file` to read adjacent code that might be affected
- **NEVER** assume a change is isolated without verifying

### **RULE #2: VERIFY BEFORE YOU BREAK**
**CHECK THAT YOUR CHANGES DON'T BREAK EXISTING FUNCTIONALITY**
- Read the call sites of functions you're modifying
- Check if other files import/depend on what you're changing
- Test file paths and message passing between frontend/backend
- Verify TypeScript interfaces match JavaScript usage

### **RULE #3: DOCUMENT CRITICAL FINDINGS**
**UPDATE THIS FILE with any critical discoveries about:**
- Line ending issues (CRLF vs LF)
- Template replacement patterns
- ISR macro requirements
- Folder structure requirements
- Interface changes
- MikroC compiler behavior quirks

### **RULE #4: GO SLOWLY AND CAREFULLY**
**ONE CHANGE AT A TIME. VERIFY. THEN NEXT CHANGE.**
- Don't batch multiple unrelated changes
- Compile after each logical change
- Check that existing features still work
- Don't delete code you haven't fully understood

---

## Development Roadmap & Priorities (Jan 11, 2026)

### **Current Focus: XC32 PIC32MX/MZ Import & Debug**

**Priority Order**:

1. **Testing & Validation Phase** (IN PROGRESS)
   - Test MPLABX import with PIC32MX devices
   - Test MPLABX import with PIC32MZ devices
   - Verify bootloader flashing on both families
   - Validate build system with real hardware
   - Ensure bundled tools (make.exe) work correctly
   - Test tasks.json integration (Ctrl+Shift+B)

2. **Hardware Debug Support** (NEXT - After XC32 validation)
   - Integrate ICD/PICkit/SNAP debuggers
   - MPLAB X IPE command-line interface
   - MPLAB X CLI debugging tools
   - OpenOCD (if PIC32 support exists)
   - Generate launch.json for F5 debugging
   - **Goal**: Press F5 to flash and debug directly from VS Code

3. **XC8 Support** (After XC32 is rock-solid)
   - 8-bit PIC (PIC10/12/16/18)
   - AVR microcontrollers
   - Different build system requirements
   - Generally simpler projects than XC32
   - Apply lessons learned from XC32 implementation

4. **MikroC Config Editor** (LOWEST PRIORITY)
   - Restore configEditor.ts webview for new MikroC projects
   - Timer configuration (already worked well)
   - Config bits editor
   - Remove GPIO/Pin Manager and UART sections
   - **Rationale**: MikroC compiler is minimalistic and limited
   - Only when everything else is solid

**Projects NOT Being Pursued**:
- ❌ **MCC/Harmony Project Generation** - Too complex, 1000+ .ftl templates
- ❌ **Direct MCC Integration** - Leave peripheral config to MPLABX IDE
- ✅ **Import Workflow Only** - Let MPLABX handle generation, VS Code handles development

**Current Version**: 2.3.1 (Jan 12, 2026)
- ✅ tasks.json auto-generation for MPLABX projects
- ✅ Bundled make.exe/sh.exe/rm.exe (zero external dependencies)
- ✅ Bootloader auto-update from GitHub
- ✅ Enhanced Makefile help section
- ✅ **NEW: Create XC32 Project from template** (Jan 12, 2026)
  - Unified "XC32 Project Importer" command with Import/Create options
  - Device selection dropdown with 12 PIC32MZ chips
  - Auto-detects XC32 compiler across all drives (PowerShell dynamic search)
  - Generates main.c, Makefile with quoted paths, tasks.json, README
  - Prepared for Linux cross-platform support (TODO markers in code)

---

## Project Overview
This is a VS Code extension for PIC32 microcontrollers that provides **two distinct workflows**:

### 1. **New XC32-MikroC Project** (Generation ONLY)
- Webview UI for project configuration (configEditor.ts)
- Configuration bit editor with visual UI
- Timer peripheral configuration
- **NO GPIO/Pin Manager** in UI (library-driven, user adds -Llib paths manually)
- **NO UART** in UI (user adds manually later if needed)
- Generates complete project from scratch with flat structure
- Uses existing configEditor.ts (needs GPIO/UART sections removed)
- **MikroC projects are generated from scratch only - NO import workflow**

### 2. **Import MPLABX Project** (Import ONLY)
- Simple folder selection dialog (no configuration UI)
- Parse MPLABX Makefiles to extract all settings
- Detect `-no-startup-files` flag for CRT0 vs startup.S
- Copy files and organize headers automatically
- Generate Makefiles with detected settings
- MCC Harmony 3 compatible peripheral libraries preserved
- XC32 project with proper folder structure
- **MPLABX projects are imported only - NO generation workflow**

## Critical Technical Findings

### 1. Windows CRLF Line Endings in Template Replacements
**CRITICAL**: Template files use Windows line endings (`\r\n`), not Unix (`\n`).

When doing string replacements in templates:
```typescript
// ❌ WRONG - Will fail to find match
content.replace('// Section: Header\n// ***\n', replacement);

// ✅ CORRECT - Use \r\n for Windows
content.replace('// Section: Header\r\n// ***\r\n', replacement);
```

**Why**: XC32 compiler and MCC generate files with CRLF. String.replace() is byte-exact matching.

### 2. XC32 ISR Macro Format - CRITICAL DISCOVERY
**The __ISR macro REQUIRES <sys/attribs.h> to be included!**

**Correct ISR syntax for interrupts.c:**
```c
// ✅ CORRECT - Works after including <sys/attribs.h> in device.h
void __attribute__((used)) __ISR(_TIMER_1_VECTOR, ipl1SRS) TIMER_1_Handler(void)
{
    TIMER_1_InterruptHandler();
}

// ❌ WRONG - Uppercase IPL causes compilation errors
void __attribute__((used)) __ISR(_TIMER_1_VECTOR, IPL1SRS) TIMER_1_Handler(void)
```

**Rules**:
- device.h MUST include `#include <sys/attribs.h>` where __ISR macro is defined
- IPL must be LOWERCASE: `ipl1SRS`, `ipl7SRS`, `ipl2SOFT`
- `SRS` = auto shadow register set, `SOFT` = manual/software assignment
- `__attribute__((used))` prevents optimization from removing interrupt vectors

**XC32 __ISR Macro Definition** (from xc32/v5.00/pic32m/include/pic32m-libs/sys/attribs.h):
```c
#define __ISR(v,ipl) __attribute__((vector(v), interrupt(ipl), nomips16))
```

### 3. Timer Peripheral Includes - CRITICAL
**Timer source files MUST include definitions.h for CPU_CLOCK_FREQUENCY:**

```c
// ✅ CORRECT includes for plib_tmr1.c
#include "device.h"
#include "plib_tmr1.h"
#include "interrupts.h"
#include "definitions.h"  // ← REQUIRED for CPU_CLOCK_FREQUENCY
```

**Frequency constant:**
```c
// ✅ CORRECT
uint32_t TMR1_FrequencyGet(void) {
    return (CPU_CLOCK_FREQUENCY / 1U);  // Defined in definitions.h
}

// ❌ WRONG - SYS_CLK_FREQ does not exist
uint32_t TMR1_FrequencyGet(void) {
    return (SYS_CLK_FREQ / 1U);
}
```

### 4. MCC Harmony 3 Interrupt Architecture

**Three-layer system** (see MCC_INTERRUPT_ARCHITECTURE.md):

1. **interrupts.h** - Forward declarations
   ```c
   void TIMER_1_InterruptHandler( void );
   void UART1_InterruptHandler( void );
   ```

2. **interrupts.c** - ISR vectors that route to handlers
   ```c
   void __ISR(_TIMER_1_VECTOR, ipl1SRS) TIMER_1_Handler(void)
   {
       TIMER_1_InterruptHandler();
   }
   
   void __ISR(_UART1_RX_VECTOR, ipl1SRS) UART_1_RX_Handler(void)
   {
       UART1_InterruptHandler();
   }
   ```

3. **plib_tmrX.c / plib_uartX.c** - Actual interrupt handlers with callbacks
   ```c
   void TIMER_1_InterruptHandler(void)
   {
       // Clear flag, call user callback
   }
   ```

**Why**: Separation of concerns - ISR vectors (system) vs handler logic (peripheral library).

### 5. MCC Harmony 3 Folder Structure - CRITICAL (Dec 17, 2025)
**Each peripheral instance MUST have its own subfolder:**

```
peripheral/
├── tmr1/                      ← Timer1 special (Type A)
│   ├── plib_tmr1.h
│   ├── plib_tmr1.c
│   └── plib_tmr1_common.h     ← Common header at instance level
├── tmr/                       ← Parent for Timer2-9
│   ├── plib_tmr_common.h      ← Common header at parent level
│   ├── tmr2/                  ← Instance subfolder
│   │   ├── plib_tmr2.h
│   │   └── plib_tmr2.c
│   └── tmr3/
│       ├── plib_tmr3.h
│       └── plib_tmr3.c
└── uart/                      ← Parent for all UARTs
    ├── plib_uart_common.h     ← Common header at parent level
    ├── uart1/                 ← Instance subfolder
    │   ├── plib_uart1.h
    │   └── plib_uart1.c
    └── uart2/
        ├── plib_uart2.h
        └── plib_uart2.c
```

**Include path format:**
```c
// ✅ CORRECT - Include paths with subfolders
#include "peripheral/tmr1/plib_tmr1.h"
#include "peripheral/tmr/tmr2/plib_tmr2.h"
#include "peripheral/uart/uart1/plib_uart1.h"

// ❌ WRONG - Flat structure
#include "peripheral/tmr/plib_tmr2.h"
#include "peripheral/uart/plib_uart1.h"
```

### 6. Conditional Peripheral Generation - CRITICAL (Dec 17, 2025)
**Only generate peripheral files when configured by user:**

```typescript
// ✅ CORRECT - Check for configuration before generating
if (timerConfigurations && timerConfigurations.length > 0) {
    // Generate timer files
    for (const timerConfig of timerConfigurations) {
        // Create peripheral/tmr/tmr{N}/ folder
        // Generate plib_tmr{N}.h/c files
    }
    // Generate common header at parent level
}

// Same pattern for UARTs
if (uartConfigurations && uartConfigurations.length > 0) {
    // Generate UART files
}
```

**Why**: Prevents empty folders and unused code. User explicitly configures peripherals in UI.

### 7. Multi-Peripheral Configuration - CRITICAL (Dec 17, 2025)
**UI supports configuring multiple peripherals of the same type:**

**Timer UI Pattern:**
1. User selects timer (Timer1, Timer2/3 32-bit, etc.)
2. Configures period, prescaler, priority
3. Clicks "Calculate" to verify settings
4. Clicks "Add Timer to Project" → adds to configuredTimers array
5. Can configure additional timers with different settings
6. All configured timers passed to backend as array

**Backend receives:**
```typescript
timerConfigurations: TimerConfiguration[] = [
    { timer: '1', prescaler: 8, prValue: 25000, ... },
    { timer: '23', prescaler: 64, prValue: 15625, ... }  // 32-bit Timer2/3
]
```

**Project Generator:**
```typescript
if (timerConfigurations && timerConfigurations.length > 0) {
    for (const timerConfig of timerConfigurations) {
        // Generate each timer's files in its own subfolder
        // peripheral/tmr1/, peripheral/tmr/tmr2/, etc.
    }
}
```

**Same pattern for UART** (to be implemented):
- Multiple UARTs configurable
- Each with different baud rates, modes (blocking/non-blocking/ring-buffer)
- All passed as array to backend

### 8. Dual Workflow Architecture - CRITICAL (Dec 21, 2025)
**Extension supports TWO distinct project workflows:**

**Workflow 1: Generate New XC32-MikroC Project**
- User creates project from scratch using webview UI
- Configure: Config bits + Timer peripherals ONLY
- **NO GPIO/Pin Manager** (MikroC is library-driven with -Llib paths)
- **NO UART** (user adds manually to generated code if needed)
- Generates flat MikroC-style folder structure
- Uses configEditor.ts webview panel (needs simplification)

**Workflow 2: Import MPLABX Project**
- User selects existing MPLABX .X folder
- NO configuration UI needed (uses MPLABX settings)
- Parse Makefiles for toolchain paths, device, flags
- Detect CRT0 vs startup.S from `-no-startup-files` flag
- Copy files, organize headers, generate build system
- Preserves MCC Harmony 3 structure (srcs/config/default/)

**Initial Template Selection:**
Extension should present choice:
1. "New XC32-MikroC Project" → Opens webview UI
2. "Import MPLABX Project" → Opens folder selection dialog

**TODO: Simplify configEditor.ts for MikroC workflow**
- Remove Pin Manager / GPIO configuration tab
- Remove UART configuration tab
- Keep only: Config bits + Timer configuration + Heap size
- Remove from ConfigResult: `pinConfigurations`, `uartConfigurations`
- MikroC projects are library-driven - user adds `-Llib` paths manually

### 9. CRT0 vs Startup.S Detection - CRITICAL (Dec 21, 2025)
**MPLABX projects may use either:**
- **CRT0** (default): Standard Microchip startup code (`crt0.o`)
- **Custom startup.S**: User-provided assembly startup file

**Detection method** in `Makefile-default.mk`:
```makefile
# Project using custom startup.S
${MP_CC} ... -nostartfiles -o ${DISTDIR}/...

# Project using CRT0 (flag absent)
${MP_CC} ... -o ${DISTDIR}/...  # No -nostartfiles
```

**IMPORTANT**: XC32 uses `-nostartfiles` flag (single word), NOT `-no-startup-files`.

**Import behavior:**
- Parse linker commands for `-nostartfiles` flag
- If present: `usesCrt0 = false` → Generate startup.S in project
- If absent: `usesCrt0 = true` → Linker uses crt0.o automatically

**ProjectInfo interface:**
```typescript
usesCrt0?: boolean;  // true = crt0.o, false = startup.S
```

### 10. Bootloader Auto-Update System - CRITICAL (Dec 22, 2025)
**Extension automatically checks for mikro_hb.exe updates from GitHub:**

**Architecture:**
```typescript
// src/bootloaderUpdater.ts - Main update logic
export class BootloaderUpdater {
    async checkAndUpdate(): Promise<void>  // Checks once per 24 hours
    getBootloaderPath(): string | null     // Returns downloaded or bundled version
    forceCheckForUpdates(): Promise<void>  // Manual update trigger
}

// src/bundledTools.ts - Path resolution with updater support
export class BundledToolsManager {
    setBootloaderUpdater(updater: BootloaderUpdater): void
    getBootloaderPath(): string | null  // Prefers downloaded, falls back to bundled
}

// src/extension.ts - Integration
bootloaderUpdater = new BootloaderUpdater(context, process.platform);
bundledTools.setBootloaderUpdater(bootloaderUpdater);
bootloaderUpdater.checkAndUpdate();  // Non-blocking background check on activation
```

**GitHub Releases Integration:**
- Checks: `https://api.github.com/repos/Davec6505/MikroC_bootloader/releases/latest`
- Downloads: `mikro_hb.exe` (Windows) or `mikro_hb` (Linux) from release assets
- Storage: `context.globalStorageUri/bootloader/mikro_hb.exe` (persists across extension updates)
- Versioning: Uses semantic versioning (v1.0.0 format), stored in globalState
- Frequency: Once per 24 hours max (cached timestamp)
- UI: Progress notification during download, success notification on completion

**Path Resolution Priority:**
1. **Downloaded version** (globalStorageUri) - Latest from GitHub
2. **Bundled version** (extensionPath/bin/win32/) - Fallback if download fails

**Commands:**
- `pic32-ide.updateBootloader` - Manual update check (bypasses 24-hour cache)
- Integrated into flash command via `bundledTools.getBootloaderPath()`

**Error Handling:**
- Silent failures (no user notification on check errors)
- Console logging for debugging
- Automatic fallback to bundled version
- Graceful 404 handling (no releases yet)
- 10-second timeout on HTTP requests

**Prerequisites for Bootloader Repo:**
- Create GitHub Releases with version tags (v1.0.0, v1.1.0, etc.)
- Attach `mikro_hb.exe` (Windows) and `mikro_hb` (Linux) as release assets
- Optional: Add release notes describing changes

**Why Global Storage:**
- Survives extension updates (unlike extensionPath)
- Shared across all workspaces
- User doesn't lose downloaded updates when extension is updated

### 11. XC32 Project Creation Feature - NEW (Jan 12, 2026)
**Unified workflow with Import/Create options:**

**Command**: "XC32 Project Importer" (Ctrl+Shift+P)
- Shows Quick Pick menu:
  - 📁 Import Existing MPLABX Project
  - 📄 Create New XC32 Project

**Create Project Workflow**:
1. User enters project name (validated: alphanumeric, underscore, hyphen only)
2. Selects device from dropdown (12 PIC32MZ chips)
3. Extension auto-detects XC32 compiler using PowerShell:
   ```powershell
   Get-PSDrive | Search all drives for "Program Files/Microchip/xc32/v*"
   Finds latest version automatically
   ```
4. User selects output folder
5. Generates:
   - `srcs/main.c` - LED blink template with config bits
   - `Makefile` - Auto-detected XC32 path, quoted for spaces
   - `.vscode/tasks.json` - Ctrl+Shift+B build integration
   - `README.md` - Project instructions

**XC32 Compiler Detection**:
- Dynamic PowerShell search across all drives (C:, D:, etc.)
- Searches: `Program Files` and `Program Files (x86)`
- Finds latest version (e.g., v4.45, v5.00)
- Returns: `C:/Program Files/Microchip/xc32/v4.45`
- If not found: Warns user, generates template Makefile

**Makefile Path Handling**:
```makefile
# CRITICAL: Quote all tool paths for spaces
CC = "$(COMPILER_BIN)/xc32-gcc.exe"
LD = "$(COMPILER_BIN)/xc32-gcc.exe"
OBJCOPY = "$(COMPILER_BIN)/xc32-bin2hex.exe"
```

**Device Dropdown**:
- 12 PIC32MZ devices with descriptions
- Format: `{ label: '32MZ2048EFH100', description: '2MB Flash, 512KB RAM, 100-pin' }`
- Searchable and filterable
- Easy to expand with PIC32MX later

**MikroC Create Project**:
- Similar workflow (flat folder structure)
- Device prefixed with 'P' (P32MZ...)
- MikroC-specific template

**Linux Support**:
- Code has TODO markers for cross-platform support
- Windows-focused for now
- Will add Linux detection later:
  - Search `/opt/microchip/xc32`, `/usr/local/microchip/xc32`
  - No `.exe` extensions

### 11. XC32 Project Creation Feature - NEW (Jan 12, 2026)
**Unified workflow with Import/Create options:**

**Command**: "XC32 Project Importer" (Ctrl+Shift+P)
- Shows Quick Pick menu:
  - 📁 Import Existing MPLABX Project
  - 📄 Create New XC32 Project

**Create Project Workflow**:
1. User enters project name (validated: alphanumeric, underscore, hyphen only)
2. Selects device from dropdown (12 PIC32MZ chips)
3. Extension auto-detects XC32 compiler using PowerShell:
   ```powershell
   Get-PSDrive | Search all drives for "Program Files/Microchip/xc32/v*"
   Finds latest version automatically across C:, D:, etc.
   ```
4. User selects output folder
5. Generates:
   - `srcs/main.c` - LED blink template with config bits
   - `Makefile` - Auto-detected XC32 path, quoted for spaces
   - `.vscode/tasks.json` - Ctrl+Shift+B build integration
   - `README.md` - Project instructions

**XC32 Compiler Detection**:
- Dynamic PowerShell search across all drives (C:, D:, etc.)
- Searches: `Program Files` and `Program Files (x86)`
- Finds latest version (e.g., v4.45, v5.00)
- Returns: `C:/Program Files/Microchip/xc32/v4.45`
- If not found: Warns user, generates template Makefile

**Makefile Path Handling - CRITICAL**:
```makefile
# Quote all tool paths for spaces
CC = "$(COMPILER_BIN)/xc32-gcc.exe"
LD = "$(COMPILER_BIN)/xc32-gcc.exe"
OBJCOPY = "$(COMPILER_BIN)/xc32-bin2hex.exe"
```
**Why**: Paths like `C:/Program Files/Microchip/xc32` contain spaces and will fail without quotes.

**Device Dropdown**:
- 12 PIC32MZ devices with descriptions
- Format: `{ label: '32MZ2048EFH100', description: '2MB Flash, 512KB RAM, 100-pin' }`
- Includes: EFH, EFM, EFE, EFN variants (64, 100, 124, 144-pin packages)
- Searchable and filterable
- Easy to expand with PIC32MX later

**MikroC Create Project**:
- Similar workflow (flat folder structure)
- Device prefixed with 'P' (P32MZ...)
- MikroC-specific template

**Linux Support**:
- Code has TODO markers for cross-platform support
- Windows-focused for now
- Will add Linux detection later:
  - Search `/opt/microchip/xc32`, `/usr/local/microchip/xc32`
  - No `.exe` extensions

### 12. MikroC Compiler Exit Code Quirk - CRITICAL (Dec 22-23, 2025)
**mikroCPIC32.exe ALWAYS returns exit code 0, even when compilation fails!**

**Solution**: Check for hex file existence instead of compiler exit code.

**PowerShell Call Operator with Escaped Quotes - CRITICAL (Dec 23, 2025)**:
The 160+ second slowdown was caused by incorrect quoting. MikroC requires **every file/library/pld to be individually quoted**, except flags.

**✅ CORRECT Pattern** (2-5 second builds):
```makefile
# Compiler path - opening quote at start
MIKROC_PATH ?= \"C:\\Users\\Public\\Documents\\Mikroelektronika\\mikroC PRO for PIC32
# Compiler executable - closing quote at end, use := for immediate expansion
MIKROC := $(MIKROC_PATH)\\mikroCPIC32.exe\"

# Each source file individually quoted with escaped quotes
SRCS = \"Main.c\" \"Config.c\" \"Stepper.c\"

# Each library individually quoted
LIBS = \"__Lib_CP0.emcl\" \"__Lib_Math.emcl\"

# PLD files quoted
PLDS = \"DEFINES.pld\"

# Flags have embedded quotes where needed, not wrapped
FLAGS = -MSF -DBG -pP32MZ2048EFH100 -N\"Project.mcp32\" -SP\"path\\\"

# Build target - simple variable expansion
all:
\t@powershell -Command "& $(MIKROC) $(FLAGS) $(SRCS) $(LIBS) $(PLDS)"
```

**Why This Works**:
1. Opening quote in `MIKROC_PATH` variable definition
2. Closing quote in `MIKROC` variable assignment (after .exe)
3. Using `:=` for immediate expansion of MIKROC (not `=`)
4. Each source/lib/pld file wrapped in escaped quotes `\"`
5. Variables expand with quotes intact when used
6. PowerShell's `&` call operator handles the quoted path correctly

**❌ WRONG Patterns**:
```makefile
# Don't use quotes around variable expansion
MIKROC = "$(MIKROC_PATH)/mikroCPIC32.exe"  # Creates nested quotes!
@cmd /c $(MIKROC) ...  # 160+ second slowdown

# Don't quote the entire file list
SRCS = "Main.c Config.c"  # Wrong - should be individual quotes

# Don't use single quotes in Makefile variables
MIKROC = '$(MIKROC_PATH)/mikroCPIC32.exe'  # Wrong shell syntax
```

**Bug Fixed**:
- mikrocImporter.ts had duplicated `all:` target definition
- Makefile always printed "Build complete!" even on failure
- No error checking mechanism for actual compilation success
- PPS library regex had escaped backslash `/(\\d+)$/` instead of `/(\d+)$/`
- Missing system libraries - now detects by scanning source code for function usage

**Library Detection**:
The plugin scans all source/header files for function calls and maps them to required libraries:
- `delay_ms()`, `Delay_us()` → `__Lib_Delays.emcl`
- `sprintf()`, `snprintf()` → `__Lib_Sprintf_EF.emcl`
- `DMA_`, `SoftReset()` → `__Lib_SoftResetDma.emcl`
- `sqrt()`, `sin()`, `cos()` → `__Lib_Math.emcl`
- `strcpy()`, `strcmp()` → `__Lib_CString.emcl`
- Plus many more pattern-based detections

**TODO - Library Detection Enhancement**:
MikroC IDE generates a build log that contains the complete list of libraries actually used during compilation. The importer should:
1. Check for existing IDE build log file in project directory
2. Parse log file to extract exact library list used by IDE
3. Use this as the authoritative source for required libraries
4. Fall back to source code scanning if no log exists
5. Need to identify log file format/location after successful IDE build

### 3. Timer Peripheral Code Generation (MCC Style)

**File Structure**:
- Timer1 (Type A): `peripheral/tmr1/plib_tmr1.{h,c}` + `peripheral/tmr1/plib_tmr1_common.h`
- Timer2-9 (Type B): `peripheral/tmr/plib_tmr{2-9}.{h,c}` + `peripheral/tmr/plib_tmr_common.h`

**Key Patterns from Harmony3 .ftl templates**:
```c
// Timer source MUST include definitions.h
#include "device.h"
#include "plib_tmr1.h"
#include "interrupts.h"
#include "definitions.h"  // ← CRITICAL for CPU_CLOCK_FREQUENCY

// Use volatile timer objects
static volatile TMR1_TIMER_OBJECT tmr1Obj;

// Use SETbit registers, not direct assignment
T1CONSET = _T1CON_ON_MASK;  // ✅ CORRECT
T1CON |= _T1CON_ON_MASK;    // ❌ Avoid (RMW issue)

// Initialize status to 0U explicitly  
tmr1Obj.timer1Status = 0U;

// Use callback_fn field name (not callback)
if (tmr1Obj.callback_fn != NULL) {
    tmr1Obj.callback_fn(tmr1Obj.context);
}

// FrequencyGet returns CPU_CLOCK_FREQUENCY (not SYS_CLK_FREQ)
uint32_t TMR1_FrequencyGet(void) {
    return (CPU_CLOCK_FREQUENCY);  // From definitions.h, matches clock frequency
}
```

**Harmony3 Template Reference**: 
- Source: `Harmony3/csp/peripheral/tmr1_02141/templates/plib_tmr1.c.ftl`
- Header: `Harmony3/csp/peripheral/tmr1_02141/templates/plib_tmr1.h.ftl`
- Interrupts: `Harmony3/csp/arch/templates/interrupts_xc32_mips.c.ftl`

### 5. GPIO Peripheral Complete Implementation

**Must include ALL MCC features** (not just pin macros):

```c
// Pin macros with GetLatch
#define LED1_Set()        (LATBSET = (1U<<9))
#define LED1_GetLatch()   ((LATB >> 9) & 0x1U)  // ← Often forgotten
#define LED1_PIN          GPIO_PIN_RB9          // ← Pin constant

// GPIO_PIN enumeration (ALL pins, not just configured)
#define GPIO_PIN_RB0   (0U)
#define GPIO_PIN_RB1   (1U)
// ... all pins
typedef uint32_t GPIO_PIN;

// Port-level functions (in .c file)
uint32_t GPIO_PortRead(GPIO_PORT port);
void GPIO_PortWrite(GPIO_PORT port, uint32_t mask, uint32_t value);
uint32_t GPIO_PortLatchRead(GPIO_PORT port);
void GPIO_PortSet/Clear/Toggle/InputEnable/OutputEnable(...);

// Pin-level inline helpers (in .h file)
static inline bool GPIO_PinRead(GPIO_PIN pin);
static inline void GPIO_PinWrite(GPIO_PIN pin, bool value);
static inline bool GPIO_PinLatchRead(GPIO_PIN pin);
```

**GPIO_Initialize format** (MCC style):
```c
void GPIO_Initialize ( void )
{
    /* PORTB Initialization */
    LATB = 0x0U;          /* Initial Latch Value */
    TRISBCLR = 0x600U;    /* Direction Control */
    ANSELBCLR = 0xf00U;   /* Digital Mode Enable */
    /* PORTC Initialization */
    /* ... all ports commented even if unused ... */
    
    /* PPS Input Remapping */
    /* PPS Output Remapping */
}
```

### 6. TypeScript String Template Formatting

When generating C code in TypeScript:
```typescript
// ✅ Use template literals for multi-line C code
const code = `
void function(void)
{
    statement;
}
`;

// ✅ Escape backticks and ${} in comments if needed
const code = `/* Cost: \${price} */`;  // Escape $

// ✅ Be careful with line ending consistency
const header = `Line1\r\n`;  // Windows
const body = `Line2\r\n`;    // Match the style
```

## Project Structure Standards

### Required Directories
```
.github/
  copilot-instructions.md  ← This file (ALWAYS create)
  
.vscode/
  tasks.json
  launch.json
  
src/
  extension.ts
  generators/
  devices/
  templates/
```

### Standard Practice for ALL Projects
1. **ALWAYS** create `.github/copilot-instructions.md` at project start
2. Document critical findings as they're discovered
3. Update when debugging reveals platform-specific issues
4. Include code examples showing correct vs incorrect patterns

## Debugging Tips

### Template Replacement Failures
```typescript
// Add debug logging
console.log('Search string:', JSON.stringify(searchStr));
console.log('After replacement, contains marker:', content.includes('MARKER'));

// Check line endings
const hasWindows = content.includes('\r\n');
const hasUnix = content.includes('\n') && !content.includes('\r\n');
console.log(`Line endings: ${hasWindows ? 'CRLF' : hasUnix ? 'LF' : 'Mixed'}`);
```

### Hex Byte Inspection (PowerShell)
```powershell
$bytes = [System.Text.Encoding]::UTF8.GetBytes($snippet);
$bytes | ForEach-Object { Write-Host ("{0:X2}" -f $_) -NoNewline }
```

### Compiler Errors
- ISR format issues → Check uppercase IPL, no extra attributes
- Template expansion → Verify CRLF vs LF
- Missing functions → Check MCC reference for complete API surface

## MCC Harmony 3 Compatibility Checklist

When generating peripheral code:
- [ ] File paths match MCC structure (tmr1/ vs tmr/)
- [ ] Common headers generated when needed
- [ ] Volatile objects used for peripheral state
- [ ] SETbit registers used (not direct assignment)
- [ ] Complete API surface (not subset)
- [ ] MCC copyright headers included
- [ ] Function comments match MCC style
- [ ] Interrupts properly integrated (3-layer architecture)

## Extension Development Notes

- Use `npm run watch` during development
- Press F5 to reload extension after compilation
- Template changes require `npm run copy-templates`
- Test with actual XC32 compilation, not just generation

## References
- **MCC_INTERRUPT_ARCHITECTURE.md** - Detailed interrupt system documentation
- **Blinky_XC32** - Reference MCC project for comparison
- **XC32 Compiler Guide** - ISR macro documentation
