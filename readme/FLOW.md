# Code Flow - PIC32 IDE for VS Code

**Architecture**: Import-based (MPLABX/MikroC) → Parse → Generate Makefiles → Build  
**Last Updated**: December 21, 2025 (v2.0 - Complete Rewrite)

---

## Extension Entry Point

**File**: `src/extension.ts`  
**Function**: `activate(context: vscode.ExtensionContext)`

This is where the extension starts when VS Code loads.

---

## Philosophy: Let MPLABX/MikroC Do The Heavy Lifting

**Old Approach** (v1.x): Try to replicate MCC/MPLABX functionality  
❌ 7000+ lines of code  
❌ Complex peripheral generators  
❌ Device-specific configuration  
❌ Hard to maintain

**New Approach** (v2.0): Import existing projects and restructure  
✅ ~600 lines of code  
✅ Parse existing projects  
✅ Generate clean Makefiles  
✅ Simple and maintainable

---

## Main Command Flows

### 1. Import MPLABX Project

**Trigger**: Command Palette → "PIC32 IDE: Import MPLABX Project"  
**Command ID**: `pic32-ide.importMPLABX`

```
User Action: Select MPLABX project folder
  │
  ├─> MPLABXImporter.parseProject() [projectImporter.ts]
  │    ├─> Find .X folder
  │    ├─> Parse nbproject/configurations.xml
  │    ├─> Extract:
  │    │    ├─> Device name (e.g., PIC32MZ2048EFH100)
  │    │    ├─> Compiler (XC32)
  │    │    ├─> All source files (.c, .cpp, .S)
  │    │    ├─> All header files (.h, .hpp)
  │    │    ├─> Include paths
  │    │    ├─> Preprocessor defines
  │    │    └─> Linker script (.ld)
  │    └─> Return ProjectInfo
  │
  ├─> User selects output folder
  │
  ├─> MakefileGenerator.generate() [makefileGenerator.ts]
  │    ├─> Create folder structure:
  │    │    ├─> srcs/  (source files)
  │    │    ├─> incs/  (additional headers)
  │    │    ├─> objs/  (compiled objects)
  │    │    ├─> bins/  (output .elf, .hex)
  │    │    ├─> other/ (maps, disassembly)
  │    │    └─> docs/  (documentation)
  │    │
  │    ├─> Generate Root Makefile:
  │    │    ├─> Project variables (name, device)
  │    │    ├─> Toolchain paths (xc32-gcc, xc32-ld, etc.)
  │    │    ├─> Targets: all, clean, flash
  │    │    ├─> Link command with proper flags
  │    │    └─> HEX file generation
  │    │
  │    └─> Generate srcs/Makefile:
  │         ├─> Dynamic source file list
  │         ├─> Include paths from parsed project
  │         ├─> Preprocessor defines
  │         ├─> Compilation rules (.c → .o)
  │         └─> Assembly rules (.S → .o)
  │
  └─> Ask user: "Open Project" or "Open in New Window"
```

---

### 2. Import MikroC Project

**Trigger**: Command Palette → "PIC32 IDE: Import MikroC Project"  
**Command ID**: `pic32-ide.importMikroC`

```
User Action: Select MikroC project (.mcppi file or folder)
  │
  ├─> MikroCImporter.parseProject() [projectImporter.ts]
  │    ├─> Find .mcppi file
  │    ├─> Parse INI-style config:
  │    │    ├─> Device name
  │    │    └─> Project settings
  │    ├─> Find all source files (.c, .cpp)
  │    ├─> Find all header files (.h, .hpp)
  │    └─> Return ProjectInfo
  │
  ├─> User selects output folder
  │
  ├─> MakefileGenerator.generate() [makefileGenerator.ts]
  │    ├─> Create FLAT folder structure (MikroC style):
  │    │    ├─> srcs/  (source files)
  │    │    ├─> objs/  (compiled objects)
  │    │    └─> docs/  (documentation)
  │    │
  │    ├─> Generate Root Makefile (simpler than MPLABX)
  │    └─> Generate srcs/Makefile
  │
  └─> Ask user: "Open Project" or "Open in New Window"
```

---

### 3. Build Project

**Trigger**: Command Palette → "PIC32 IDE: Build Project"  
**Command ID**: `pic32-ide.build`

```
buildProject() [extension.ts]
  └─> Create terminal
       └─> Execute: make
            ├─> Root Makefile calls srcs/Makefile
            ├─> Compile all .c/.S files → objs/*.o
            ├─> Link → bins/project.elf
            ├─> Generate → bins/project.hex
            └─> Display size information
```

---

### 4. Flash Device

**Trigger**: Status Bar "⚡ Flash PIC32" or Command Palette  
**Command ID**: `pic32-ide.flash`

