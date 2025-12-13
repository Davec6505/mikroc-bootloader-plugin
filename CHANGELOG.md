# Change Log

All notable changes to the "PIC32M Development Tools" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.2] - 2025-12-13

### Changed
- **Documentation**: Improved README grammar and clarity
- **Documentation**: Corrected capitalization (XC32, GNU Make, DFP)
- **Documentation**: Added DFP acronym expansion (Device Family Pack)

## [1.2.1] - 2025-12-13

### Fixed
- **Timer Configuration**: Timer peripheral files (TMR1) now only generate when user clicks Calculate button
- **Configuration UI**: Initialize timer prValue to 0 instead of default 12500 to prevent unwanted file generation

## [1.2.0] - 2025-12-13

### Fixed
- **XC32 Toolchain Detection**: Dynamic multi-drive search for XC32 compiler and DFP paths
- **Path Compatibility**: Convert Windows backslashes to forward slashes for Git Bash make compatibility
- **Build System**: Remove buggy PowerShell auto-detection from Makefile template
- **Error Handling**: Halt project generation with modal error if toolchain not found

### Changed
- **Project Generation**: Toolchain paths now detected at generation time and hardcoded in Makefile
- **Path Detection**: Search across C:, D:, E: drives for XC32 and DFP installations

## [1.1.3] - 2025-12-12

### Changed
- **Updated README**: Added UART section with development status
- **Documentation**: Emphasized bundled tools - no external downloads required
- **Documentation**: Removed confusing external bootloader download instructions
- **Installation**: Simplified to just "install from marketplace"

## [1.1.2] - 2025-12-12

### Changed
- **Rebranded** to "PIC32M Development Tools" (from "MikroC PIC32 Bootloader")
- **Updated description**: Now highlights complete toolkit (config editor, project generator, pin manager)
- Extension ID unchanged for seamless updates

## [1.1.1] - 2025-12-12

### Changed
- **Standardized command names** with `PIC32M:` prefix for consistency
  - `PIC32M: Flash with Bootloader`
  - `PIC32M: Device Configuration Editor`
  - `PIC32M: Generate XC32 Project`
  - `PIC32M: Generate MikroC Project`
- Removed "(Dev)" suffix from command titles

## [1.1.0] - 2025-12-12

### Added
- **Bundled Tools** (37MB) - No external installations required!
  - MikroC HID Bootloader (`mikro_hb.exe`)
  - XC32 Compiler Tools (gcc, ld, as, objcopy, bin2hex)
  - Device Support Files (PIC32MZ headers and configurations)
- **XC32 Project Generator** - Complete buildable project scaffolding
  - Interactive device selection (PIC32MZ EC/EF family)
  - Visual configuration editor with register preview
  - Automatic XC32/DFP version detection
  - MikroE bootloader integration (startup.S, -nostartfiles)
  - Cross-platform Makefile support
  - Integrated peripheral code (Timers, GPIO, interrupts)
  - VS Code build/flash tasks pre-configured
- **Device Configuration Editor** - Visual DEVCFG0-3 configuration
  - 40+ configuration options with dropdowns
  - Real-time register preview
  - Clock calculator with PLL settings
  - Save/load configuration schemes
  - XC32/DFP version selection
- **Timer Configuration** - All Timer1-9 modules
  - Timer1 (Type A 16-bit) and Timer2-9 (Type B 16/32-bit)
  - Dual code generation (mikroC/Harmony XC32)
  - PBCLK3 integration
  - Interrupt support with priority configuration
  - 16/32-bit mode selection
- **Pin Manager** - Complete GPIO configuration
  - 100+ GPIO pins (PORTA-PORTK)
  - Package support (64/100/124/144-pin)
  - GPIO configuration (input/output, pull-up/down, open-drain)
  - 36 analog inputs (AN0-AN35)
  - Full PPS (Peripheral Pin Select) support
  - Dual code generation (mikroC/Harmony XC32)
  - Visual table with filtering

### Changed
- Extension now provides complete embedded development environment
- All tools bundled - zero external dependencies

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