# Change Log

All notable changes to the "MikroC PIC32 Bootloader" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-04

### Added
- Initial release of MikroC PIC32 Bootloader extension
- **Status bar button** for quick one-click flashing (⚡ Flash PIC32)
- One-click flashing of .hex files to PIC32 devices
- Automatic .hex file discovery in workspace
- Quick picker for selecting from multiple .hex files
- Real-time terminal output during flashing
- Configurable bootloader path and hex file pattern
- **Configurable status bar button** visibility (show/hide)
- Comprehensive error handling with actionable messages
- Professional documentation (README, DEVELOPER_GUIDE, VIDEO_TUTORIALS)
- MIT License
- Contributing guidelines
- Security policy

### Features
- Command: "MikroC PIC32: Flash Device"
- Status bar button with lightning bolt icon
- Configuration: Bootloader path setting
- Configuration: Hex file pattern setting (glob)
- Configuration: Status bar button visibility toggle
- Terminal integration for live output
- Error detection (exit codes, missing files, device not connected)

### Documentation
- Complete README with installation and usage instructions
- Developer guide with code walkthrough and learning resources
- Video tutorial compilation for learning VS Code extension development
- Contributing guidelines
- Security policy

## [Unreleased]

### Added - 2025-12-08
- **XC32 Project Generator** - Full-featured project scaffolding
  - VS Code command: "PIC32: Create XC32 Project"
  - Interactive device selection (PIC32MZ EFH family)
  - Visual configuration editor with register preview
  - Automatic XC32 compiler and DFP version detection
  - MikroE bootloader integration (startup.S, -nostartfiles)
  - Cross-platform Makefile support (Windows PowerShell/Linux/macOS)
  - Dynamic source discovery (6 levels deep)
  - Flat directory structure (bins/, objs/, libs/, other/)
  - Template system with variable substitution
  - Proper header organization (build_dir moves .h files to incs/)

- **MikroC Project Generator** - MikroC PRO for PIC32 support
  - VS Code command: "PIC32: Create MikroC Project"
  - Same visual configuration as XC32
  - Generates .cfg, .c.ini, and Makefile
  - MikroC compiler integration
  - System clock calculation from PLL settings

- **Enhanced Config Editor**
  - Manual XC32 compiler version selection (dropdown)
  - Manual DFP version selection (dropdown)  
  - Recursive DFP search (multiple drives, 3 levels deep)
  - Heap size configuration (input field)
  - MikroE bootloader checkbox
  - System clock calculation display
  - Real-time register preview

- **Template System**
  - XC32 templates: main.c, Makefiles, tasks.json, c_cpp_properties.json
  - XC32 config templates: definitions.h, device.h, initialization.c
  - MikroE bootloader: startup.S (modified crt0.s)
  - MikroC templates: main.c, Makefiles, README
  - Variable substitution: {{PROJECT_NAME}}, {{DEVICE}}, {{SYSTEM_CLOCK}}, etc.

- **Build System**
  - XC32 Makefile based on Makefile_Generic structure
  - DRY_RUN support for testing directory operations
  - Cross-platform macros (MKDIR, RMDIR, MOVE, RM)
  - PowerShell compatibility (Windows)
  - Bash compatibility (Linux/macOS)
  - Dynamic source file discovery with exclusions
  - Explicit config/default/*.c handling
  - MikroE bootloader conditional startup.o compilation
  - IntelliSense configuration with proper paths

### Changed - 2025-12-08
- Config editor returns extended result object (config, heapSize, xc32Version, dfpVersion, useMikroeBootloader)
- System clock calculation now handles FRC (8 MHz) and primary oscillator (24 MHz)
- Extension activation includes project generator commands
- Package.json scripts updated for template copying

### Fixed - 2025-12-08
- XC32 include paths now use user-selected versions (not hardcoded v4.35)
- DFP paths in c_cpp_properties.json now user-selected
- Project name validation allows hyphens (not just alphanumeric + underscore)
- Output path auto-created if doesn't exist (no validation error)
- Single root project directory (not double-nested)
- Config directory created in correct location (srcs/config/default)
- Initialization.c includes proper headers (definitions.h, device.h)
- Main.c includes definitions.h (not initialization.h)
- SYS_Initialize() call signature includes NULL parameter

### Planned Features
- Serial port bootloader support (--serial mode)
- Progress indicator during flash operation
- Remember last-used .hex file
- Custom keyboard shortcut configuration
- Status bar integration
- Support for multiple bootloader tools
- Additional PIC32 families (MX, MM, MK)

---

**Note**: For older versions, see [GitHub Releases](https://github.com/Davec6505/mikroc-bootloader-plugin/releases)