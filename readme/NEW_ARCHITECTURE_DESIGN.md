# New Architecture Design

**Date**: December 21, 2025  
**Purpose**: Complete architecture design for the rewrite  
**Reference**: ARCHITECTURE_LESSONS_LEARNED.md

---

## 🎯 Design Goals

1. **Extensible** - Add peripherals without touching core code
2. **Maintainable** - Each peripheral is self-contained module
3. **Testable** - Unit tests for each component
4. **Type-Safe** - Shared type definitions, compile-time checks
5. **Modular** - Small, focused files (< 500 lines each)

---

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   VS Code Extension                  │
├─────────────────────────────────────────────────────┤
│                                                       │
│  ┌───────────────┐         ┌──────────────────┐    │
│  │   Extension   │◄────────┤ Peripheral       │    │
│  │   Host        │         │ Registry         │    │
│  │ (extension.ts)│         │                  │    │
│  └───────┬───────┘         └────────┬─────────┘    │
│          │                           │               │
│          │ Commands                  │ Plugins       │
│          ▼                           ▼               │
│  ┌───────────────┐         ┌──────────────────┐    │
│  │ Config Editor │◄────────┤ Clock Plugin     │    │
│  │ (Orchestrator)│         ├──────────────────┤    │
│  └───────┬───────┘         │ Timer Plugin     │    │
│          │                 ├──────────────────┤    │
│          │                 │ UART Plugin      │    │
│          │                 ├──────────────────┤    │
│          │                 │ SPI Plugin       │    │
│          │                 └──────────────────┘    │
│          │                                           │
│          ▼                                           │
│  ┌─────────────────────────────────────────────┐   │
│  │           WebView Panel                      │   │
│  │  ┌────────────────────────────────────────┐ │   │
│  │  │  Frontend UI (Modular JavaScript)      │ │   │
│  │  │  ┌──────────┬──────────┬────────────┐  │ │   │
│  │  │  │ Timer UI │ UART UI  │  SPI UI    │  │ │   │
│  │  │  └──────────┴──────────┴────────────┘  │ │   │
│  │  │            Shared Components            │ │   │
│  │  │  ┌──────────┬──────────┬────────────┐  │ │   │
│  │  │  │Dropdown  │Calculator│ TabManager │  │ │   │
│  │  │  └──────────┴──────────┴────────────┘  │ │   │
│  │  └────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────┘   │
│                        │                             │
│                        │ postMessage                 │
│                        ▼                             │
│  ┌─────────────────────────────────────────────┐   │
│  │        Message Router                        │   │
│  │   (Routes to appropriate plugin)             │   │
│  └─────────────────────────────────────────────┘   │
│                        │                             │
│                        ▼                             │
│  ┌─────────────────────────────────────────────┐   │
│  │     Project Generator                        │   │
│  │  (Collects code from all plugins)            │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## 🔌 Plugin System Design

### Core Interface
```typescript
// src/peripherals/core/PeripheralPlugin.ts

export interface PeripheralPlugin {
    // Identity
    readonly id: string;              // 'timer', 'uart', 'spi'
    readonly displayName: string;     // 'Timer', 'UART', 'SPI'
    readonly version: string;         // '1.0.0'
    
    // Configuration
    createDefaultConfig(): any;       // Returns default configuration
    validateConfig(config: any): ValidationResult;
    
    // Code Generation
    generate(configs: any[], options: GeneratorOptions): GeneratedFiles;
    
    // UI Descriptor (for frontend)
    getUIDescriptor(): UIDescriptor;
    
    // Dependencies (optional)
    getDependencies?(): string[];     // e.g., ['clock', 'evic']
    
    // Lifecycle hooks
    onInit?(context: PluginContext): void;
    onDestroy?(): void;
}

export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

export interface GeneratedFiles {
    [filePath: string]: string;  // Relative path → content
}

export interface UIDescriptor {
    tabName: string;
    iconClass: string;
    scriptUrl: string;          // URL to frontend module
    styleUrl?: string;
}

export interface GeneratorOptions {
    device: PIC32Device;
    systemClock: number;
    outputPath: string;
    // ... other global options
}
```

---

