# Project Structure Analysis - MPLABX vs MikroC

**Date**: December 21, 2025  
**Purpose**: Document the actual project structures for proper importer design

---

## 📁 MPLABX Project Structure

### Example: Pic32mzStepper_OCR

```
Pic32mzStepper_OCR/
├── Pic32mzStepper_OCR.X/          # Main project folder (.X extension)
│   ├── nbproject/                  # MPLABX metadata
│   │   ├── Makefile-default.mk    # Generated build rules
│   │   ├── Makefile-local-default.mk  # ⭐ TOOLCHAIN PATHS HERE
│   │   ├── Makefile-impl.mk
│   │   ├── Makefile-variables.mk
│   │   ├── configurations.xml      # Device, compiler settings
│   │   └── project.xml
│   │
│   ├── global.h
│   ├── speed_control.c
│   ├── speed_control.h
│   ├── startup.S
│   └── Makefile                    # Root Makefile
│
└── src/                            # MCC Generated code
    ├── main.c
    └── config/
        └── default/
            ├── peripheral/
            │   ├── cache/
            │   │   ├── plib_cache.c
            │   │   └── plib_cache_pic32mz.S
            │   ├── clk/
            │   │   └── plib_clk.c
            │   ├── tmr/
            │   │   ├── plib_tmr2.c
            │   │   ├── plib_tmr3.c
            │   │   └── ...
            │   ├── tmr1/
            │   │   └── plib_tmr1.c
            │   ├── uart/
            │   │   └── plib_uart2.c
            │   └── gpio/
            │       └── plib_gpio.c
            │
            ├── interrupts.c
            ├── exceptions.c
            ├── initialization.c
            └── p32MZ2048EFH100.ld  # Linker script
```

### Critical File: `Makefile-local-default.mk`

**Location**: `<ProjectName>.X/nbproject/Makefile-local-default.mk`

**Contains**:
```makefile
# XC32 Compiler Path (Windows format with quotes)
MP_CC_DIR="C:\Program Files\Microchip\xc32\v4.60\bin"

# DFP (Device Family Pack) Path (Windows/Unix hybrid format)
DFP_DIR=C:/Program Files/Microchip/MPLABX/v6.25/packs/Microchip/PIC32MZ-EF_DFP/1.4.168

# All toolchain executables
MP_CC="C:\Program Files\Microchip\xc32\v4.60\bin\xc32-gcc.exe"
MP_CPPC="C:\Program Files\Microchip\xc32\v4.60\bin\xc32-g++.exe"
MP_AS="C:\Program Files\Microchip\xc32\v4.60\bin\xc32-as.exe"
MP_LD="C:\Program Files\Microchip\xc32\v4.60\bin\xc32-ld.exe"
MP_AR="C:\Program Files\Microchip\xc32\v4.60\bin\xc32-ar.exe"
```

**Key Insights**:
1. ✅ **XC32 path is QUOTED** with backslashes
2. ✅ **DFP path is UNQUOTED** with forward slashes
3. ✅ **Version numbers embedded** (v4.60, v6.25, 1.4.168)
4. ✅ These are the **EXACT** paths we need for our Makefiles

### Critical File: `configurations.xml`

**Location**: `<ProjectName>.X/nbproject/configurations.xml`

**Contains**:
```xml
<property key="Device" value="PIC32MZ2048EFH100"/>
<property key="ToolFlavor" value="XC32"/>
<property key="common-include-directories" value="../src;../src/config/default"/>
<property key="preprocessor-macros" value=""/>
```

### Source File List: `Makefile-default.mk`

**Contains**:
```makefile
SOURCEFILES_QUOTED_IF_SPACED=\
    ../src/config/default/peripheral/cache/plib_cache.c \
    ../src/config/default/peripheral/clk/plib_clk.c \
    ../src/config/default/peripheral/tmr/plib_tmr2.c \
    speed_control.c \
    startup.S \
    ../src/main.c
```

---

## 📁 MikroC Project Structure

### Example: Pic32mzCNC

