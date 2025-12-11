# MikroC PIC32 Bootloader Extension

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/Davec6505/mikroc-bootloader-plugin)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Flash PIC32 microcontrollers using the MikroC HID bootloader directly from Visual Studio Code.

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

### 🕐 Timer Calculator
- **All Timer Types**: Configure Timer1 (Type A 16-bit) and Timer2-9 (Type B 16/32-bit)
- **Dual Code Generation**: Generate mikroC or Harmony/XC32 compatible code
- **PBCLK3 Integration**: Automatically uses system clock configuration
- **Interrupt Support**: Configure interrupt priorities and enable flags
- **16/32-bit Mode**: Timer2-9 can operate as 16-bit or combined 32-bit timers

### 📌 Pin Manager (PIC32MZ EC/EF)
- **Complete Pin Database**: 100+ GPIO pins across PORTA-PORTK
- **Package Support**: 64/100/124/144-pin package configurations
- **GPIO Configuration**: Set pins as input/output with pull-up/pull-down, open-drain
- **Analog Configuration**: Configure 36 analog inputs (AN0-AN35)
- **PPS Support**: Full Peripheral Pin Select for remappable peripherals
- **Dual Code Generation**: Generate mikroC or Harmony/XC32 compatible GPIO code
- **Visual Table**: Filter by GPIO, Analog, PPS, or configured pins

### 🏗️ Project Generator (In Development)
- **XC32 Projects**: Generate complete buildable XC32 projects with Makefiles
- **mikroC Projects**: Generate mikroC PRO for PIC32 projects (planned)
- **Device Configuration**: Automatic integration of DEVCFG settings
- **Peripheral Code**: Integration of Timer and GPIO initialization code
- **VS Code Tasks**: Build, clean, and flash tasks pre-configured

## Usage

### Required

#### 1. MikroC HID Bootloader
Download and install the MikroC HID bootloader executable:

**Repository:** [MikroC_bootloader](https://github.com/Davec6505/MikroC_bootloader)

**Download Options:**
- Clone the repository: `git clone https://github.com/Davec6505/MikroC_bootloader.git`
- Download the [latest release](https://github.com/Davec6505/MikroC_bootloader/releases)
- Direct download: `mikro_hb.exe` from the `bins/` folder

Save `mikro_hb.exe` to a location on your computer (e.g., `C:\Tools\mikro_hb.exe`)

#### 2. PIC32 Device Requirements
- **PIC32 Device** with MikroC bootloader firmware already installed
- **USB Connection** (or serial connection depending on bootloader mode)
- Device must be in bootloader mode when flashing

#### 3. Compiled Firmware
- `.hex` file generated from your MikroC project

### Recommended
- VS Code 1.106.1 or later
- Windows OS (tested on Windows 10/11)

## Installation

### Step 1: Install the Bootloader Tool

Before using this extension, you need the MikroC HID bootloader:

1. Go to [MikroC_bootloader releases](https://github.com/Davec6505/MikroC_bootloader/releases)
2. Download the latest `mikro_hb.exe`
3. Save it to a permanent location (e.g., `C:\Tools\mikro_hb.exe`)
4. Note this path - you'll need it for VS Code configuration

### Step 2: Install the VS Code Extension

#### From VS Code Marketplace
1. Open VS Code
2. Press `Ctrl+Shift+X` to open Extensions
3. Search for "MikroC PIC32 Bootloader"
4. Click **Install**

#### From VSIX File
1. Download the latest `.vsix` from [Releases](https://github.com/Davec6505/mikroc-bootloader-plugin/releases)
2. Open VS Code
3. Press `Ctrl+Shift+P`
4. Type "Install from VSIX"
5. Select the downloaded file

#### From Source
```bash
git clone https://github.com/Davec6505/mikroc-bootloader-plugin.git
cd mikroc-bootloader-plugin
npm install
npm run compile
npx @vscode/vsce package
code --install-extension mikroc-pic32-bootloader-1.0.0.vsix
```

### Step 3: Configure the Extension

After installing, configure the bootloader path:

1. Open VS Code Settings (`File > Preferences > Settings` or `Ctrl+,`)
2. Search for "MikroC PIC32"
3. Set **Bootloader Path** to where you saved `mikro_hb.exe`

Example:
```json
{
  "mikroc-pic32-bootloader.bootloaderPath": "C:\\Tools\\mikro_hb.exe"
}
```

## Configuration

1. Open VS Code Settings (`File > Preferences > Settings`)
2. Search for "MikroC PIC32"
3. Configure:
   - **Bootloader Path**: Path to your `mikro_hb.exe` location
   - **Hex File Pattern**: Glob pattern for finding .hex files (default: `**/*.hex`)
   - **Show Status Bar Button**: Show/hide the quick access button (default: enabled)

**Example:**
```json
{
  "mikroc-pic32-bootloader.bootloaderPath": "C:\\Tools\\mikro_hb.exe",
  "mikroc-pic32-bootloader.hexFilePattern": "**/*.hex",
  "mikroc-pic32-bootloader.showStatusBarButton": true
}
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

See [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) for:
- Code architecture
- API documentation
- Building from source
- Contributing guidelines

See [PIN_MANAGER_DESIGN.md](PIN_MANAGER_DESIGN.md) for:
- Pin Manager implementation details
- PPS mapping architecture
- Code generation formats

See [FEATURE_PROJECT_GENERATOR.md](FEATURE_PROJECT_GENERATOR.md) for:
- XC32 project generator architecture
- Makefile template system
- Project structure details

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
