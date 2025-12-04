# MikroC PIC32 Bootloader Extension

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/Davec6505/mikroc-bootloader-plugin)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Flash PIC32 microcontrollers using the MikroC HID bootloader directly from Visual Studio Code.

![Demo](https://via.placeholder.com/600x300?text=Add+Demo+GIF+Here)

## Features

- 🚀 **One-Click Flashing**: Flash .hex files to PIC32 devices with a single command
- ⚡ **Status Bar Button**: Quick access button in the status bar (click "⚡ Flash PIC32")
- 🔍 **Auto-Discovery**: Automatically finds .hex files in your workspace
- 📁 **Multiple Files**: Quick picker when multiple .hex files are found
- 💻 **Terminal Integration**: See bootloader output in real-time
- ⚙️ **Configurable**: Customize bootloader path, file patterns, and UI elements
- 🛡️ **Error Handling**: Clear, actionable error messages

## Prerequisites

### Required
- **MikroC HID Bootloader**: Download from [MikroC_bootloader](https://github.com/Davec6505/MikroC_bootloader)
- **PIC32 Device**: With MikroC bootloader firmware installed
- **USB Connection**: Or serial connection (depending on bootloader mode)

### Recommended
- VS Code 1.106.1 or later
- Windows OS (tested on Windows 10/11)

## Installation

### From VS Code Marketplace (Coming Soon)
1. Open VS Code
2. Press `Ctrl+Shift+X` to open Extensions
3. Search for "MikroC PIC32 Bootloader"
4. Click **Install**

### From VSIX File
1. Download the latest `.vsix` from [Releases](https://github.com/Davec6505/mikroc-bootloader-plugin/releases)
2. Open VS Code
3. Press `Ctrl+Shift+P`
4. Type "Install from VSIX"
5. Select the downloaded file

### From Source
```bash
git clone https://github.com/Davec6505/mikroc-bootloader-plugin.git
cd mikroc-bootloader-plugin
npm install
npm run compile
npx @vscode/vsce package
code --install-extension mikroc-pic32-bootloader-1.0.0.vsix
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

### Basic Workflow

**Method 1: Status Bar Button (Quickest)**
1. **Connect Device**: Connect your PIC32 device and ensure it's in bootloader mode
2. **Click Button**: Click the "⚡ Flash PIC32" button in the status bar (bottom-left)
3. **Select File**: If multiple .hex files exist, select the one to flash
4. **Monitor**: Watch the terminal output for flash progress

**Method 2: Command Palette**
1. **Connect Device**: Connect your PIC32 device and ensure it's in bootloader mode
2. **Open Project**: Open your MikroC project workspace in VS Code
3. **Flash**: Press `Ctrl+Shift+P` and type "MikroC PIC32: Flash Device"
4. **Select File**: If multiple .hex files exist, select the one to flash
5. **Monitor**: Watch the terminal output for flash progress

### Keyboard Shortcut (Optional)

Add a custom keybinding in `keybindings.json`:
```json
{
  "key": "ctrl+alt+f",
  "command": "mikroc-pic32-bootloader.flash"
}
```

## Troubleshooting

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

## Learning Resources

See [VIDEO_TUTORIALS.md](VIDEO_TUTORIALS.md) for:
- VS Code extension development tutorials
- TypeScript learning resources
- Step-by-step guides

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
- VS Code team for excellent extension APIs

---

**⭐ If this extension helped you, please star the repo!**

## Features

- Flash .hex files to PIC32 devices via USB HID
- Automatic detection of .hex files in your workspace
- Quick picker when multiple .hex files are found
- Integrated terminal output for bootloader status

## Usage

1. Open a workspace containing your PIC32 project with .hex files
2. Press `Ctrl+Shift+P` and type "Flash to PIC32 Device"
3. Select the .hex file to flash (if multiple are found)
4. The bootloader will execute and flash your device

## Extension Settings

This extension contributes the following settings:

* `mikroc-pic32-bootloader.bootloaderPath`: Path to the mikro_hb.exe bootloader executable
* `mikroc-pic32-bootloader.hexFilePattern`: Glob pattern to search for .hex files (default: `**/bins/**/*.hex`)

## Release Notes

### 0.0.1

Initial release - Flash PIC32 devices via USB HID bootloader

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
