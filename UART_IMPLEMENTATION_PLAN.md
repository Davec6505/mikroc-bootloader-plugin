# UART Peripheral Implementation Plan

## ✅ Phase 1: Clock System (PBCLK) - COMPLETED

### Implementation Status

**✅ COMPLETED:**
- `HarmonyClkGenerator` class created (`src/generators/harmonyClkGen.ts`)
- Full PBCLK1-8 configuration support
- PMD (Peripheral Module Disable) configuration
- Integration with XC32 project generator
- Test suite with validation against Blinky_XC32
- **All tests passing** ✅

### Features Implemented

1. **Dynamic PBCLK Configuration**
   - Each PBCLK can be enabled/disabled
   - Configurable dividers (1, 2, 4, 8, 16, 32, 64, 128)
   - Automatic frequency calculation
   - PBDIV register value calculation (divider - 1)

2. **Generated Output**
   - `plib_clk.c` - Clock initialization function
   - `plib_clk.h` - Clock interface header
   - Matches MCC Harmony 3 output exactly

3. **Default Configuration** (Matches Blinky_XC32)
   - PBCLK1: 100 MHz (÷2) - OSC2
   - PBCLK2: 50 MHz (÷4) - **UART, SPI, I2C**
   - PBCLK3: 50 MHz (÷4) - **Timers, ADC, CMP**
   - PBCLK4-5: 100 MHz (÷2)
   - PBCLK7: 200 MHz (÷1)

### Test Results

```
✅ All tests passed! Generator output matches expected MCC format.

PBCLK Frequencies:
  PBCLK1: 100000000 Hz (2x divider)
  PBCLK2: 50000000 Hz (4x divider) - UART, SPI, I2C
  PBCLK3: 50000000 Hz (4x divider) - Timers, ADC
  PBCLK4: 100000000 Hz (2x divider)
  PBCLK5: 100000000 Hz (2x divider)
  PBCLK7: 200000000 Hz (1x divider)

✓ PB2DIV configuration correct
✓ PB3DIV configuration correct
✓ PMD1 configuration correct
✓ SYSKEY unlock/lock present
✓ PMDLOCK configuration correct
```

### Integration

Clock generator is now integrated into `xc32ProjectGen.ts`:
```typescript
const clkGenerator = new HarmonyClkGenerator('');
const clkConfig = HarmonyClkGenerator.getDefaultConfig();
clkConfig.cpuClockFrequency = systemClock * 1000000;
const pmdConfig = HarmonyClkGenerator.getDefaultPMDConfig();
const clkFiles = clkGenerator.generate(clkConfig, pmdConfig);
```

### API Usage

```typescript
import { HarmonyClkGenerator, ClkConfig, PMDConfig } from './harmonyClkGen';

// Get default configuration
const config = HarmonyClkGenerator.getDefaultConfig();
const pmdConfig = HarmonyClkGenerator.getDefaultPMDConfig();

// Customize for specific needs
config.pbclk2.divider = 4;  // 50 MHz for UART
config.pbclk4.enabled = false;  // Disable unused peripheral bus

// Generate files
const generator = new HarmonyClkGenerator('');
const files = generator.generate(config, pmdConfig);

// Write to disk
generator.writeFiles(outputDir, config, pmdConfig);

// Calculate frequency
const freq = generator.calculatePBCLKFrequency(200000000, 4);  // 50 MHz
```

---

## ✅ Phase 2: UART Generator - COMPLETED

### Implementation Status

**✅ COMPLETED:**
- `HarmonyUartGenerator` class created (`src/generators/harmonyUartGen.ts`)
- Baud rate calculation with error checking
- Template processing with FreeMarker syntax support
- Interrupt vector generation
- Test suite with comprehensive validation
- **All tests passing** ✅

### Features Implemented