```
Pic32mzCNC/
├── Pic32mzClicker2_StepperControl.mcp32  # ⭐ Main project file
├── Pic32mzClicker2_StepperControl.hex    # Output hex file
├── Pic32mzClicker2_StepperControl.log
├── Pic32mzClicker2_StepperControl.lst
│
├── Main.c
├── Config.c
├── Config.h
├── Stepper.c
├── Stepper.h
├── Kinematics.c
├── Kinematics.h
├── GCODE.c
├── GCODE.h
├── Globals.c
├── Globals.h
├── Serial_Dma.c
├── Serial_Dma.h
├── ... (all source files in root)
│
└── Notes and Todo/          # Subdirectory (uncommon)
```

### Critical File: `.mcp32`

**Location**: `<ProjectName>.mcp32` (root of project)

**Format**: INI-style key-value pairs

**Contains**:
```ini
[DEVICE]
Name=P32MZ2048EFH100
Clock=200000000

[MEMORY_MODEL]
Value=0

[BUILD_TYPE]
Value=0

[ACTIVE_TAB]
Value=Main.c

[USE_HEAP]
Value=1

[HEAP_SIZE]
Value=8000

[FILES]
File0=Main.c
File1=Config.c
File2=Stepper.c
File3=Steptodistance.c
File4=Timers.c
File5=Kinematics.c
File6=Pins.c
File7=Serial_Dma.c
File8=Print.c
File9=GCODE.c
File10=Globals.c
File11=Limits.c
File12=Protocol.c
File13=Nut_Bolts.c
```

### MikroC Compiler Path - STANDARD LOCATION

**Windows**: `C:\Users\Public\Documents\Mikroelektronika\mikroC PRO for PIC32\`

**Key Insights**:
1. ✅ **Flat folder structure** - all .c/.h files in project root
2. ✅ **Simple .mcp32 file** - easy INI parsing
3. ✅ **No complex folder nesting** - unlike MPLABX
4. ✅ **Compiler path is STANDARD** - always same location
5. ✅ **File list explicitly numbered** - File0, File1, File2...

---

## 🔍 What We Need to Extract

### For MPLABX Projects

**Parse `Makefile-local-default.mk`**:
```typescript
interface MPLABXToolchainPaths {
    xc32BinDir: string;      // From MP_CC_DIR (remove quotes)
    dfpDir: string;          // From DFP_DIR
    xc32Version: string;     // Extract from path (e.g., "v4.60")
    dfpVersion: string;      // Extract from path (e.g., "1.4.168")
}
```

**Parse `configurations.xml`**:
```typescript
interface MPLABXProjectConfig {
    deviceName: string;      // <property key="Device" value="..."/>
    compiler: string;        // <property key="ToolFlavor" value="..."/>
    includePaths: string[];  // <property key="common-include-directories" .../>
    defines: Map<string, string>; // <property key="preprocessor-macros" .../>
}
```

**Parse `Makefile-default.mk`**:
```typescript
interface MPLABXSourceFiles {
    sourceFiles: string[];   // From SOURCEFILES_QUOTED_IF_SPACED
    linkerScript: string;    // From MP_LINKER_FILE_OPTION
}
```

### For MikroC Projects

**Parse `.mcp32` file**:
```typescript
interface MikroCProjectConfig {
    deviceName: string;      // [DEVICE] Name=...
    clockFreq: number;       // [DEVICE] Clock=...
    heapSize: number;        // [HEAP_SIZE] Value=...
    sourceFiles: string[];   // [FILES] File0=..., File1=...
}

// Compiler path is CONSTANT
const MIKROC_PIC32_PATH = "C:\\Users\\Public\\Documents\\Mikroelektronika\\mikroC PRO for PIC32\\";
```

---

## 📝 Parsing Strategy

### MPLABX Importer

```typescript
class MPLABXImporter {
    async parseProject(projectPath: string): Promise<ProjectInfo> {
        // 1. Find .X folder
        const xFolder = findXFolder(projectPath);
        
        // 2. Parse Makefile-local-default.mk for toolchain paths
        const makefileLocal = path.join(xFolder, 'nbproject', 'Makefile-local-default.mk');
        const toolchainPaths = this.parseToolchainPaths(makefileLocal);
        
        // 3. Parse configurations.xml for device/settings
        const configXml = path.join(xFolder, 'nbproject', 'configurations.xml');
        const projectConfig = this.parseConfigXml(configXml);
        
        // 4. Parse Makefile-default.mk for source files
        const makefileDefault = path.join(xFolder, 'nbproject', 'Makefile-default.mk');
        const sourceFiles = this.parseSourceFiles(makefileDefault);
        
        return {
            projectType: 'mplabx',
            deviceName: projectConfig.deviceName,
            xc32BinDir: toolchainPaths.xc32BinDir,
            dfpDir: toolchainPaths.dfpDir,
            sourceFiles: sourceFiles,
            ...
        };
    }
    
