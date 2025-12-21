# Plugin Separation Strategy

**Date**: December 21, 2025  
**Decision**: Split into TWO separate VS Code extensions that work hand-in-hand

---

## 🎯 The Two Extensions

### 1. **PIC32 Project Tools** (This Extension)
**Purpose**: Project import, Makefile generation, and building

**Responsibilities**:
- ✅ Import MPLABX projects
- ✅ Import MikroC projects  
- ✅ Parse project files (configurations.xml, .mcp32)
- ✅ Extract XC32/DFP toolchain paths
- ✅ Generate dynamic Makefiles
- ✅ Build projects (make command)
- ✅ Manage folder structure (srcs/, objs/, bins/, etc.)

**Commands**:
- `pic32-project.importMPLABX`
- `pic32-project.importMikroC`
- `pic32-project.build`
- `pic32-project.clean`

**Does NOT include**: Flashing/bootloader functionality

---

### 2. **MikroC Bootloader Flash** (Separate Extension)
**Purpose**: Flash .hex files to PIC32 devices using MikroElektronika bootloader

**Responsibilities**:
- ✅ Detect .hex files in workspace
- ✅ Flash via USB (mikro_hb.exe)
- ✅ Flash via Serial + USB (mikro_hb.exe --serial)
- ✅ Manage bootloader binary (bin/mikro_hb.exe)
- ✅ Terminal integration for flashing
- ✅ Status bar integration (⚡ Flash button)

**Commands**:
- `mikroc-bootloader.flashUSB`
- `mikroc-bootloader.flashSerial`
- `mikroc-bootloader.selectHexFile`

**Does NOT include**: Project creation, building, or compilation

---

## 🤝 How They Work Together

### Workflow Example

```
1. User: "Import MPLABX Project"
   └─> PIC32 Project Tools
        ├─> Parse configurations.xml
        ├─> Extract XC32/DFP paths
        ├─> Generate Makefiles
        └─> Open project in VS Code

2. User: Edit code in VS Code
   
3. User: "Build Project"
   └─> PIC32 Project Tools
        ├─> Run make command
        └─> Generate bins/project.hex

4. User: "Flash Device" (Status bar ⚡ button)
   └─> MikroC Bootloader Flash
        ├─> Find .hex files (from any source!)
        ├─> User selects bins/project.hex
        └─> Flash via mikro_hb.exe
```

---

## 📦 Extension Packages

### PIC32 Project Tools Extension

```
pic32-project-tools/
├── package.json
│   ├─> name: "pic32-project-tools"
│   ├─> displayName: "PIC32 Project Tools"
│   ├─> commands: import, build, clean
│   └─> dependencies: None (standalone)
│
├── src/
│   ├── extension.ts
│   ├── projectImporter.ts
│   ├── makefileGenerator.ts
│   ├── makeToolDetector.ts
│   └── bundledTools.ts
│
├── templates/
│   └── xc32/
│       ├── RootMakefile.template
│       ├── SrcsMakefile.template
│       └── README.md.template
│
└── bin/
    └── win32/
        └── make.exe  (GNU Make for Windows)
```

### MikroC Bootloader Flash Extension

```
mikroc-bootloader-flash/
├── package.json
│   ├─> name: "mikroc-bootloader-flash"
│   ├─> displayName: "MikroC Bootloader Flash"
│   ├─> commands: flashUSB, flashSerial
│   └─> extensionDependencies: [] (works standalone)
│
├── src/
│   ├── extension.ts
│   ├── hexFileFinder.ts
│   └── bootloaderFlasher.ts
│
└── bin/
    └── win32/
        └── mikro_hb.exe  (MikroElektronika bootloader)
```

---

## 🔗 Integration Points

### Both Extensions Work Independently

**PIC32 Project Tools** can be used WITHOUT bootloader:
- User might flash with MPLAB IPE
- User might flash with PICkit
- User might use different bootloader

**MikroC Bootloader Flash** can be used WITHOUT project tools:
- User might build with MPLABX IDE
- User might build with MikroC IDE
- User might receive .hex from colleague

### But They Enhance Each Other

