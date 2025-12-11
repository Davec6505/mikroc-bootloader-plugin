# Feature: PIC32 Project Generator

**Branch**: `feature/project-generator`  
**Status**: In Development  
**Target Release**: v1.1.0

## Overview

Add comprehensive PIC32 project scaffolding to the mikroc-bootloader-plugin, enabling users to create complete, build-ready projects with proper folder structures, Makefiles, and device configuration code for both XC32 and MikroC compilers.

## Supported Devices (Phase 1)

**PIC32MZ EFH Family** - 8 devices:
- PIC32MZ1024EFH064 (1024KB Flash, 64-pin)
- PIC32MZ1024EFH100 (1024KB Flash, 100-pin)
- PIC32MZ1024EFH124 (1024KB Flash, 124-pin)
- PIC32MZ1024EFH144 (1024KB Flash, 144-pin)
- PIC32MZ2048EFH064 (2048KB Flash, 64-pin)
- PIC32MZ2048EFH100 (2048KB Flash, 100-pin)
- PIC32MZ2048EFH124 (2048KB Flash, 124-pin)
- PIC32MZ2048EFH144 (2048KB Flash, 144-pin)

**Note**: All EFH devices share identical DEVCFG register structure - single register map reused across all variants.

## Architecture

### Three-Layer Config System

```
┌─────────────────────────────────────────────────────┐
│ Layer 1: UI Schema (Dropdown Definitions)          │
│ - 40 settings with friendly names                  │
│ - Valid options per setting                        │
│ - Matches MikroC Edit Project dialog               │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ Layer 2: Config Scheme (.cfgsch XML)               │
│ - MikroC-compatible format                         │
│ - SETTING0-39 with NAME/DESCRIPTION pairs          │
│ - Human-readable, compiler-agnostic                │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ Layer 3: Register Mapper (DEVCFG0-3 hex values)    │
│ - Translates descriptions → register bits          │
│ - Extracted from ClickerMZ_Blinky.lst              │
│ - Generates compiler-specific output               │
└─────────────────────────────────────────────────────┘
```

### Folder Structures

**XC32 Projects** (Hierarchical):
```
project-name/
├── srcs/           # Source files (.c)
├── incs/           # Header files (.h)
├── objs/           # Object files (.o) - build artifacts
├── bins/           # Binary outputs (.hex, .elf)
├── other/          # Map files, disassembly
├── config/
│   └── default/
│       └── initialization.c/h  # Config bits
└── Makefile
```

**MikroC Projects** (Flat):
```
project-name/
├── srcs/
│   └── project.c   # Main file with inline config
├── objs/           # Build artifacts
├── other/          # Compiler outputs
└── Makefile
```

## Workflow

1. **Command**: User runs "MikroC PIC32: Create New Project"
2. **Folder Selection**: Browse/create project root directory
3. **Compiler Selection**: Dropdown - XC32 or MikroC
4. **Device Selection**: Dropdown - 8 EFH devices
5. **Config Editor**: Webview opens with 40 settings (MikroC-style UI)
6. **Generation**: Create folders + Makefiles + config code atomically

## Implementation Tasks

### Phase 1: Foundation (Current)

- [x] Create feature branch
- [x] Document plan
- [ ] Create device database (`src/devices/pic32mz/efhDevices.ts`)
- [ ] Parse .cfgsch file into UI schema (`src/devices/pic32mz/efhUiSchema.ts`)
- [ ] Build register mapper from .lst file (`src/devices/pic32mz/efhRegisterMap.ts`)

### Phase 2: Config Editor

- [ ] Create webview HTML/CSS (`src/webview/configEditor.html`)
- [ ] Implement config editor TypeScript (`src/configEditor.ts`)
- [ ] Add message passing (webview ↔ extension)
- [ ] Implement live register preview
- [ ] Add Save/Load scheme functionality

### Phase 3: Code Generators

- [ ] XC32 config generator (`src/generators/xc32ConfigGen.ts`)
- [ ] MikroC config generator (`src/generators/mikrocConfigGen.ts`)
- [ ] XC32 Makefile template (`src/templates/Makefile.xc32`)
- [ ] MikroC Makefile template (`src/templates/Makefile.mikroc`)

### Phase 4: Project Generator

- [ ] Project creation command registration
- [ ] Multi-step workflow (folder → compiler → device → config)
- [ ] Folder structure creation
- [ ] File generation (Makefile, config, main.c stub)
- [ ] Integration testing

### Phase 5: Polish

- [ ] Bundle default schemes (`resources/schemes/efh/`)
- [ ] Add status bar button "New PIC32 Project"
- [ ] Error handling and validation
- [ ] Update extension README
- [ ] Create demo video

## Key Design Decisions

1. **MikroC .cfgsch Compatibility**: Full XML format support for import/export between MikroC and VS Code
2. **Shared Register Map**: All EFH devices use identical config structure - single mapping file
3. **No Harmony Dependency**: Create Harmony folder structure for XC32 but don't include libraries
4. **Extensible Database**: Architecture supports adding MX series, other MZ families later

## Testing Strategy

- Unit tests for register mapper (description → hex value conversion)
- Integration test: Generate XC32 project → compile with xc32-gcc
- Integration test: Generate MikroC project → compile with mikroC
- Cross-compatibility: Export scheme from MikroC → import to VS Code → verify register values match

## Future Enhancements (Post v1.1.0)

- Add PIC32MX series support
- Pin mapping / PPS configuration (General Output Settings)
- Linker script generation with correct memory sizes
- MPLAB X project file generation (.xproj)
- Device peripheral configuration (UART, SPI, I2C init code)

## References

- MikroC .cfgsch format: `docs/P32MZ2048EFH_24Mhz_200Mhz.cfgsch`
- ClickerMZ_Blinky.lst: Source for register mappings
- Pic32mzCNC_V3: Reference for XC32 folder structure
- ClickerMZ_Blinky: Reference for MikroC folder structure