    private parseToolchainPaths(makefilePath: string) {
        const content = fs.readFileSync(makefilePath, 'utf-8');
        
        // Extract MP_CC_DIR="C:\Program Files\Microchip\xc32\v4.60\bin"
        const ccDirMatch = content.match(/MP_CC_DIR="(.+?)"/);
        const xc32BinDir = ccDirMatch ? ccDirMatch[1] : '';
        
        // Extract DFP_DIR=C:/Program Files/Microchip/.../PIC32MZ-EF_DFP/1.4.168
        const dfpMatch = content.match(/DFP_DIR=(.+)/);
        const dfpDir = dfpMatch ? dfpMatch[1].trim() : '';
        
        return { xc32BinDir, dfpDir };
    }
}
```

### MikroC Importer

```typescript
class MikroCImporter {
    async parseProject(projectPath: string): Promise<ProjectInfo> {
        // 1. Find .mcp32 file
        const mcp32File = findMcp32File(projectPath);
        
        // 2. Parse INI-style file
        const content = fs.readFileSync(mcp32File, 'utf-8');
        
        // Extract [DEVICE] Name=P32MZ2048EFH100
        const deviceMatch = content.match(/\[DEVICE\][^\[]*Name=(.+)/);
        const deviceName = deviceMatch ? deviceMatch[1].trim() : '';
        
        // Extract [FILES] File0=..., File1=...
        const filesSection = content.match(/\[FILES\]([\s\S]*?)(?=\[|$)/);
        const files: string[] = [];
        if (filesSection) {
            const fileMatches = filesSection[1].matchAll(/File\d+=(.+)/g);
            for (const match of fileMatches) {
                files.push(match[1].trim());
            }
        }
        
        return {
            projectType: 'mikroc',
            deviceName,
            sourceFiles: files,
            compilerPath: MIKROC_PIC32_PATH,
            ...
        };
    }
}
```

---

## 🎯 Makefile Generation Differences

### MPLABX → Dynamic Structure

**Needs**:
- `srcs/` - source files
- `incs/` - additional includes
- `objs/` - compiled objects
- `bins/` - output binaries
- `other/` - maps, disassembly
- `docs/` - documentation

**Makefile must include**:
```makefile
# Extracted from MPLABX project
XC32_BIN = C:/Program Files/Microchip/xc32/v4.60/bin
DFP_DIR = C:/Program Files/Microchip/MPLABX/v6.25/packs/Microchip/PIC32MZ-EF_DFP/1.4.168

# Compiler flags
CFLAGS += -mdfp="${DFP_DIR}"
```

### MikroC → Flat Structure

**Needs**:
- `srcs/` - source files (all in one folder)
- `objs/` - compiled objects
- `docs/` - documentation

**Makefile must include**:
```makefile
# Standard MikroC compiler location
MIKROC_PATH = C:/Users/Public/Documents/Mikroelektronika/mikroC PRO for PIC32
```

---

## ✅ Summary

| Aspect | MPLABX | MikroC |
|--------|--------|--------|
| **Project File** | `.X/nbproject/configurations.xml` | `.mcp32` |
| **Toolchain Path** | Parse `Makefile-local-default.mk` | Standard: `C:\Users\Public\...` |
| **Device Name** | XML attribute | INI value |
| **Source Files** | Parse Makefile SOURCEFILES | INI [FILES] section |
| **Structure** | Nested (MCC folders) | Flat (all in root) |
| **Complexity** | High (multiple files) | Low (one .mcp32 file) |
| **Include Paths** | Dynamic (from XML) | Simple (project root) |
| **Linker Script** | MCC generated `.ld` | Built into compiler |

---

**Next Step**: Implement parsers based on this analysis!