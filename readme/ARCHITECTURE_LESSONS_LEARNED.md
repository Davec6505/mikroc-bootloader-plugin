# Architecture Lessons Learned

**Date**: December 21, 2025  
**Purpose**: Document what works, what doesn't, and why - to guide the rewrite

---

## ✅ What Works Well (Keep These)

### 1. **Three-Layer Interrupt Architecture**
```c
// Layer 1: interrupts.h - Forward declarations
void TIMER_1_InterruptHandler(void);

// Layer 2: interrupts.c - ISR vectors
void __ISR(_TIMER_1_VECTOR, ipl1SRS) TIMER_1_Handler(void) {
    TIMER_1_InterruptHandler();
}

// Layer 3: plib_tmr1.c - Actual handler with callbacks
void TIMER_1_InterruptHandler(void) {
    // Clear flag, call user callback
}
```
**Why it works**: Clean separation of concerns, MCC compatible, testable

---

### 2. **Template-Based Code Generation**
```typescript
const template = loadTemplate('plib_tmr1.c.template');
const code = replaceTemplateVars(template, {
    TIMER_NUM: '1',
    PRESCALER: '8',
    PR_VALUE: '25000'
});
```
**Why it works**: Easy to maintain, matches MCC output, readable

---

### 3. **Separate Generator Modules**
```
generators/
├── harmonyClkGen.ts    # Clock system
├── harmonyTimerGen.ts  # Timer peripherals
└── harmonyUartGen.ts   # UART peripherals
```
**Why it works**: Each peripheral is self-contained, testable, reusable

---

### 4. **MCC Harmony 3 Folder Structure**
```
peripheral/
├── tmr1/               # Timer1 instance
│   ├── plib_tmr1.h
│   ├── plib_tmr1.c
│   └── plib_tmr1_common.h
├── tmr/                # Timer2-9 parent
│   ├── plib_tmr_common.h
│   ├── tmr2/
│   └── tmr3/
```
**Why it works**: Industry standard, familiar to users, clean organization

---

### 5. **Device Registry Pattern**
```typescript
const ALL_DEVICES: PIC32Device[] = [];

export function registerDeviceFamily(devices: PIC32Device[]): void {
    ALL_DEVICES.push(...devices);
}

export function getDeviceByName(name: string): PIC32Device | undefined {
    return ALL_DEVICES.find(dev => dev.name === name);
}
```
**Why it works**: Extensible, supports multiple families, clean API

---

## ❌ What Doesn't Work (Avoid These)

### 1. **Monolithic WebView JavaScript (2150+ lines)**
```javascript
// configEditor.js - ONE GIANT FILE
let configuredTimers = [];
let configuredUarts = [];
function calculateTimer() { /* 200 lines */ }
function configureUart() { /* 150 lines */ }
function renderPinTable() { /* 300 lines */ }
// ... 1500 more lines
```

**Problems**:
- Impossible to test individual components
- Copy-paste code duplication
- Hard to find anything
- Merge conflicts inevitable
- No code reuse

**Lesson**: Split into modules (one per peripheral, shared components)

---

### 2. **Hardcoded State Fields**
```typescript
class ConfigEditor {
    private savedTimerConfigurations?: TimerConfiguration[];
    private savedUartConfigurations?: UartConfig[];
    private savedSpiConfigurations?: SpiConfig[];  // Will keep adding...
    private savedI2cConfigurations?: I2cConfig[];
    private savedAdcConfigurations?: AdcConfig[];
    // ... 20 more fields when done
}
```

**Problems**:
- Not extensible
- Violates Open/Closed Principle
- Every new peripheral needs code changes everywhere
- Can't dynamically add/remove peripherals

**Lesson**: Use `Map<string, any[]>` for generic storage

---

### 3. **Message Handler Explosion**
```typescript
onDidReceiveMessage((message) => {
    switch (message.type) {
        case 'getTimerConfig': /* ... */ break;
        case 'setTimerConfig': /* ... */ break;
        case 'getUartConfig': /* ... */ break;
        case 'setUartConfig': /* ... */ break;
        case 'getSpiConfig': /* ... */ break;  // Will keep adding
        case 'getI2cConfig': /* ... */ break;
        // ... 50 cases eventually
    }
});
```

**Problems**:
- 1000+ line switch statement
- Every peripheral adds 5+ cases
- Hard to maintain
- No pattern

**Lesson**: Use generic message handlers with peripheral ID parameter

---

### 4. **Tight Coupling in Project Generator**
```typescript
export interface XC32ProjectOptions {
    // ... basic options
    timerConfigurations?: TimerConfiguration[];
    uartConfigurations?: UartConfig[];
    spiConfigurations?: SpiConfig[];      // Will keep adding
    i2cConfigurations?: I2cConfig[];
    adcConfigurations?: AdcConfig[];
    pwmConfigurations?: PwmConfig[];
    // ... 15 more fields
}
```

**Problems**:
- Every peripheral needs interface change
- Can't add peripherals without modifying core
- No plugin support
- Breaks every time we add a peripheral

**Lesson**: Use generic `peripheralConfigurations: Map<string, any[]>`

---

### 5. **Frontend-Backend Type Mismatch**
```typescript
// Backend (TypeScript)
interface TimerConfiguration {
    timer: string;
    prescaler: number;
    // ... strongly typed
}

// Frontend (JavaScript)
let timerConfig = {
    timer: '1',
    prescaler: 8,
    // ... no type checking, can add any field
};
```

**Problems**:
- Runtime errors when types don't match
- Hard to debug
- No compile-time checking
- Data format drift

**Lesson**: Share type definitions or use JSON Schema validation

---

### 6. **No Validation Pipeline**
```typescript
// Values accepted blindly
const prValue = parseInt(input);  // What if NaN?
const prescaler = value;          // What if invalid?
// No validation until generation fails
```