1. **UART Configuration**
   - Operating modes: Blocking, Non-blocking, Ring buffer
   - Stop bits: 1 or 2
   - Parity/Data: 8N, 9N, 8O, 8E
   - High-Speed (4x) or Standard (16x) baud clock
   - UEN pin configurations (0-3)
   - Configurable baud rates with error calculation

2. **Baud Rate Calculation**
   - Accurate BRG value computation
   - Actual baud rate calculation
   - Error percentage (validates <2%)
   - Tested baud rates: 9600 - 460800 bps

3. **Generated Code**
   - `plib_uartX.c` - UART peripheral implementation
   - `plib_uartX.h` - UART interface header
   - `plib_uart_common.h` - Common UART definitions
   - Interrupt declarations for `interrupts.h`
   - ISR vectors for `interrupts.c`

### Test Results

```
✅ All tests passed! UART generator is ready.

Baud Rate  | BRG Value | Actual Baud | Error %
-----------|-----------|-------------|----------
      9600 | 0x    515 |     9600.61 |   0.0064 ✓
     19200 | 0x    28A |    19201.23 |   0.0064 ✓
     38400 | 0x    145 |    38343.56 |  -0.1470 ✓
     57600 | 0x     D8 |    57603.69 |   0.0064 ✓
    115200 | 0x     6C |   114678.90 |  -0.4523 ✓
    230400 | 0x     35 |   231481.48 |   0.4694 ✓
    460800 | 0x     1A |   462962.96 |   0.4694 ✓

✓ Baud rate error within acceptable range (<2%)
✓ BRG calculation correct
✓ Interrupt declarations present
✓ ISR vectors correct format
```

### API Usage

```typescript
import { HarmonyUartGenerator, UartConfig } from './harmonyUartGen';

// Get default configuration for UART1 with 50 MHz PBCLK2
const config = HarmonyUartGenerator.getDefaultConfig(1, 50000000);

// Customize configuration
config.baudRate = 115200;
config.operatingMode = 'non-blocking';
config.stopBits = 1;
config.parityAndData = '8N';
config.highBaudRate = true;  // High-Speed mode (4x)

// Create generator
const templateDir = path.join(__dirname, '..', 'templates');
const generator = new HarmonyUartGenerator(templateDir);

// Calculate baud rate parameters
const baudResult = generator.calculateBaudRate(config);
console.log(`BRG: 0x${baudResult.brgValue.toString(16)}`);
console.log(`Error: ${baudResult.errorPercent.toFixed(4)}%`);

// Generate files
const files = generator.generate(config);
// files.header, files.source, files.commonHeader

// Generate interrupt code
const intDecl = generator.generateInterruptDeclarations(config);
const intVectors = generator.generateInterruptVectors(config);

// Write to disk
generator.writeFiles(outputDir, config);
```

### FreeMarker Template Processing

The generator handles:
- Variable substitution: `${UART_INSTANCE_NAME}` → `UART1`
- Modifiers: `${UART_INSTANCE_NAME?lower_case}` → `uart1`
- Conditionals: `<#if condition>...</#if>`
- Else blocks: `<#if>...<#else>...</#if>`

### Integration Ready

UART generator is ready to integrate into `xc32ProjectGen.ts` alongside the clock generator!

---

## ⏳ Phase 3: UI Implementation (Next)

### Why PBCLK First?
- UART baud rate calculation requires accurate PBCLK2 frequency
- All peripherals depend on their respective PBCLK
- Must be configured before any peripheral

### PBCLK Configuration Details

From MCC screenshots and `plib_clk.c`:

**PIC32MZ has 8 Peripheral Bus Clocks:**
1. **PBCLK1** (100 MHz) - Feeds OSC2, default divider = 2
2. **PBCLK2** (50 MHz) - Feeds **UART, SPI, I2C** - divider = 4
3. **PBCLK3** (50 MHz) - Feeds **Timers, ADC, CMP, OC, IC** - divider = 4
4. **PBCLK4** - divider = 2 (default)
5. **PBCLK5** - divider = 2 (default)
6. **PBCLK6** - divider = 2 (default, may not exist on all devices)
7. **PBCLK7** - divider = 1 (default)
8. **PBCLK8** - divider = 2 (default, may not exist on all devices)

