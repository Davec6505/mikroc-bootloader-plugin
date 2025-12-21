# Code Flow - Entry Points and Call Paths

## Extension Entry Point

**File**: `src/extension.ts`  
**Function**: `activate(context: vscode.ExtensionContext)` - Line 22

This is where EVERYTHING starts when VS Code loads the extension.

---

## Main Command Flows

### 1. Configure Device Command

**Trigger**: Command Palette → "Configure PIC32 Device"  
**Command ID**: `pic32m-dev.configureDevice`

```
activate()
  └─> registerCommand('pic32m-dev.configureDevice')
       └─> testConfigEditor(context) [extension.ts:85]
            ├─> getDevicesForDisplay() [devices/pic32mz/efhDevices.ts]
            ├─> User selects device
            ├─> new ConfigEditor(context, device) [configEditor.ts:48]
            │    ├─> getPackageType()
            │    ├─> new PinManager()
            │    └─> initializeDefaults()
            └─> editor.show() [configEditor.ts:138]
                 ├─> Create WebviewPanel
                 ├─> Load HTML/CSS/JS
                 ├─> onDidReceiveMessage() handlers:
                 │    ├─> 'ready' → sendInitialData()
                 │    ├─> 'calculateRegisters' → calculateAndSendRegisters()
                 │    ├─> 'getPinTable' → sendPinTableData()
                 │    └─> 'ok' → return ConfigResult
                 └─> Return Promise<ConfigResult>
```

### 2. Create XC32 Project Command

**Trigger**: Command Palette → "Create XC32 Project"  
**Command ID**: `pic32m-dev.createXC32Project`

```
activate()
  └─> registerCommand('pic32m-dev.createXC32Project')
       └─> createXC32Project(context) [extension.ts:238]
            ├─> Show device picker
            ├─> ConfigEditor.show() [Get user config]
            ├─> Show folder picker
            ├─> Input project name
            ├─> verifyToolchainPrereqs() [Check XC32/DFP]
            ├─> resolveXc32ToolchainPaths() [Find compiler]
            ├─> validateXC32Options()
            └─> generateXC32Project(options) [xc32ProjectGen.ts:131]
                 ├─> Create directories
                 ├─> Generate Clock system (HarmonyClkGenerator)
                 ├─> Generate GPIO (harmonyGpioGen)
                 ├─> Generate EVIC (interrupt controller)
                 ├─> Generate Timers (if configured)
                 ├─> Generate UARTs (if configured)
                 ├─> Generate interrupts.h/c
                 ├─> Generate device.h, definitions.h
                 ├─> Generate main.c
                 ├─> Generate Makefiles (Root + srcs/)
                 ├─> Generate .vscode/tasks.json
                 ├─> Generate README.md
                 └─> Show "Open Project" dialog [extension.ts:367]
```

### 3. Flash Device Command

**Trigger**: Status Bar "⚡ Flash PIC32" or Command Palette  
**Command ID**: `pic32m-dev.flash`

```
activate()
  └─> registerCommand('pic32m-dev.flash')
       └─> flashToDevice() [extension.ts:152]
            ├─> Get bootloader path from settings
            ├─> Find .hex files (workspace.findFiles)
            ├─> User selects .hex (if multiple)
            ├─> Create terminal
            └─> Execute bootloader command
```

---

## WebView Frontend Flow

**File**: `src/webview/configEditor.js` (2150+ lines)

```
Window Load
  └─> initializeUI() [Inline in HTML]
       ├─> Setup tabs
       ├─> Setup event listeners
       └─> postMessage({type: 'ready'})
            └─> Backend sends 'init' message
                 └─> Populate dropdowns, restore config

User Actions:
  ├─> Configure Timer
  │    ├─> calculateTimer()
  │    ├─> Add to configuredTimers[]
  │    └─> renderConfiguredTimers()
  │
  ├─> Configure UART
  │    ├─> configureUart()
  │    ├─> Add to configuredUarts[]
  │    └─> renderConfiguredUarts()
  │
  ├─> Configure Pins
  │    └─> postMessage({type: 'setPinConfiguration'})
  │
  └─> Click OK
       └─> postMessage({
            type: 'ok',
            config, heapSize,
            timerConfigurations,
            uartConfigurations,
            pinConfigurations
          })
```

---

## Generator Module Call Paths

### XC32 Project Generator

**Entry**: `generateXC32Project(options)` [xc32ProjectGen.ts:131]