**Problems**:
- Errors discovered late
- Poor user experience
- Hard to debug
- Invalid configs saved

**Lesson**: Validate at input, validate at save, validate at generation

---

### 7. **Global State in Frontend**
```javascript
// All state is global
let currentConfig = {};
let configuredTimers = [];
let timerConfig = { /* ... */ };

// Any function can modify anything
function someFunction() {
    configuredTimers = [];  // Oops, cleared by accident
}
```

**Problems**:
- No encapsulation
- Side effects everywhere
- Hard to track changes
- Undo/redo impossible

**Lesson**: Use proper state management (even simple objects with methods)

---

### 8. **Manual Array Management**
```javascript
// Adding peripheral
configuredTimers.push(newTimer);
renderConfiguredTimers();

// Removing peripheral
configuredTimers.splice(index, 1);
renderConfiguredTimers();

// Updating peripheral
configuredTimers[index] = updatedTimer;
renderConfiguredTimers();

// Copy-pasted for EVERY peripheral type
```

**Problems**:
- Duplicate code for each peripheral
- Forgot to call render? UI out of sync
- No single source of truth

**Lesson**: Create PeripheralCollection class with add/remove/update methods

---

## 🎯 Key Architecture Principles for Rewrite

### 1. **Plugin System**
```typescript
interface PeripheralPlugin {
    id: string;                    // 'timer', 'uart', 'spi'
    displayName: string;           // 'Timer', 'UART', 'SPI'
    generator: CodeGenerator;      // Generates code
    uiComponent: UIComponent;      // Renders configuration UI
    validator: Validator;          // Validates config
    defaultConfig: () => any;      // Default values
}
```

### 2. **Generic State Management**
```typescript
class PeripheralConfigManager {
    private configs = new Map<string, any[]>();
    
    get(peripheralId: string): any[] { }
    set(peripheralId: string, configs: any[]): void { }
    add(peripheralId: string, config: any): void { }
    remove(peripheralId: string, index: number): void { }
    update(peripheralId: string, index: number, config: any): void { }
}
```

### 3. **Message Protocol**
```typescript
// Generic message format
{
    type: 'peripheral.action',
    payload: {
        peripheralId: 'timer',
        action: 'configure',
        data: { /* config */ }
    }
}
```

### 4. **Modular Frontend**
```javascript
// main.js
import { UIManager } from './core/UIManager.js';
import { TimerUI } from './peripherals/TimerUI.js';
import { UartUI } from './peripherals/UartUI.js';

const manager = new UIManager();
manager.registerPeripheral(new TimerUI());
manager.registerPeripheral(new UartUI());
```

### 5. **Separation of Concerns**
```
Backend:  State + Validation + Generation + Persistence
Frontend: Presentation + User Input + Validation (UI-level)
Messages: Clean protocol between backend/frontend
```

---

## 📋 Critical Technical Constraints (DON'T FORGET!)

### 1. **Windows CRLF Line Endings**
```typescript
// Templates MUST use \r\n
template.replace('line1\r\nline2\r\n', replacement);
// NOT: template.replace('line1\nline2\n', replacement);
```

### 2. **ISR Macro Format**
```c
// device.h MUST include <sys/attribs.h>
#include <sys/attribs.h>

// ISR MUST be lowercase ipl
void __ISR(_TIMER_1_VECTOR, ipl1SRS) Handler(void)
// NOT: IPL1SRS (uppercase fails)
```

### 3. **Timer Includes**
```c
// plib_tmrX.c MUST include definitions.h
#include "device.h"
#include "plib_tmr1.h"
#include "interrupts.h"
#include "definitions.h"  // ← REQUIRED for CPU_CLOCK_FREQUENCY
```

### 4. **MCC Folder Structure**
```
peripheral/
├── tmr1/           # Timer1 special case
├── tmr/            # Timer2-9 parent folder
│   └── tmr2/       # Instance subfolder
└── uart/           # UART parent folder
    └── uart1/      # Instance subfolder
```

### 5. **Interrupt Priority Format**
```c
// Priority MUST be lowercase with SRS or SOFT suffix
ipl1SRS   // ✅ Correct - IPL 1, auto shadow register
ipl7SOFT  // ✅ Correct - IPL 7, manual assignment
IPL1SRS   // ❌ WRONG - uppercase fails
```

---

## 🔄 Migration Strategy

### Phase 1: Documentation (CURRENT)
- ✅ Document lessons learned (this file)
- ⏳ Design new architecture
- ⏳ Create implementation plan
- ⏳ Design API contracts

### Phase 2: Core Infrastructure
- Create PeripheralRegistry
- Create generic state management
- Create message protocol
- Create UI component base classes

### Phase 3: Migrate Existing Peripherals
- Wrap Clock generator as plugin
- Wrap Timer generator as plugin
- Wrap UART generator as plugin
- Wrap GPIO generator as plugin

### Phase 4: Frontend Refactor
- Split monolithic JS into modules
- Create peripheral-specific UI components
- Implement shared UI components (dropdowns, calculators)
- Connect to new message protocol

### Phase 5: Add New Features
- Config reload (trivial with new system)
- Validation pipeline
- Undo/redo
- Export/import configurations
- SPI, I2C, ADC peripherals

---

## 📊 Success Metrics

The rewrite is successful if:
1. ✅ Adding a new peripheral = Create one folder, no existing code changes
2. ✅ Frontend code < 500 lines per peripheral module
3. ✅ Backend code fully typed with validation
4. ✅ All existing functionality still works
5. ✅ Test coverage > 70%
6. ✅ Build time < 5 seconds
7. ✅ No copy-paste code between peripherals

---

**Next Step**: Design the new architecture in detail before writing any code.