### PBCLK UI Requirements

For each PBCLK:
- **Enable/Disable** checkbox
- **Divider** dropdown (1, 2, 4, 8, 16, 32, 64, 128)
- **Resulting Frequency** (readonly, calculated from System Clock / divider)
- **Peripherals Using This Clock** (readonly label)

### PBCLK Code Generation

Template: `src/templates/mz/clk/plib_clk.c.template`

```c
void CLK_Initialize( void )
{
    /* unlock system for clock configuration */
    SYSKEY = 0x00000000U;
    SYSKEY = 0xAA996655U;
    SYSKEY = 0x556699AAU;

    /* Peripheral Module Disable Configuration */
    CFGCONbits.PMDLOCK = 0;
    
    ${PMD_REGISTERS}  // PMD1-PMD7 values
    
    CFGCONbits.PMDLOCK = 1;

    ${PBCLK_CONFIGURATION}  // PBxDIVbits.PBDIV settings
    
    /* Lock system */
    SYSKEY = 0x33333333U;
}
```

### PBCLK Placeholders

- `${CPU_CLOCK_FREQUENCY}` - System clock (e.g., 200000000)
- `${CONFIG_SYS_CLK_PBCLK1_ENABLE}` - true/false
- `${CONFIG_SYS_CLK_PBDIV1}` - Divider value (1,2,4,8,16,32,64,128)
- ... repeat for PBCLK2-8
- `${PBREGNAME1}` - PB1DIV (register name)
- ... repeat for PB2DIV-PB8DIV

## Phase 2: UART Configuration UI

### UI Layout (Matching MCC)

```
┌─────────────────────────────────────────────────────────────────┐
│ UART1                                                     [×]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Operating Mode             [ Non-blocking mode      ▼ ]       │
│                             └─ Blocking mode                    │
│                             └─ Non-blocking mode                │
│                             └─ Ring buffer mode                 │
│                                                                 │
│  Stop Selection bit         [ 1 Stop bit             ▼ ]       │
│                             └─ 1 Stop bit                       │
│                             └─ 2 Stop bits                      │
│                                                                 │
│  Parity and Data Selection  [ 8-bit data, no parity ▼ ]       │
│                             └─ 9-bit data, no parity            │
│                             └─ 8-bit data, odd parity           │
│                             └─ 8-bit data, even parity          │
│                             └─ 8-bit data, no parity            │
│                                                                 │
│  High Baud Rate Enable bit  [ High-Speed mode 4x... ▼ ]       │
│                             └─ High-Speed mode 4x (BRGH=1)      │
│                             └─ Standard Speed mode 16x (BRGH=0) │
│                                                                 │
│  UARTx Enable bits          [ UxTX and UxRX pins... ▼ ]       │
│                             └─ UxTX, UxRX, UxBCLK pins...       │
│                             └─ UxTX, UxRX, UxCTS, UxRTS pins... │
│                             └─ UxTX, UxRX, UxRTS pins...        │
│                             └─ UxTX and UxRX pins...            │
│                                                                 │
│  Clock Frequency            [ 50,000,000           ] Hz        │
│                             (from PBCLK2, readonly)             │
│                                                                 │
│  Baud Rate                  [ 115200               ] bps       │
│                                                                 │
│  *** Baud Error = -0.4531 % ***                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### UART Configuration Data

```typescript
interface UartConfig {
    instanceName: string;       // "UART1", "UART2", etc.
    instanceNum: number;        // 1, 2, 3, etc.
    operatingMode: 'blocking' | 'non-blocking' | 'ring-buffer';
    stopBits: 1 | 2;
    parityAndData: '8N' | '9N' | '8O' | '8E';
    highBaudRate: boolean;      // true = 4x, false = 16x
    uenSelect: number;          // 0-3 for different pin configurations
    baudRate: number;           // e.g., 115200
    clockFreq: number;          // From PBCLK2
}
```

### Baud Rate Calculation

```typescript
function calculateBaudRate(config: UartConfig): {
    brgValue: number;
    actualBaud: number;
    error: number;
} {
    const divisor = config.highBaudRate ? 4 : 16;
    const brgValue = Math.round((config.clockFreq / (divisor * config.baudRate)) - 1);
    const actualBaud = config.clockFreq / (divisor * (brgValue + 1));
    const error = ((actualBaud - config.baudRate) / config.baudRate) * 100;
    
    return { brgValue, actualBaud, error };
}
```

### UART Template Placeholders

From `plib_uart.c.ftl`:
- `${UART_INSTANCE_NAME}` → UART1
- `${UART_INSTANCE_NUM}` → 1
- `${UART_CLOCK_FREQ}` → 50000000
- `${BRG_VALUE}` → calculated BRG value (e.g., 0x108)
- `${UMODE_VALUE}` → UxMODE register value
- `${UART_STOPBIT_SELECT}` → 0 or 1
- `${UART_PDBIT_SELECT}` → 0, 2, or 4
- `${UART_UEN_SELECT}` → 0-3
- `${UART_BRGH}` → 1 or 0
- `${UART_INTERRUPT_MODE_ENABLE}` → true/false
- `${UART_FAULT_IFS_REG}` → IFS4 (varies by UART instance)
- `${UART_FAULT_IEC_REG}` → IEC4
- `${UART_RX_IFS_REG}` → IFS4
- `${UART_RX_IEC_REG}` → IEC4
- `${UART_TX_IFS_REG}` → IFS4
- `${UART_TX_IEC_REG}` → IEC4
- `${UART_INTERRUPT_COUNT}` → 3 (separate vectors) or 1 (combined)

## Phase 3: Generator Implementation

### File Structure

```typescript
// src/generators/peripherals/mz/UartGenerator.ts
export class UartGenerator {
    generate(config: UartConfig, device: DeviceInfo): GeneratedFiles;
}