### Plugin Registry
```typescript
// src/peripherals/core/PeripheralRegistry.ts

export class PeripheralRegistry {
    private plugins = new Map<string, PeripheralPlugin>();
    
    register(plugin: PeripheralPlugin): void {
        if (this.plugins.has(plugin.id)) {
            throw new Error(`Plugin ${plugin.id} already registered`);
        }
        plugin.onInit?.(this.createContext());
        this.plugins.set(plugin.id, plugin);
    }
    
    unregister(id: string): void {
        const plugin = this.plugins.get(id);
        if (plugin) {
            plugin.onDestroy?.();
            this.plugins.delete(id);
        }
    }
    
    get(id: string): PeripheralPlugin | undefined {
        return this.plugins.get(id);
    }
    
    getAll(): PeripheralPlugin[] {
        return Array.from(this.plugins.values());
    }
    
    getAllUI Descriptors(): UIDescriptor[] {
        return this.getAll().map(p => p.getUIDescriptor());
    }
    
    generateAll(configs: Map<string, any[]>, options: GeneratorOptions): GeneratedFiles {
        const allFiles: GeneratedFiles = {};
        
        for (const plugin of this.getAll()) {
            const peripheralConfigs = configs.get(plugin.id) || [];
            if (peripheralConfigs.length > 0) {
                const files = plugin.generate(peripheralConfigs, options);
                Object.assign(allFiles, files);
            }
        }
        
        return allFiles;
    }
    
    validateAll(configs: Map<string, any[]>): Map<string, ValidationResult> {
        const results = new Map<string, ValidationResult>();
        
        for (const [id, peripheralConfigs] of configs) {
            const plugin = this.get(id);
            if (!plugin) {
                continue;
            }
            
            for (const config of peripheralConfigs) {
                const result = plugin.validateConfig(config);
                if (!result.valid) {
                    results.set(id, result);
                    break;
                }
            }
        }
        
        return results;
    }
}
```

---

## 📦 Peripheral Plugin Structure

### Example: Timer Plugin
```typescript
// src/peripherals/timer/TimerPlugin.ts

import { PeripheralPlugin, ValidationResult, GeneratedFiles, UIDescriptor, GeneratorOptions } from '../core/PeripheralPlugin';
import { TimerGenerator } from './TimerGenerator';
import { TimerValidator } from './TimerValidator';

export interface TimerConfiguration {
    timer: string;           // '1', '2', '23' (32-bit)
    prescaler: number;       // 1, 2, 4, 8, 16, 32, 64, 256
    prValue: number;         // Period register value
    period: number;          // Actual period in seconds
    pbclk3Freq: number;      // Input clock frequency
    mode32Bit?: boolean;     // True for paired timers
    enableInterrupt?: boolean;
    priority?: number;       // 1-7
    subPriority?: number;    // 0-3
}

export class TimerPlugin implements PeripheralPlugin {
    readonly id = 'timer';
    readonly displayName = 'Timer';
    readonly version = '1.0.0';
    
    private generator = new TimerGenerator();
    private validator = new TimerValidator();
    
    createDefaultConfig(): TimerConfiguration {
        return {
            timer: '1',
            prescaler: 8,
            prValue: 0,
            period: 0.001,  // 1ms
            pbclk3Freq: 100000000,
            enableInterrupt: true,
            priority: 1,
            subPriority: 0
        };
    }
    
    validateConfig(config: TimerConfiguration): ValidationResult {
        return this.validator.validate(config);
    }
    
    generate(configs: TimerConfiguration[], options: GeneratorOptions): GeneratedFiles {
        return this.generator.generate(configs, options);
    }
    
    getUIDescriptor(): UIDescriptor {
        return {
            tabName: 'Timers',
            iconClass: 'icon-timer',
            scriptUrl: '/peripherals/timer/TimerUI.js'
        };
    }
    
    getDependencies(): string[] {
        return ['clock', 'evic'];  // Needs clock and interrupt controller
    }
}
```

---

