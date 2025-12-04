# MikroC PIC32 Bootloader

Flash PIC32 devices using the MikroC HID bootloader directly from VS Code.

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