```
generateXC32Project()
  ├─> ensureDir() - Create folders
  ├─> HarmonyClkGenerator.generate() [harmonyClkGen.ts]
  │    ├─> generateClkHeader() → plib_clk.h
  │    └─> generateClkSource() → plib_clk.c
  │
  ├─> generateHarmonyGpioHeader() [harmonyGpioGen.ts]
  │    └─> plib_gpio.h
  ├─> generateHarmonyGpioSource() [harmonyGpioGen.ts]
  │    ├─> plib_gpio.c
  │    └─> generateHarmonyPPSCode() [ppsCodeGen.ts]
  │
  ├─> For each timer:
  │    ├─> generateTimer1Header/Source() [Timer1]
  │    ├─> generateTimerTypeB_Header/Source() [Timer2-9]
  │    ├─> generateTimerInterruptDeclaration()
  │    └─> generateTimerIPC()
  │
  ├─> For each UART:
  │    └─> HarmonyUartGenerator.generate()
  │         ├─> generateUartHeader()
  │         ├─> generateUartSource()
  │         └─> generateUartCommonHeader()
  │
  ├─> Generate interrupts.h (declarations)
  ├─> Generate interrupts.c (ISR vectors)
  ├─> loadTemplate('main.c.template')
  ├─> loadTemplate('device.h.template')
  ├─> loadTemplate('definitions.h.template')
  ├─> loadTemplate('RootMakefile.template') → Makefile
  ├─> loadTemplate('SrcsMakefile.template') → srcs/Makefile
  ├─> loadTemplate('tasks.json.template') → .vscode/tasks.json
  └─> loadTemplate('README.md.template') → README.md
```

---

## Key Data Structures

### ConfigResult (configEditor.ts)
```typescript
interface ConfigResult {
    config: Map<number, string>;  // Config bits
    heapSize: number;
    xc32Version?: string;
    dfpVersion?: string;
    pinConfigurations?: PinConfiguration[];
    timerConfigurations?: TimerConfiguration[];
    uartConfigurations?: UartConfig[];
}
```

### XC32ProjectOptions (xc32ProjectGen.ts)
```typescript
interface XC32ProjectOptions {
    projectName: string;
    deviceName: string;
    outputPath: string;
    settings: Map<number, string>;
    heapSize?: number;
    xc32CompilerBinDir?: string;
    dfpPath?: string;
    useMikroeBootloader?: boolean;
    pinConfigurations?: PinConfiguration[];
    timerConfigurations?: TimerConfiguration[];
    uartConfigurations?: UartConfig[];
}
```

---

## File Organization

```
src/
├── extension.ts              # ENTRY POINT - Command registration
├── configEditor.ts           # Backend - Webview management
├── bundledTools.ts           # Tool path resolution
├── makeToolDetector.ts       # GNU Make detection
├── pinManager.ts             # Pin state management
│
├── devices/
│   └── pic32mz/
│       ├── efhDevices.ts     # Device definitions
│       ├── efhRegisterMap.ts # DEVCFG register mapping
│       ├── pinTables.ts      # Pin functions
│       └── ppsMapping.ts     # PPS mappings
│
├── generators/
│   ├── harmonyClkGen.ts      # Clock system
│   ├── harmonyGpioGen.ts     # GPIO peripheral
│   ├── harmonyTimerGen.ts    # Timer peripheral
│   ├── harmonyUartGen.ts     # UART peripheral
│   ├── ppsCodeGen.ts         # PPS config
│   ├── mikrocProjectGen.ts   # MikroC projects
│   └── xc32ProjectGen.ts     # XC32 projects (MAIN GENERATOR)
│
├── webview/
│   ├── configEditor.html     # UI structure
│   ├── configEditor.css      # Styling
│   └── configEditor.js       # Frontend logic (2150+ lines)
│
└── templates/
    ├── xc32/                 # XC32 project templates
    │   ├── RootMakefile.template
    │   ├── SrcsMakefile.template
    │   ├── main.c.template
    │   ├── device.h.template
    │   ├── definitions.h.template
    │   ├── tasks.json.template
    │   └── README.md.template
    └── mz/                   # Peripheral libraries
        ├── clk/
        ├── evic/
        ├── gpio/
        ├── tmr/
        ├── tmr1/
        └── uart/
```

---

## Critical Code Locations

| Function | File | Line | Purpose |
|----------|------|------|---------|
| `activate()` | extension.ts | 22 | Extension entry point |
| `testConfigEditor()` | extension.ts | 85 | Configure Device command |
| `createXC32Project()` | extension.ts | 238 | Create XC32 Project command |
| `flashToDevice()` | extension.ts | 152 | Flash bootloader command |
| `generateXC32Project()` | xc32ProjectGen.ts | 131 | Main project generator |
| `ConfigEditor.show()` | configEditor.ts | 138 | Show config UI |

---

**Last Updated**: December 21, 2025