### Timer Generator (Wraps Existing Code)
```typescript
// src/peripherals/timer/TimerGenerator.ts

import { GeneratedFiles, GeneratorOptions } from '../core/PeripheralPlugin';
import { TimerConfiguration } from './TimerPlugin';
// Import existing generators (reuse, don't rewrite)
import {
    generateTimer1Header,
    generateTimer1Source,
    generateTimerTypeB_Header,
    generateTimerTypeB_Source,
    generateTmr1CommonHeader,
    generateTmrCommonHeader
} from '../../generators/harmonyTimerGen';

export class TimerGenerator {
    generate(configs: TimerConfiguration[], options: GeneratorOptions): GeneratedFiles {
        const files: GeneratedFiles = {};
        let needTmr1Common = false;
        let needTmrCommon = false;
        
        for (const config of configs) {
            const timerNum = parseInt(config.timer[0]);
            
            if (timerNum === 1) {
                // Timer1 (Type A)
                files[`peripheral/tmr1/plib_tmr1.h`] = generateTimer1Header();
                files[`peripheral/tmr1/plib_tmr1.c`] = generateTimer1Source(config);
                needTmr1Common = true;
            } else {
                // Timer2-9 (Type B)
                const path = `peripheral/tmr/tmr${timerNum}`;
                files[`${path}/plib_tmr${timerNum}.h`] = generateTimerTypeB_Header(timerNum, config.mode32Bit);
                files[`${path}/plib_tmr${timerNum}.c`] = generateTimerTypeB_Source(config);
                needTmrCommon = true;
            }
        }
        
        // Common headers
        if (needTmr1Common) {
            files[`peripheral/tmr1/plib_tmr1_common.h`] = generateTmr1CommonHeader();
        }
        if (needTmrCommon) {
            files[`peripheral/tmr/plib_tmr_common.h`] = generateTmrCommonHeader();
        }
        
        return files;
    }
}
```

---

### Timer Validator
```typescript
// src/peripherals/timer/TimerValidator.ts

import { ValidationResult } from '../core/PeripheralPlugin';
import { TimerConfiguration } from './TimerPlugin';

export class TimerValidator {
    validate(config: TimerConfiguration): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];
        
        // Validate timer number
        const timerNum = parseInt(config.timer[0]);
        if (isNaN(timerNum) || timerNum < 1 || timerNum > 9) {
            errors.push(`Invalid timer number: ${config.timer}`);
        }
        
        // Validate prescaler
        const validPrescalers = timerNum === 1 
            ? [1, 8, 64, 256]        // Timer1 Type A
            : [1, 2, 4, 8, 16, 32, 64, 256];  // Type B
        
        if (!validPrescalers.includes(config.prescaler)) {
            errors.push(`Invalid prescaler ${config.prescaler} for Timer${timerNum}`);
        }
        
        // Validate PR value
        const maxPR = config.mode32Bit ? 0xFFFFFFFF : 0xFFFF;
        if (config.prValue < 0 || config.prValue > maxPR) {
            errors.push(`PR value ${config.prValue} out of range (0-${maxPR})`);
        }
        
        // Validate interrupt priority
        if (config.enableInterrupt) {
            if (config.priority === undefined || config.priority < 1 || config.priority > 7) {
                errors.push(`Invalid interrupt priority: ${config.priority} (must be 1-7)`);
            }
            if (config.subPriority === undefined || config.subPriority < 0 || config.subPriority > 3) {
                errors.push(`Invalid sub-priority: ${config.subPriority} (must be 0-3)`);
            }
        }
        
        // Warning for very short periods
        if (config.period < 0.000001) {  // < 1 microsecond
            warnings.push(`Very short period (${config.period}s) may not be achievable`);
        }
        
        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }
}
```

---

## 🎨 Frontend Architecture

### Modular JavaScript Structure
```
webview/
├── main.js                      # Entry point, initializes app
├── core/
│   ├── UIManager.js             # Manages all peripheral UIs
│   ├── MessageBus.js            # Communication with backend
│   ├── StateManager.js          # Central state management
│   └── EventBus.js              # Internal events
│
├── components/                  # Shared UI components
│   ├── Dropdown.js
│   ├── NumberInput.js
│   ├── Calculator.js
│   ├── TabManager.js
│   └── ConfigCard.js
│
└── peripherals/                 # Peripheral-specific UIs
    ├── timer/
    │   ├── TimerUI.js           # Main UI module
    │   ├── TimerCalculator.js   # Period calculator
    │   └── TimerCard.js         # Config card renderer
    │
    ├── uart/
    │   ├── UartUI.js
    │   ├── BaudCalculator.js
    │   └── UartCard.js
    │
    └── spi/
        ├── SpiUI.js
        └── SpiCard.js
```

