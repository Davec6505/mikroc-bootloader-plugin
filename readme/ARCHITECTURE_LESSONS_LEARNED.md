# Architecture Design - Why Simple Wins

**Extension**: PIC32 IDE for VS Code  
**Version**: 2.0.0  
**Philosophy**: Import existing projects, don't reinvent the wheel  
**Last Updated**: December 21, 2025

---

## The Pivot Moment

> **User Quote (December 21, 2025)**:  
> _"I am not convinced we are on the right path anymore, MPLABX generates these perfectly, so does mcc-standalone, why dont we just create a simple utility that asks for the path of MPLABX generated project... let these ides handle the heavy loading we just create the relevant folder structure"_

This insight changed everything.

---

## Old Approach (v1.x) - What We Tried

### Architecture
```
User → VS Code Extension → Custom Config UI
  └─> Device Database
  └─> Peripheral Generators
       ├─> Clock Generator
       ├─> GPIO Generator
       ├─> Timer Generator
       ├─> UART Generator
       ├─> EVIC Generator
       └─> PPS Generator
            └─> MCC-Compatible Code Templates
                 └─> Generate Complete Project
```

### Stats
- **Lines of Code**: ~7000+
- **Files**: 25+ source files
- **Complexity**: Very High
- **Maintainability**: Low
- **Device Support**: 4 PIC32MZ EFH variants only

### What We Built
1. **Device Database** (src/devices/)
   - Device definitions (efhDevices.ts)
   - Register mappings (efhRegisterMap.ts)
   - Pin tables (pinTables.ts - 2000+ lines)
   - PPS mappings (ppsMapping.ts - 1500+ lines)

2. **Configuration UI** (src/webview/)
   - 2150-line JavaScript frontend
   - Multiple tabs (Device, Clock, Timers, UARTs, Pins)
   - Complex state management
   - Heavy message passing

3. **Peripheral Generators** (src/generators/)
   - Clock system (harmonyClkGen.ts)
   - GPIO (harmonyGpioGen.ts)
   - Timers (harmonyTimerGen.ts)
   - UARTs (harmonyUartGen.ts)
   - EVIC interrupts (harmonyEvicGen.ts)
   - PPS routing (ppsCodeGen.ts)

4. **Project Generators**
   - XC32 projects (xc32ProjectGen.ts - 800+ lines)
   - MikroC projects (mikrocProjectGen.ts)

### Why It Failed
1. **Reinventing the Wheel**
   - MPLABX/MCC already generate perfect peripheral code
   - Trying to replicate their functionality = massive duplication

2. **Scope Explosion**
   - Started with 4 devices → needed ALL PIC32 devices
   - Each device needs complete register maps
   - Pin tables grow exponentially (100-pin vs 144-pin)
   - PPS mappings device-specific

3. **Maintenance Nightmare**
   - Every Microchip datasheet update = our code needs updates
   - Testing requires every device variant
   - Bug in generator = affects all generated projects

4. **Limited Value**
   - Users ALREADY use MPLABX/MCC for configuration
   - Our UI less polished than Microchip's
   - Why switch tools when MPLABX works?

---

## New Approach (v2.0) - What Actually Makes Sense

### Architecture
```
User → VS Code Extension
  ├─> Import MPLABX Project
  │    └─> Parse configurations.xml
  │         └─> Extract device, files, settings
  │              └─> Generate Makefiles
  │                   └─> Open in VS Code
  │
  └─> Import MikroC Project
       └─> Parse .mcppi file
            └─> Extract device, files, settings
                 └─> Generate Makefiles
                      └─> Open in VS Code
```

### Stats
- **Lines of Code**: ~600
- **Files**: 3 core files (+ 3 utilities from v1)
- **Complexity**: Low
- **Maintainability**: High
- **Device Support**: ALL PIC32 devices (parser-based)

