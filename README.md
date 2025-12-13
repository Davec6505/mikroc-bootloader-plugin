# PIC32M Development Tools

[![Version](https://img.shields.io/badge/version-1.1.3-blue.svg)](https://github.com/Davec6505/mikroc-bootloader-plugin)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Complete PIC32MZ development toolkit: bootloader flashing, config editor, XC32/MikroC project generator, pin manager, and peripheral configuration.

MikroC requires a purchased license for MikroC Pro for PIC32 from Mikroelektronik, and the application fully installed on the device.

![Demo](https://via.placeholder.com/600x300?text=Add+Demo+GIF+Here)

## Features

### 🚀 Bootloader Flashing
- **One-Click Flashing**: Flash .hex files to PIC32 devices with a single command
- **Status Bar Button**: Quick access button in the status bar (click "⚡ Flash PIC32")
- **Auto-Discovery**: Automatically finds .hex files in your workspace
- **Multiple Files**: Quick picker when multiple .hex files are found
- **Terminal Integration**: See bootloader output in real-time

### ⚙️ Device Configuration Editor (PIC32MZ EC/EF)
- **Visual DEVCFG Editor**: Configure all 40 PIC32MZ configuration settings with dropdown menus
- **Real-time Register Preview**: See DEVCFG0-3 register values update as you configure
- **Clock Calculator**: Automatic system clock calculation from PLL settings
- **Scheme Save/Load**: Save and load configuration schemes for different projects
- **XC32/DFP Version Selection**: Choose compiler and device pack versions
- **Mikroelektronika Bootloader Option**: Enable bootloader-compatible configuration

### 🕐 Timer Configuration
- **All Timer Types**: Configure Timer1 (Type A 16-bit) and Timer2-9 (Type B 16/32-bit)
- **Dual Code Generation**: Generate mikroC or Harmony/XC32 compatible code
- **PBCLK3 Integration**: Automatically uses system clock configuration
- **Interrupt Support**: Configure interrupt priorities and enable flags
- **16/32-bit Mode**: Timer2-9 can operate as 16-bit or combined 32-bit timers

### 📡 UART Configuration *(Under Development)*
- **All UART Modules**: Configure UART1-6 with baud rate calculator
- **Dual Code Generation**: Generate mikroC or Harmony/XC32 compatible code
- **PBCLK2 Integration**: Automatic baud rate calculation from peripheral clock
- **Interrupt Support**: Configure interrupt priorities and enable flags
- **PPS Integration**: Automatic peripheral pin select for TX/RX pins

### 📌 Pin Manager (PIC32MZ EC/EF)
- **Complete Pin Database**: 100+ GPIO pins across PORTA-PORTK
- **Package Support**: 64/100/124/144-pin package configurations
- **GPIO Configuration**: Set pins as input/output with pull-up/pull-down, open-drain
- **Analog Configuration**: Configure 36 analog inputs (AN0-AN35)
- **PPS Support**: Full Peripheral Pin Select for remappable peripherals
- **Dual Code Generation**: Generate mikroC or Harmony/XC32 compatible GPIO code
- **Visual Table**: Filter by GPIO, Analog, PPS, or configured pins

### 🏗️ Project Generator *(Under Development)*
- **XC32 Projects**: Generate complete buildable XC32 projects with Makefiles
- **mikroC Projects**: Generate mikroC PRO for PIC32 projects (planned)
- **Device Configuration**: Automatic integration of DEVCFG settings
- **Peripheral Code**: Integration of Timer, UART, and GPIO initialization code
- **VS Code Tasks**: Build, clean, and flash tasks pre-configured
- **Bundled XC32 Tools**: No external compiler installation required

## Requirements

### What's Included (Bundled)
✅ **MikroC HID Bootloader** (`mikro_hb.exe`) - No download needed!  
✅ **XC32 Compiler Tools** - Essential compiler binaries bundled  
✅ **Device Support Files** - PIC32MZ configuration and headers

### What You Need

#### 1. Hardware
- **PIC32MZ Device** (EC/EF series supported)
- **USB Connection** for bootloader flashing
- Device must have MikroC bootloader firmware installed (for flashing feature)

#### 2. Software
- **VS Code** 1.106.1 or later
- **Windows OS** (tested on Windows 10/11)
- No external compiler installation required - tools are bundled!

## Installation

### From VS Code Marketplace (Recommended)
1. Open VS Code
2. Press `Ctrl+Shift+X` to open Extensions
3. Search for "**PIC32M Development Tools**"
4. Click **Install**

That's it! All tools are bundled - no additional setup required.

### From VSIX File
1. Download the latest `.vsix` from [Releases](https://github.com/Davec6505/mikroc-bootloader-plugin/releases)
2. Open VS Code
3. Press `Ctrl+Shift+P`
4. Type "Install from VSIX"
5. Select the downloaded file

### From Source (Development)
```bash
git clone https://github.com/Davec6505/mikroc-bootloader-plugin.git
cd mikroc-bootloader-plugin
npm install
npm run compile
npx @vscode/vsce package
code --install-extension mikroc-pic32-bootloader-1.1.2.vsix
```

## Usage

### Device Configuration

1. Open Command Palette (`Ctrl+Shift+P`)
2. Type "PIC32: Configure Device"
3. Select your device (currently supports PIC32MZ EC/EF family)
4. Configure settings in the visual editor:
   - **Configuration Tab**: Set oscillator, PLL, watchdog, debug settings
   - **Timer Calculator Tab**: Configure timers with automatic code generation
   - **Pin Manager Tab**: Configure GPIO, analog pins, and PPS mappings
5. Click OK to generate project or save configuration

### Bootloader Flashing

**Method 1: Status Bar Button (Quickest)**
1. Connect your PIC32 device in bootloader mode
2. Click the "⚡ Flash PIC32" button in the status bar
3. Select .hex file if multiple exist
4. Monitor terminal output for flash progress

**Method 2: Command Palette**
1. Press `Ctrl+Shift+P`
2. Type "MikroC PIC32: Flash Device"
3. Select the .hex file to flash
4. Monitor progress in integrated terminal

## Prerequisites

### Common Issues

| Issue | Solution |
|-------|----------|
| "Bootloader path not configured" | Set the path in VS Code settings |
| "No .hex files found" | Ensure your project has compiled .hex files |
| "Exit code: 1" | Device not connected or not in bootloader mode |
| "No output from bootloader" | Check USB connection and device status |

### Debug Steps

1. Verify `mikro_hb.exe` exists at configured path
2. Test bootloader manually: `mikro_hb.exe path\to\file.hex`
3. Check VS Code Output panel (View > Output > MikroC Bootloader)
4. Check terminal output for detailed error messages

## Development

See [readme/DEVELOPER_GUIDE.md](readme/DEVELOPER_GUIDE.md) for:
- Code architecture
- API documentation
- Building from source
- Contributing guidelines

## Documentation Index

Design and internal docs are under the readme/ folder:

- [readme/BUNDLING_GUIDE.md](readme/BUNDLING_GUIDE.md) – Bundling XC32 tools and MikroC bootloader
- [readme/PIN_MANAGER_DESIGN.md](readme/PIN_MANAGER_DESIGN.md) – Pin Manager design and codegen
- [readme/FEATURE_PROJECT_GENERATOR.md](readme/FEATURE_PROJECT_GENERATOR.md) – XC32 project generator design
- [readme/MCC_INTERRUPT_ARCHITECTURE.md](readme/MCC_INTERRUPT_ARCHITECTURE.md) – MCC-style interrupt layering
- [readme/PROJECT_STATUS.md](readme/PROJECT_STATUS.md) – Overall project status and roadmap
- [readme/PUBLISHING.md](readme/PUBLISHING.md) – Publishing and Marketplace notes
- [readme/UART_IMPLEMENTATION_PLAN.md](readme/UART_IMPLEMENTATION_PLAN.md) – UART and PBCLK implementation plan

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/Davec6505/mikroc-bootloader-plugin/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/Davec6505/mikroc-bootloader-plugin/discussions)
- 📧 **Contact**: [Create an issue](https://github.com/Davec6505/mikroc-bootloader-plugin/issues/new)

## Acknowledgments

- MikroElektronika for the MikroC compiler
- Microchip for PIC32 devices and XC32 toolchain
- VS Code team for excellent extension APIs

---

**⭐ If this extension helped you, please star the repo!**
