# Pin Manager Design Document

**Status:** ✅ **IMPLEMENTATION COMPLETE**  
**Last Updated:** December 9, 2025  
**Commits:** Phase 1 (fbffbfe), Phase 2 (94703a1), Phase 3 (f7fd530), Phase 4 (017c756, d3221b4)

---

## Implementation Status

### ✅ Phase 1: Data Layer - COMPLETE
- ✅ `src/devices/pic32mz/types.ts` - All TypeScript interfaces defined
- ✅ `src/devices/pic32mz/pinTables.ts` - 100+ GPIO pins across PORTA-PORTK
- ✅ `src/devices/pic32mz/ppsMapping.ts` - Complete PPS input/output tables
- ✅ All 64/100/124/144-pin package mappings
- ✅ 36 analog inputs (AN0-AN35) 
- ✅ 60+ PPS-capable pins with RP numbers

### ✅ Phase 2: UI Development - COMPLETE
- ✅ Pin Manager tab in configEditor.html
- ✅ Pin table with 8 columns (Pin#, ID, Custom Name, Function, Direction, State, Mode, Actions)
- ✅ Filters: GPIO, Analog, PPS, Configured Only
- ✅ Package selection dropdown (64/100/124/144-pin)
- ✅ Pin configuration dialog with 3 modes (GPIO, Analog, Peripheral)
- ✅ Configuration and Remove buttons in table

### ✅ Phase 3: Code Generation - COMPLETE
- ✅ `src/generators/mikrocGpioGen.ts` - mikroC GPIO code with port-wise bitmasks
- ✅ `src/generators/harmonyGpioGen.ts` - MCC-compatible Harmony/XC32 code
- ✅ `src/generators/ppsCodeGen.ts` - PPS initialization with unlock/lock sequences
- ✅ `src/pinManager.ts` - Unified orchestrator class
- ✅ `src/pinManagerIndex.ts` - Export module

### ✅ Phase 4: Extension Integration - COMPLETE
- ✅ Backend: PinManager integrated into ConfigEditor class
- ✅ Backend: Message handlers for getPinTable, setPinConfiguration, removePinConfiguration, changePackage, generatePinCode
- ✅ Backend: Pin configurations exported with ConfigResult for project generation
- ✅ Webview: Connected UI to backend via message passing
- ✅ Webview: Real pin data replaces sample data
- ✅ Webview: Configuration changes sent to backend
- ✅ All TypeScript compiles without errors

### 🔄 Next Steps (Future Enhancements)
- [ ] Integrate pin code generation into XC32/mikroC project generators
- [ ] Add GPIO_Initialize() to generated initialization.c
- [ ] Add PPS_Initialize() to generated initialization.c
- [ ] Create plib_gpio.h/c files in XC32 projects
- [ ] Add conflict detection (same peripheral on multiple pins)
- [ ] Add pin configuration import/export
- [ ] Add "quick assign" templates (UART1 Standard, SPI1 Master, etc.)

---

## Overview
Pin Manager provides a visual interface for configuring GPIO pins and Peripheral Pin Select (PPS) mappings for PIC32MZ devices, similar to MPLAB MCC's Pin Manager.

## Architecture

### 1. Data Sources

#### 1.1 Device Pin Table (from Datasheet Table 1-1)
```typescript
interface DevicePin {
    pinNumber: {
        '64-pin': number | null;
        '100-pin': number | null;
        '124-pin': number | null;
        '144-pin': number | null;
    };
    pinName: string;              // "RB8", "RE5", "MCLR", "VSS", "VDD"
    isPowerPin: boolean;          // true for VSS, VDD, AVSS, AVDD
    bufferType: 'Digital' | 'Analog' | 'TTL' | 'Power';
    defaultFunction: string;      // Primary function
    alternateFunctions: string[]; // ["GPIO", "RP2", "AN8", "SOSCI", "SOSCO"]
    analogChannel?: string;       // "AN0", "AN1", etc.
    rpNumber?: number;            // 2 (for RP2), 14 (for RP14), etc.
    cnNumber?: string;            // "CNB8", "CNE5", etc. (Change Notification)
}
```

**Example:**
```typescript
{
    pinNumber: { '64-pin': 21, '100-pin': 33, '124-pin': null, '144-pin': 48 },
    pinName: 'RB8',
    isPowerPin: false,
    bufferType: 'Digital',
    defaultFunction: 'RB8',
    alternateFunctions: ['GPIO', 'RP8', 'CNB8'],
    rpNumber: 8,
    cnNumber: 'CNB8'
}
```

#### 1.2 PPS Input Mapping (Datasheet Table 12-1)
Maps peripheral input signals to RP pins.

```typescript
interface PPSInputSignal {
    signalName: string;           // "U1RX", "INT3", "T2CK", "IC3", etc.
    registerName: string;         // "U1RXR", "INT3R", "T2CKR", "IC3R"
    description: string;          // "UART1 Receive"
    validRPValues: number[];      // [0-15] representing which RP pins can be mapped
}
```

**Mapping values (from datasheet):**
```
0000 = No Connect
0001 = RPD2
0010 = RPG8
0011 = RPF4
0100 = RPD10
0101 = RPF1
0110 = RPB9
0111 = RPB10
1000 = RPC14
1001 = RPB5
1010 = RPC1
1011 = RPD14
1100 = RPG1
1101 = RPA14
1110 = RPD6
1111 = Reserved
```

#### 1.3 PPS Output Mapping (Datasheet Table 12-2)
Maps RP pins to peripheral output signals.

```typescript
interface PPSOutputPin {
    rpPin: string;                // "RPD2", "RPG8", "RPF4", etc.
    registerName: string;         // "RPD2R", "RPG8R", "RPF4R"
    validPeripherals: PPSOutputValue[];
}

interface PPSOutputValue {
    value: number;                // 0-15
    signalName: string;           // "U1TX", "U2RTS", "OC1", etc.
    description: string;          // "UART1 Transmit"
}
```

**Output mapping values (from datasheet):**
```
0000 = No Connect
0001 = U3TX  (UART3 Transmit)
0010 = U4RTS (UART4 Request to Send)
0011 = SDO1  (SPI1 Data Output)
0100 = SDO2  (SPI2 Data Output)
0101 = OC4   (Output Compare 4)
0110 = OC7   (Output Compare 7)
0111 = REFCLKO3 (Reference Clock Output)
1000 = U1TX  (UART1 Transmit)
... etc
```

### 2. User Configuration Data Structure

```typescript
interface PinConfiguration {
    pinName: string;              // "RB8", "RB9", etc.
    mode: 'GPIO' | 'Analog' | 'Peripheral';
    
    // GPIO configuration
    gpio?: {
        customName?: string;      // "LED1", "SW1", etc.
        direction: 'Input' | 'Output';
        initialState?: 'High' | 'Low';  // For outputs
        pullUp?: boolean;
        pullDown?: boolean;
        openDrain?: boolean;
        changeNotification?: boolean;
        interruptOnChange?: boolean;
    };
    
    // Peripheral configuration (PPS)
    peripheral?: {
        function: string;         // "UART1_RX", "UART1_TX", "SPI1_SDO", etc.
        ppsInputSignal?: string;  // "U1RX" (if this pin receives input)
        ppsOutputSignal?: string; // "U1TX" (if this pin outputs)
    };
    
    // Analog configuration
    analog?: {
        channelName: string;      // "AN8", "AN0", etc.
        enabled: boolean;
    };
}
```

### 3. UI Design

#### 3.1 Pin Manager Tab Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Pin Manager                                                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│ Package: [64-pin QFN ▼]     View: [○ By Pin  ● By Port]                │
│                                                                          │
│ ┌─ Pin Table ───────────────────────────────────────────────────────┐  │
│ │ Pin# │ Pin ID │ Custom Name │ Function      │ Dir │ State │ Mode  │  │
│ ├──────┼────────┼─────────────┼───────────────┼─────┼───────┼───────┤  │
│ │  21  │ RB8    │ LED1        │ GPIO          │ Out │ Low   │ [⚙]  │  │
│ │  22  │ RB9    │ SW1         │ GPIO          │ In  │ n/a   │ [⚙]  │  │
│ │  33  │ RD10   │             │ UART1_RX      │ In  │ n/a   │ [⚙]  │  │
│ │  34  │ RD14   │             │ UART1_TX      │ Out │ n/a   │ [⚙]  │  │
│ │  16  │ AN0    │             │ Analog (AN0)  │ In  │ n/a   │ [⚙]  │  │
│ │   9  │ MCLR   │             │ (Power/Fixed) │ n/a │ n/a   │  -   │  │
│ │   8  │ VDD    │             │ (Power/Fixed) │ n/a │ n/a   │  -   │  │
│ └──────┴────────┴─────────────┴───────────────┴─────┴───────┴───────┘  │
│                                                                          │
│ [Filter: Show GPIO only ☐] [Show Analog ☐] [Show Peripheral ☐]        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 3.2 Pin Configuration Dialog (When clicking ⚙)

```
┌─ Configure Pin: RB8 ──────────────────────────────────┐
│                                                        │
│ Pin Function:                                         │
│   ○ GPIO                                              │
│   ○ Analog (AN8)                                      │
│   ○ Peripheral (PPS)                                  │
│                                                        │
│ ┌─ GPIO Configuration ──────────────────────────────┐ │
│ │ Custom Name: [LED1________________]               │ │
│ │                                                    │ │
│ │ Direction:  ● Output  ○ Input                     │ │
│ │                                                    │ │
│ │ Initial State: ● Low  ○ High                      │ │
│ │                                                    │ │
│ │ Options:                                          │ │
│ │   ☐ Open Drain                                    │ │
│ │   ☐ Pull-up Resistor                              │ │
│ │   ☐ Pull-down Resistor                            │ │
│ │   ☐ Change Notification Interrupt                 │ │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│                    [Cancel]  [OK]                      │
└────────────────────────────────────────────────────────┘
```

#### 3.3 PPS Peripheral Configuration Dialog

```
┌─ Configure Pin: RPD10 (RP10) ─────────────────────────┐
│                                                        │
│ Pin Function: ● Peripheral (PPS)                      │
│                                                        │
│ ┌─ Peripheral Pin Select ───────────────────────────┐ │
│ │                                                    │ │
│ │ Peripheral: [UART1 Receive ▼]                     │ │
│ │                                                    │ │
│ │ Available peripherals for this pin:               │ │
│ │   • UART1 Receive (U1RX)                          │ │
│ │   • UART2 Receive (U2RX)                          │ │
│ │   • Timer2 External Clock (T2CK)                  │ │
│ │   • Input Capture 3 (IC3)                         │ │
│ │   • External Interrupt 3 (INT3)                   │ │
│ │   • SPI1 Data Input (SDI1)                        │ │
│ │                                                    │ │
│ │ ⓘ This configures register: U1RXR = 0x04          │ │
│ │   (Maps RPD10 to UART1 Receive)                   │ │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│                    [Cancel]  [OK]                      │
└────────────────────────────────────────────────────────┘
```

### 4. Generated Code

#### 4.1 mikroC Format

**For GPIO:**
```c
// Pin Definitions
#define LED1_TRIS    TRISBbits.TRISB8
#define LED1_LAT     LATBbits.LATB8
#define LED1_PORT    PORTBbits.RB8
#define LED1_Set()   (LATBSET = (1 << 8))
#define LED1_Clear() (LATBCLR = (1 << 8))
#define LED1_Toggle() (LATBINV = (1 << 8))

#define SW1_TRIS     TRISBbits.TRISB9
#define SW1_PORT     PORTBbits.RB9
#define SW1_Get()    (PORTBbits.RB9)

// GPIO Initialization
void GPIO_Initialize(void) {
    // Configure LED1 (RB8) as output, initial low
    ANSELBCLR = (1 << 8);  // Disable analog
    LATBCLR = (1 << 8);    // Set low
    TRISBCLR = (1 << 8);   // Set as output
    
    // Configure SW1 (RB9) as input with pull-up
    ANSELBCLR = (1 << 9);  // Disable analog
    TRISBSET = (1 << 9);   // Set as input
    CNPUBSET = (1 << 9);   // Enable pull-up
}
```

**For PPS:**
```c
// PPS Configuration
void PPS_Initialize(void) {
    // Unlock PPS
    SYSKEY = 0x00000000;
    SYSKEY = 0xAA996655;
    SYSKEY = 0x556699AA;
    CFGCONbits.IOLOCK = 0;
    
    // Configure UART1
    U1RXR = 0x04;   // RPD10 -> UART1 RX
    RPD14R = 0x01;  // UART1 TX -> RPD14
    
    // Lock PPS
    CFGCONbits.IOLOCK = 1;
    SYSKEY = 0x00000000;
}
```

#### 4.2 Harmony (XC32) Format

**plib_gpio.h:**
```c
#ifndef PLIB_GPIO_H
#define PLIB_GPIO_H

#include <device.h>
#include <stdint.h>
#include <stdbool.h>

// Pin macros
#define LED1_Set()               (LATBSET = (1U << 8))
#define LED1_Clear()             (LATBCLR = (1U << 8))
#define LED1_Toggle()            (LATBINV = (1U << 8))
#define LED1_Get()               (((PORTB >> 8) & 0x1U) != 0U)
#define LED1_OutputEnable()      (TRISBCLR = (1U << 8))
#define LED1_InputEnable()       (TRISBSET = (1U << 8))

#define SW1_Get()                (((PORTB >> 9) & 0x1U) != 0U)
#define SW1_InputEnable()        (TRISBSET = (1U << 9))

void GPIO_Initialize(void);

#endif // PLIB_GPIO_H
```

**plib_gpio.c:**
```c
#include "plib_gpio.h"

void GPIO_Initialize(void)
{
    /* PORTB Configuration */
    ANSELBCLR = 0x300; /* Disable analog on RB8, RB9 */
    TRISBCLR = 0x100;  /* RB8 as output */
    TRISBSET = 0x200;  /* RB9 as input */
    LATBCLR = 0x100;   /* RB8 initial state low */
    CNPUBSET = 0x200;  /* RB9 pull-up enabled */
}
```

**For PPS (in initialization.c or separate plib_pps.c):**
```c
void PPS_Initialize(void)
{
    /* Unlock system for PPS configuration */
    SYSKEY = 0x00000000U;
    SYSKEY = 0xAA996655U;
    SYSKEY = 0x556699AAU;
    CFGCONbits.IOLOCK = 0;

    /* PPS Input Mapping */
    U1RXR = 0x4;    /* U1RX = RPD10 */
    
    /* PPS Output Mapping */
    RPD14R = 0x1;   /* RPD14 = U1TX */

    /* Lock back the PPS */
    CFGCONbits.IOLOCK = 1;
    SYSKEY = 0x00000000U;
}
```

### 5. Implementation Plan

#### Phase 1: Data Layer (Week 1)
1. Create device pin database for PIC32MZ EF/EC family
   - Parse/convert datasheet Table 1-1 into TypeScript data
   - Store in `src/devices/pic32mz/pinTables.ts`

2. Create PPS mapping database
   - Input mappings (Table 12-1)
   - Output mappings (Table 12-2)
   - Store in `src/devices/pic32mz/ppsMapping.ts`

#### Phase 2: UI Development (Week 2)
1. Add "Pin Manager" tab to config editor
2. Build pin table component
3. Implement pin configuration dialogs
4. Add filtering and search functionality

#### Phase 3: Code Generation (Week 3)
1. GPIO code generator (mikroC format)
2. GPIO code generator (Harmony format)
3. PPS initialization code
4. Integration with project generators

#### Phase 4: Testing & Polish (Week 4)
1. Test all pin configurations
2. Validate generated code compiles
3. Test with actual hardware
4. Documentation

### 6. File Structure

```
src/
├── devices/
│   └── pic32mz/
│       ├── pinTables.ts          # Pin definitions per device/package
│       ├── ppsMapping.ts         # PPS input/output mappings
│       └── pinConfig.ts          # Pin configuration interfaces
├── generators/
│   ├── mikrocGpioGen.ts          # mikroC GPIO code generator
│   ├── harmonyGpioGen.ts         # Harmony GPIO code generator
│   └── ppsCodeGen.ts             # PPS initialization generator
└── webview/
    ├── configEditor.html         # Add Pin Manager tab
    └── pinManager.css            # Pin manager styles
```

### 7. Data Storage Example

**devices/pic32mz/pinTables.ts:**
```typescript
export const PIC32MZ_EF_64_PIN: DevicePin[] = [
    {
        pinNumber: { '64-pin': 1, '100-pin': null, '124-pin': null, '144-pin': null },
        pinName: 'RB5',
        isPowerPin: false,
        bufferType: 'Digital',
        defaultFunction: 'RB5',
        alternateFunctions: ['GPIO', 'RP5', 'CNB5', 'PGED3', 'ASDA3'],
        rpNumber: 5,
        cnNumber: 'CNB5'
    },
    // ... more pins
];
```

### 8. Next Steps

**Question for Review:**
1. Is the UI design intuitive enough?
2. Should we support "quick assign" templates (e.g., "UART1 Standard", "SPI1 Master")?
3. Do you want the ability to import/export pin configurations?
4. Should we validate conflicts (e.g., same peripheral assigned to multiple pins)?

**Ready to proceed?**
Once approved, we'll start with Phase 1: Creating the pin database from the datasheet tables.
