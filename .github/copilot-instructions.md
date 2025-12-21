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

### **RULE #4: GO SLOWLY AND CAREFULLY**
**ONE CHANGE AT A TIME. VERIFY. THEN NEXT CHANGE.**
- Don't batch multiple unrelated changes
- Compile after each logical change
- Check that existing features still work
- Don't delete code you haven't fully understood

---

## Project Overview
This is a VS Code extension for PIC32MZ microcontrollers that provides:
1. Configuration bit editor with visual UI
2. XC32 project generator with MCC Harmony 3 compatible peripheral libraries
3. MikroC bootloader flash integration

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
