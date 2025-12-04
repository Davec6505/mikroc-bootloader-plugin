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

### Planned Features
- Serial port bootloader support (--serial mode)
- Progress indicator during flash operation
- Remember last-used .hex file
- Custom keyboard shortcut configuration
- Status bar integration
- Support for multiple bootloader tools
- Linux/macOS support

---

**Note**: For older versions, see [GitHub Releases](https://github.com/Davec6505/mikroc-bootloader-plugin/releases)