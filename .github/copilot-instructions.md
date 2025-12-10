# GitHub Copilot Instructions for MikroC Bootloader VS Code Extension

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

### 2. XC32 ISR Macro Format
**Correct ISR syntax for interrupts.c:**
```c
// ✅ CORRECT
void __ISR(_TIMER_1_VECTOR, IPL1SRS) TIMER_1_Handler(void)
{
    TIMER_1_InterruptHandler();
}

// ❌ WRONG - Causes compiler errors
void __attribute__((used)) __ISR(_TIMER_1_VECTOR, ipl1SRS) TIMER_1_Handler(void)
```

**Rules**:
- NO `__attribute__((used))` - already included in `__ISR` macro
- IPL must be UPPERCASE: `IPL1SRS`, `IPL7SRS`, `IPL2SOFT`
- `SRS` = auto shadow register set, `SOFT` = manual/software assignment

### 3. MCC Harmony 3 Interrupt Architecture

**Three-layer system** (see MCC_INTERRUPT_ARCHITECTURE.md):

1. **interrupts.h** - Forward declarations
   ```c
   void TIMER_1_InterruptHandler( void );
   ```

2. **interrupts.c** - ISR vectors that route to handlers
   ```c
   void __ISR(_TIMER_1_VECTOR, IPL1SRS) TIMER_1_Handler(void)
   {
       TIMER_1_InterruptHandler();
   }
   ```

3. **plib_tmrX.c** - Actual interrupt handlers with callbacks
   ```c
   void TIMER_1_InterruptHandler(void)
   {
       // Clear flag, call user callback
   }
   ```

**Why**: Separation of concerns - ISR vectors (system) vs handler logic (peripheral library).

### 4. Timer Peripheral Code Generation (MCC Style)

**File Structure**:
- Timer1 (Type A): `peripheral/tmr1/plib_tmr1.{h,c}` + `peripheral/tmr1/plib_tmr1_common.h`
- Timer2-9 (Type B): `peripheral/tmr/plib_tmr{2-9}.{h,c}` + `peripheral/tmr/plib_tmr_common.h`

**Key Patterns**:
```c
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
```

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