### Base Peripheral UI Class
```javascript
// webview/core/PeripheralUI.js

export class PeripheralUI {
    constructor(id, displayName) {
        this.id = id;
        this.displayName = displayName;
        this.configurations = [];
    }
    
    // Lifecycle
    onInit(container) {
        // Override: Initialize UI in container
    }
    
    onDestroy() {
        // Override: Cleanup
    }
    
    // Configuration management
    addConfiguration(config) {
        this.configurations.push(config);
        this.render();
    }
    
    removeConfiguration(index) {
        this.configurations.splice(index, 1);
        this.render();
    }
    
    updateConfiguration(index, config) {
        this.configurations[index] = config;
        this.render();
    }
    
    getConfigurations() {
        return this.configurations;
    }
    
    // Override these
    render() {
        throw new Error('render() must be implemented');
    }
    
    validate(config) {
        return { valid: true, errors: [], warnings: [] };
    }
    
    createDefaultConfig() {
        return {};
    }
}
```

### Example: Timer UI Module
```javascript
// webview/peripherals/timer/TimerUI.js

import { PeripheralUI } from '../../core/PeripheralUI.js';
import { TimerCalculator } from './TimerCalculator.js';
import { ConfigCard } from '../../components/ConfigCard.js';

export class TimerUI extends PeripheralUI {
    constructor() {
        super('timer', 'Timer');
        this.calculator = new TimerCalculator();
        this.currentConfig = this.createDefaultConfig();
    }
    
    onInit(container) {
        this.container = container;
        this.renderForm();
        this.renderConfigurationList();
    }
    
    createDefaultConfig() {
        return {
            timer: '1',
            prescaler: 8,
            prValue: 0,
            period: 0.001,
            pbclk3Freq: 100000000,
            enableInterrupt: true,
            priority: 1,
            subPriority: 0
        };
    }
    
    renderForm() {
        // Create form UI for configuring a timer
        const html = `
            <div class="peripheral-form">
                <h3>Configure Timer</h3>
                <select id="timer-number">
                    <option value="1">Timer1</option>
                    <option value="2">Timer2</option>
                    <!-- ... -->
                </select>
                <!-- More form fields -->
                <button id="calculate-btn">Calculate</button>
                <button id="add-timer-btn">Add Timer</button>
            </div>
        `;
        this.container.querySelector('.form-area').innerHTML = html;
        this.attachFormHandlers();
    }
    
    renderConfigurationList() {
        const listContainer = this.container.querySelector('.config-list');
        listContainer.innerHTML = '';
        
        this.configurations.forEach((config, index) => {
            const card = new ConfigCard(
                `Timer${config.timer}`,
                this.formatSummary(config),
                () => this.loadConfiguration(index),
                () => this.removeConfiguration(index)
            );
            listContainer.appendChild(card.element);
        });
    }
    
    formatSummary(config) {
        return `Period: ${(config.period * 1000).toFixed(3)}ms | Prescaler: 1:${config.prescaler}`;
    }
    
    render() {
        this.renderConfigurationList();
    }
}
```

---

## 📨 Message Protocol

### Generic Message Format
```typescript
interface PeripheralMessage {
    type: 'peripheral.action';
    payload: {
        peripheralId: string;
        action: string;
        data?: any;
    };
}
```

### Message Examples
```typescript
// Get configurations
{
    type: 'peripheral.getConfigs',
    payload: {
        peripheralId: 'timer'
    }
}

// Set configurations
{
    type: 'peripheral.setConfigs',
    payload: {
        peripheralId: 'timer',
        data: [
            { timer: '1', prescaler: 8, /* ... */ }
        ]
    }
}

// Validate configuration
{
    type: 'peripheral.validate',
    payload: {
        peripheralId: 'uart',
        data: { instanceNum: 1, baudRate: 115200, /* ... */ }
    }
}
```