// src/generators/peripherals/mz/ClkGenerator.ts
export class ClkGenerator {
    generate(config: ClkConfig, device: DeviceInfo): GeneratedFiles;
}
```

### Integration with Existing System

Update `mikrocProjectGen.ts` to include:
1. Clock configuration (PBCLK setup)
2. UART peripheral generation
3. Interrupt vector generation (interrupts.c/h)

## Phase 4: Testing Strategy

1. **Compare with MCC Output**
   - Generate UART1 with specific settings in MCC
   - Generate same settings with our tool
   - Diff the generated files

2. **Build Test**
   - Use XC32 compiler to verify no errors
   - Check that all register names are correct

3. **Runtime Test**
   - Flash to actual hardware
   - Verify UART communication works
   - Test different baud rates

## Implementation Order

1. ✅ Create template structure (`src/templates/mz/`)
2. ✅ Copy UART templates from Harmony3
3. ⏳ Copy CLK templates from Harmony3
4. ⏳ Create ClkGenerator.ts
5. ⏳ Create UartGenerator.ts
6. ⏳ Create UART UI webview
7. ⏳ Create PBCLK UI section
8. ⏳ Integrate into project generator
9. ⏳ Test against MCC output
10. ⏳ Document usage

## Notes

- **CRITICAL**: PBCLK must be configured before UART
- Baud rate error should be < 2% for reliable communication
- Ring buffer mode requires additional template (plib_uart_ring_buffer.c/h)
- Interrupt mode requires EVIC configuration
- Must update interrupts.c to add UART ISR vectors

## Resources

- Harmony3 templates: `C:\Users\davec\Harmony3\csp\peripheral\`
- PIC32MZ Datasheet: DS60001320
- XC32 Compiler Guide
- MCC Reference project: `Blinky_XC32`