When BOTH installed:
```typescript
// PIC32 Project Tools can suggest bootloader extension
if (!isExtensionInstalled('mikroc-bootloader-flash')) {
    vscode.window.showInformationMessage(
        'Install MikroC Bootloader Flash for easy device programming',
        'Install'
    ).then(selection => {
        if (selection === 'Install') {
            vscode.commands.executeCommand(
                'workbench.extensions.installExtension',
                'publisher.mikroc-bootloader-flash'
            );
        }
    });
}
```

---

## 🎨 User Experience

### Status Bar

**PIC32 Project Tools**:
- 🔨 Build button (when project detected)
- Shows build status (Success ✓ / Failed ✗)

**MikroC Bootloader Flash**:
- ⚡ Flash button (when .hex files detected)
- Shows flash status (Flashing... / Done ✓)

### Command Palette

**PIC32 Project Tools**:
```
> PIC32 Project: Import MPLABX Project
> PIC32 Project: Import MikroC Project  
> PIC32 Project: Build
> PIC32 Project: Clean
```

**MikroC Bootloader Flash**:
```
> MikroC Bootloader: Flash via USB
> MikroC Bootloader: Flash via Serial + USB
> MikroC Bootloader: Select Hex File
```

---

## 📝 Benefits of Separation

### 1. **Single Responsibility**
- Each extension does ONE thing well
- Easier to understand and maintain
- Clear purpose for users

### 2. **Independent Updates**
- Update bootloader support without touching project tools
- Update project import without touching bootloader
- Faster release cycles

### 3. **User Choice**
- Users can install only what they need
- Not everyone uses MikroC bootloader
- Not everyone needs project import

### 4. **Cleaner Codebase**
- ~300 lines per extension (vs 600 combined)
- No mixed responsibilities
- Better testing

### 5. **Better Marketplace Presence**
- Two focused extensions vs one "does everything"
- Better search results (specific keywords)
- Users find what they actually need

---

## 🚀 Migration Strategy

### Current State
```
mikroc-bootloader-plugin/
├─> Contains: importers + makefiles + bootloader + make.exe + mikro_hb.exe
└─> Problem: Mixed responsibilities
```

### Target State

**Repository 1**: `pic32-project-tools/`
```
├─> Contains: importers + makefiles + make.exe
├─> Publishes: pic32-project-tools extension
└─> Independent release cycle
```

**Repository 2**: `mikroc-bootloader-flash/`
```
├─> Contains: hex finder + flasher + mikro_hb.exe
├─> Publishes: mikroc-bootloader-flash extension  
└─> Independent release cycle
```

### Steps

1. ✅ **Finish current extension first** (PIC32 Project Tools)
   - Complete MPLABX importer
   - Complete MikroC importer
   - Complete Makefile generator
   - Test thoroughly

2. 📦 **Extract bootloader code**
   - Create new repository
   - Move flash functionality
   - Move mikro_hb.exe binary
   - Update package.json

3. 🧪 **Test both together**
   - Install both extensions
   - Verify workflow (import → build → flash)
   - Ensure no conflicts

4. 🚀 **Publish separately**
   - pic32-project-tools to marketplace
   - mikroc-bootloader-flash to marketplace
   - Cross-reference in READMEs

---

## 📋 Current Extension Becomes

**Name**: PIC32 Project Tools  
**Focus**: Import existing IDE projects into VS Code  
**Value**: Clean Makefile-based builds, organized folder structure

**Removes**:
- Flash commands
- mikro_hb.exe binary
- Bootloader-specific settings

**Keeps**:
- Project importers
- Makefile generator  
- Build commands
- make.exe binary
- Tool detection

---

## ✅ Decision Summary

| Aspect | Single Extension (Old) | Two Extensions (New) |
|--------|------------------------|----------------------|
| **Lines of Code** | 600 total | 300 + 300 |
| **Responsibilities** | Mixed | Clear |
| **User Choice** | All or nothing | Install what you need |
| **Maintenance** | Coupled updates | Independent updates |
| **Testing** | Complex | Simple |
| **Marketplace** | Generic listing | Focused listings |

---

**Next Action**: Focus on completing PIC32 Project Tools, then extract bootloader later