### Backend Message Router
```typescript
// src/configEditor.ts

private handlePeripheralMessage(message: any): void {
    const { peripheralId, action, data } = message.payload;
    const plugin = this.registry.get(peripheralId);
    
    if (!plugin) {
        this.sendError(`Unknown peripheral: ${peripheralId}`);
        return;
    }
    
    switch (action) {
        case 'getConfigs':
            this.sendPeripheralConfigs(peripheralId);
            break;
            
        case 'setConfigs':
            this.peripheralConfigs.set(peripheralId, data);
            break;
            
        case 'validate':
            const result = plugin.validateConfig(data);
            this.sendValidationResult(peripheralId, result);
            break;
            
        case 'getDefaults':
            const defaults = plugin.createDefaultConfig();
            this.sendDefaults(peripheralId, defaults);
            break;
    }
}
```

---

## 🗄️ State Management

### Backend State
```typescript
// src/peripherals/core/PeripheralConfigManager.ts

export class PeripheralConfigManager {
    private configs = new Map<string, any[]>();
    
    get(peripheralId: string): any[] {
        return this.configs.get(peripheralId) || [];
    }
    
    set(peripheralId: string, configs: any[]): void {
        this.configs.set(peripheralId, configs);
        this.emit('change', peripheralId, configs);
    }
    
    add(peripheralId: string, config: any): void {
        const configs = this.get(peripheralId);
        configs.push(config);
        this.set(peripheralId, configs);
    }
    
    remove(peripheralId: string, index: number): void {
        const configs = this.get(peripheralId);
        configs.splice(index, 1);
        this.set(peripheralId, configs);
    }
    
    update(peripheralId: string, index: number, config: any): void {
        const configs = this.get(peripheralId);
        configs[index] = config;
        this.set(peripheralId, configs);
    }
    
    clear(peripheralId?: string): void {
        if (peripheralId) {
            this.configs.delete(peripheralId);
        } else {
            this.configs.clear();
        }
    }
    
    toJSON(): any {
        const obj: any = {};
        for (const [id, configs] of this.configs) {
            obj[id] = configs;
        }
        return obj;
    }
    
    fromJSON(json: any): void {
        this.configs.clear();
        for (const [id, configs] of Object.entries(json)) {
            this.configs.set(id, configs as any[]);
        }
    }
}
```

### Frontend State
```javascript
// webview/core/StateManager.js

export class StateManager {
    constructor() {
        this.peripheralConfigs = new Map();
        this.listeners = new Map();
    }
    
    getConfigs(peripheralId) {
        return this.peripheralConfigs.get(peripheralId) || [];
    }
    
    setConfigs(peripheralId, configs) {
        this.peripheralConfigs.set(peripheralId, configs);
        this.notify(peripheralId, configs);
    }
    
    subscribe(peripheralId, callback) {
        if (!this.listeners.has(peripheralId)) {
            this.listeners.set(peripheralId, []);
        }
        this.listeners.get(peripheralId).push(callback);
    }
    
    notify(peripheralId, configs) {
        const callbacks = this.listeners.get(peripheralId) || [];
        callbacks.forEach(cb => cb(configs));
    }
}
```

---

## 📝 Persistence Format

### .mikroc-config.json Structure
```json
{
    "version": "2.0.0",
    "deviceName": "PIC32MZ2048EFH100",
    "packageType": "100-pin",
    "systemClock": 200000000,
    "configBits": {
        "6": "3x Divider",
        "9": "PLL Multiply by 50",
        "10": "2x Divider"
    },
    "peripherals": {
        "clock": {
            "pbclk2": { "enabled": true, "divider": 4 },
            "pbclk3": { "enabled": true, "divider": 4 }
        },
        "timer": [
            {
                "timer": "1",
                "prescaler": 8,
                "prValue": 25000,
                "period": 0.001,
                "enableInterrupt": true,
                "priority": 1
            }
        ],
        "uart": [
            {
                "instanceNum": 1,
                "baudRate": 115200,
                "operatingMode": "non-blocking",
                "parityAndData": "8N",
                "stopBits": 1
            }
        ]
    },
    "pins": [
        {
            "pinName": "RB9",
            "mode": "gpio",
            "customName": "LED1",
            "direction": "output",
            "initialState": "low"
        }
    ]
}
```

---

**Next Step**: Create implementation plan with file-by-file breakdown and timeline.