### What We Actually Build
1. **Project Importers** (src/projectImporter.ts - 200 lines)
   ```typescript
   class MPLABXImporter {
       parseProject(path) {
           // Read configurations.xml (MPLABX project file)
           // Extract: device, source files, includes, defines
           // Return ProjectInfo
       }
   }
   
   class MikroCImporter {
       parseProject(path) {
           // Read .mcppi file (MikroC project file)
           // Extract: device, source files, settings
           // Return ProjectInfo
       }
   }
   ```

2. **Makefile Generator** (src/makefileGenerator.ts - 150 lines)
   ```typescript
   class MakefileGenerator {
       generate(projectInfo, outputPath) {
           // Create folder structure (MPLABX vs MikroC)
           // Generate root Makefile (build orchestrator)
           // Generate srcs/Makefile (dynamic compilation)
           // Copy source files (optional restructure)
       }
   }
   ```

3. **Extension Entry** (src/extension.ts - 250 lines)
   ```typescript
   function activate(context) {
       // Command: Import MPLABX Project
       // Command: Import MikroC Project
       // Command: Build Project (make)
       // Command: Flash Device (mikro_hb)
   }
   ```

### Why It Works
1. **Leverages Existing Tools**
   - MPLABX/MCC handle peripheral configuration (complex)
   - We handle VS Code integration (simple)
   - User gets best of both worlds

2. **Universal Device Support**
   - Parser-based = works with ANY device MPLABX supports
   - No device database needed
   - No maintenance when Microchip updates chips

3. **Simple Maintenance**
   - Only maintain parsers (stable format)
   - Only maintain Makefile templates (rarely change)
   - No peripheral-specific code