```
flashDevice() [extension.ts]
  ├─> Find .hex files in workspace
  ├─> If multiple → User selects one
  └─> Execute: mikro_hb "path/to/file.hex"
```

---

## Key Data Structures

### ProjectInfo (projectImporter.ts)
```typescript
interface ProjectInfo {
    projectType: 'mplabx' | 'mikroc';
    projectName: string;
    deviceName: string;           // e.g., PIC32MZ2048EFH100
    sourceFiles: string[];        // Absolute paths to .c/.cpp/.S files
    headerFiles: string[];        // Absolute paths to .h/.hpp files
    includePaths: string[];       // -I paths
    defines: Map<string, string>; // -D KEY=VALUE
    linkerScript?: string;        // Path to .ld file (MPLABX)
    compiler: string;             // 'XC32' or 'mikroC'
    compilerPath?: string;        // Optional override
}
```

### MakefileOptions (makefileGenerator.ts)
```typescript
interface MakefileOptions {
    projectInfo: ProjectInfo;
    outputPath: string;
    makeToolPath?: string;        // Custom make.exe
    optimizationLevel?: string;   // -O0, -O1, -O2, -O3, -Os
}
```

---

## Generated Folder Structures

### MPLABX Projects (Dynamic Structure)
```
project_name/
├── srcs/              # Source files from MPLABX project
│   └── Makefile       # Dynamic compilation rules
│
├── incs/              # Additional include files
├── objs/              # Compiled object files
├── bins/              # Output binaries (.elf, .hex)
├── other/             # Map files, disassembly
├── docs/              # Documentation
│
└── Makefile           # Root build orchestrator
```

### MikroC Projects (Flat Structure)
```
project_name/
├── srcs/              # Source files from MikroC project
│   └── Makefile       # Dynamic compilation rules
│
├── objs/              # Compiled object files
├── docs/              # Documentation
│
└── Makefile           # Root build orchestrator
```

---

## File Organization (Extension Source)

```
src/
├── extension.ts              # 250 lines - Main entry point
│   ├─> importMPLABXProject()
│   ├─> importMikroCProject()
│   ├─> buildProject()
│   └─> flashDevice()
│
├── projectImporter.ts        # 200 lines - Parse projects
│   ├─> MPLABXImporter
│   │    └─> parseProject() → ProjectInfo
│   └─> MikroCImporter
│        └─> parseProject() → ProjectInfo
│
├── makefileGenerator.ts      # 150 lines - Generate Makefiles
│   └─> MakefileGenerator
│        ├─> generate()
│        ├─> generateRootMakefile()
│        └─> generateSrcsMakefile()
│
├── bundledTools.ts           # Tool path management (kept from v1)
├── makeToolDetector.ts       # GNU Make detection (kept from v1)
└── toolDownloader.ts         # Tool downloader (kept from v1)

templates/
└── xc32/
    ├── RootMakefile.template
    ├── SrcsMakefile.template
    ├── README.md.template
    └── tasks.json.template

bin/
└── win32/
    ├── make.exe              # Bundled GNU Make
    └── mikro_hb.exe          # MikroElektronika bootloader
```

---

## Why This Approach is Better

### Old v1.x Architecture Problems
1. **Reinventing the wheel** - Tried to replicate MCC/MPLABX
2. **Device-specific code** - Needed database for every device
3. **Peripheral generators** - 8 complex generator modules
4. **UI complexity** - 2150-line frontend monolith
5. **Hard to maintain** - 7000+ lines of code
6. **Limited scope** - Only PIC32MZ EFH family

### New v2.0 Architecture Benefits
1. **Let experts handle complexity** - MPLABX/MikroC generate correct code
2. **Device-agnostic** - Works with ANY device MPLABX/MikroC supports
3. **Simple parsing** - Just read XML/INI files
4. **No UI needed** - File dialogs only
5. **Easy to maintain** - ~600 lines total
6. **Universal scope** - Works with ALL PIC32 devices (MX, MZ, MM, etc.)

---

## Build Flow Example

```bash
# User runs: Build Project

make
├─> Root Makefile
│    ├─> Creates objs/, bins/ directories
│    ├─> Calls: make -C srcs
│    │    └─> srcs/Makefile
│    │         ├─> Compiles: src1.c → objs/src1.o
│    │         ├─> Compiles: src2.c → objs/src2.o
│    │         └─> Compiles: startup.S → objs/startup.o
│    │
│    ├─> Links: xc32-gcc objs/*.o → bins/project.elf
│    ├─> Size: xc32-size bins/project.elf
│    └─> HEX: xc32-objcopy → bins/project.hex
│
└─> Output: "Build complete!"
```

---

**Total Extension Code**: ~600 lines (down from 7000+)  
**Complexity**: Simple (down from extremely complex)  
**Maintainability**: High (up from low)  
**Device Support**: Universal (up from 4 devices)