4. **Clear Value Proposition**
   - Use MPLABX for configuration (what it's good at)
   - Use VS Code for coding (what you prefer)
   - Clean Makefile-based builds (cross-platform)
   - Organized folder structure

---

## Folder Structure Strategy

### MPLABX Projects → Dynamic Structure
```
project_name/
├── srcs/              # All source files
├── incs/              # Additional headers (libs, etc.)
├── objs/              # Compiled .o files
├── bins/              # Output .elf and .hex
├── other/             # Map files, disassembly
├── docs/              # Documentation
├── Makefile           # Root orchestrator
└── srcs/Makefile      # Dynamic compilation
```

**Why**: MPLABX projects can have complex structures:
- Multiple libraries
- External dependencies
- Custom include paths
- Linker scripts
- Need flexibility for organization

### MikroC Projects → Flat Structure
```
project_name/
├── srcs/              # All source files
├── objs/              # Compiled .o files
├── docs/              # Documentation
├── Makefile           # Root orchestrator
└── srcs/Makefile      # Compilation rules
```

**Why**: MikroC projects are simpler:
- Flat file organization
- No complex dependencies
- Minimal includes
- Keep it simple

---

## Design Principles That Emerged

### 1. Don't Fight Existing Tools
❌ **Wrong**: Try to replicate MPLABX/MCC functionality  
✅ **Right**: Parse their output and add value elsewhere

### 2. Parser > Generator
❌ **Wrong**: Generate code from scratch  
✅ **Right**: Parse existing projects and restructure

### 3. Simple > Complete
❌ **Wrong**: Support every possible feature  
✅ **Right**: Support common workflows really well

### 4. Maintainable > Feature-Rich
❌ **Wrong**: 7000 lines with all bells/whistles  
✅ **Right**: 600 lines that work reliably

### 5. User Workflow > Technical Purity
❌ **Wrong**: "Proper" architecture with plugins  
✅ **Right**: Simple commands that solve real problems

---

## What We Kept from v1.x

These parts actually made sense:

1. **Tool Management** (bundledTools.ts, makeToolDetector.ts, toolDownloader.ts)
   - Bundled make.exe for Windows
   - Bundled mikro_hb.exe bootloader
   - Cross-platform tool detection

2. **Makefile Templates** (templates/xc32/)
   - RootMakefile.template
   - SrcsMakefile.template
   - README.md.template
   - tasks.json.template

3. **Flash Integration**
   - Find .hex files
   - Launch bootloader
   - Simple terminal commands

---

## Code Comparison

### Old v1.x: Configure Timer
```typescript
// In configEditor.ts (backend - 100+ lines)
function handleTimerConfiguration(message) {
    const config = validateTimerConfig(message.config);
    const registers = calculateTimerRegisters(config);
    const ipc = calculateTimerIPC(config);
    this.timerConfigs.set(config.timer, {config, registers, ipc});
    panel.webview.postMessage({type: 'timerConfigured', ...});
}

// In configEditor.js (frontend - 200+ lines)
function calculateTimer() {
    const timer = document.getElementById('timerSelect').value;
    const period = parseFloat(document.getElementById('timerPeriod').value);
    // ... 100+ more lines of calculation/validation
    const config = {timer, period, prescaler, prValue, ...};
    vscode.postMessage({type: 'configureTimer', config});
}

// In harmonyTimerGen.ts (generator - 400+ lines)
function generateTimerSource(config) {
    const template = loadTemplate('tmr1/plib_tmr1.c.ftl');
    const code = template
        .replace('${TIMER_INSTANCE_NAME}', 'TMR1')
        .replace('${PR_VALUE}', config.prValue.toString())
        // ... 50+ more replacements
    return code;
}

// Total: ~700+ lines for one peripheral
```

### New v2.0: Import Project with Timers
```typescript
// In projectImporter.ts (parser - 30 lines)
class MPLABXImporter {
    parseProject(path: string): ProjectInfo {
        const xml = fs.readFileSync(`${path}/nbproject/configurations.xml`);
        const device = extractDeviceFrom(xml);
        const files = findAllSourceFiles(path);
        // Timers already configured in MPLABX project files
        return {device, sourceFiles: files, ...};
    }
}

// In makefileGenerator.ts (generator - 20 lines)
class MakefileGenerator {
    generate(info: ProjectInfo, output: string) {
        fs.mkdirSync(`${output}/srcs`);
        // Copy all source files (including timer code from MPLABX)
        info.sourceFiles.forEach(f => fs.copySync(f, `${output}/srcs/`));
        this.generateMakefiles(info, output);
    }
}

// Total: ~50 lines to import entire project with ALL peripherals
```

---

## Lessons for Future Projects

### When Building Dev Tools

1. **Identify What Users Already Have**
   - Don't duplicate working tools
   - Find gaps, not overlaps

2. **Parse Don't Generate**
   - If data exists, parse it
   - Generation = maintenance burden

3. **Start Simple, Stay Simple**
   - 600 lines beats 7000 every time
   - Complexity grows; simplicity is discipline

4. **Listen to Users**
   - "MPLABX generates these perfectly" = pivot moment
   - Users know their workflow better than you

5. **Value Add, Don't Replicate**
   - MPLABX: Configuration UI ✅
   - VS Code: Editing experience ✅
   - Extension: Bridge between them ✅

---

## Metrics

| Metric | v1.x (Old) | v2.0 (New) | Improvement |
|--------|------------|------------|-------------|
| Lines of Code | ~7000 | ~600 | **91% reduction** |
| Source Files | 25+ | 3 core | **88% fewer** |
| Device Support | 4 variants | All PIC32 | **Unlimited** |
| Maintenance | High | Low | **Easier** |
| User Value | Config UI | Import + Build | **Clearer** |
| Time to Market | Months | Days | **Faster** |

---

## Conclusion

**The best code is the code you don't write.**

MPLABX and MikroC already solve the hard problem (peripheral configuration, device support, code generation). Our job is to make VS Code the best environment for EDITING that code, not generating it.

Simple wins.

---

**Old Approach**: Fight the tools → Complex → Maintenance nightmare  
**New Approach**: Work with the tools → Simple → Maintainable forever
