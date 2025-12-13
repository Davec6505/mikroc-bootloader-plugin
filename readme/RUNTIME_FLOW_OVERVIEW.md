# Runtime Flow Overview

This document walks through a concrete end‑to‑end flow in the extension and shows which files are involved at each step.

The example flow is:

> **"Create an XC32 project, then flash the generated .hex file to a PIC32 device using the MikroC bootloader."**

---

## 1. Extension Activation

**Files involved:**
- package.json
- out/extension.js (compiled from src/extension.ts)

### What happens

1. VS Code reads `package.json` when the extension is installed or VS Code starts.
2. `package.json` tells VS Code:
   - The extension ID, name, version, and description.
   - The entry point: `"main": "./out/extension.js"`.
   - The commands (e.g. `mikroc-pic32-bootloader.createXC32Project`, `mikroc-pic32-bootloader.flash`).
   - Activation events (e.g. `onCommand:mikroc-pic32-bootloader.createXC32Project`).
3. When the user first runs one of these commands, VS Code loads and executes `out/extension.js`.
4. `out/extension.js` is the compiled JavaScript version of `src/extension.ts`.

Inside `src/extension.ts`, the `activate()` function:
- Registers commands with `vscode.commands.registerCommand(...)`.
- Creates the status bar item for "⚡ Flash PIC32".
- Listens for configuration changes.

---

## 2. Creating an XC32 Project

**User action:** run the command **"Create XC32 Project"** (from Command Palette).

**Files involved (main ones):**
- src/extension.ts
- src/devices/pic32mz/efhDevices.ts
- src/generators/xc32ProjectGen.ts
- src/bundledTools.ts (indirectly, when build tasks use make)
- readme/FEATURE_PROJECT_GENERATOR.md (design doc, not executed)

### 2.1 Command invocation

1. User presses `Ctrl+Shift+P` and runs `MikroC PIC32: Create XC32 Project`.
2. VS Code looks up this command ID in `package.json`.
3. VS Code calls the registered handler in `extension.ts`:
   - `createXC32Project(context: vscode.ExtensionContext)`.

### 2.2 Device selection

**Files:**
- src/extension.ts
- src/devices/pic32mz/efhDevices.ts

Steps:

1. `createXC32Project` calls `getDevicesForDisplay()` from `efhDevices.ts`.
2. `getDevicesForDisplay()` returns a list of PIC32MZ devices formatted for a Quick Pick.
3. VS Code shows a Quick Pick using `vscode.window.showQuickPick(...)` so the user can select a device.
4. The chosen device name is used to find the full `PIC32Device` object in `EFH_DEVICES` (also in `efhDevices.ts`).

### 2.3 Project name and options

**Files:**
- src/extension.ts
- src/generators/xc32ProjectGen.ts

Steps:

1. `createXC32Project` asks the user for a project name using `vscode.window.showInputBox(...)`.
2. It may gather additional options (device, folders, clock configuration, etc.).
3. It creates an `XC32ProjectOptions` object (type imported from `xc32ProjectGen.ts`).
4. It calls `validateProjectOptions(...)` from `xc32ProjectGen.ts` to ensure the options are valid.

### 2.4 Generating files

**Files:**
- src/generators/xc32ProjectGen.ts
- src/templates/** (code templates)
- project output folder under your workspace

Steps:

1. `createXC32Project` calls `generateXC32Project(options)`.
2. `generateXC32Project` uses template files under `src/templates` (for startup, clocks, peripherals, Makefile, etc.).
3. It fills in those templates with the selected device and options.
4. It writes the generated C source files, headers, Makefile, and configuration files into a new project folder in your workspace.
5. The final on-disk layout looks similar to a Harmony/MCC project (e.g. `src/`, `config/default/`, `nbproject/`, etc., depending on the generator implementation).

**Design reference:** `readme/FEATURE_PROJECT_GENERATOR.md` explains the architecture and file structure in more detail.

---

## 3. Bundled Tools and Make

**Files involved:**
- src/bundledTools.ts (compiled to out/bundledTools.js)
- bin/win32/** (make.exe, mikro_hb.exe, DLLs)
- readme/BUNDLING_GUIDE.md (documentation only)

### 3.1 BundledToolsManager

`src/bundledTools.ts` defines `BundledToolsManager`:

- It is constructed with the extension path from `vscode.ExtensionContext.extensionPath`.
- It detects the current platform (`win32`, `linux`, `darwin`).

Main methods:

- `getMakePath()`
  - Looks for a bundled `make.exe` (or `make`) under `bin/<platform>/`.
  - If found, returns the full path.
  - If not, falls back to just `'make'` (system PATH).

- `getBootloaderPath()`
  - Looks for `mikro_hb.exe` (or `mikro_hb`) under `bin/<platform>/`.
  - Returns the path if found, otherwise `null`.

- `getEnvironment()`
  - Produces a copy of `process.env` with `bin/<platform>` **prepended** to `PATH` so bundled tools are preferred.

- `verifyMake()` / `showToolsInfo()`
  - For diagnostics: confirms whether make is available and whether the bundled version is being used.

These methods are used by project generation or build-related commands to make sure `make` and `mikro_hb` are available without requiring the user to install them separately.

**Documentation reference:** `readme/BUNDLING_GUIDE.md` describes how these tools are packaged into `bin/` and how they are distributed.

---

## 4. Building the Generated XC32 Project (Optional Step)

**User action:** run a build task in VS Code or call `make` manually.

**Files involved:**
- Generated Makefile in the project folder
- bin/win32/make.exe (if using bundled make)
- src/bundledTools.ts
- .vscode/tasks.json (build tasks, if configured)

### What happens

1. User runs a build task in VS Code (e.g. `make` in the project folder).
2. The build task uses `make`:
   - Either from the system PATH, or
   - From the bundled `bin/win32/make.exe` if `BundledToolsManager` set up the environment.
3. `make` reads the generated Makefile and compiles the XC32 project using the XC32 toolchain.
4. The build produces `.o` files and a final `.hex` output.

---

## 5. Flashing the .hex File to the PIC32

**User action:** use the **Flash PIC32** command (from Command Palette or status bar button).

**Files involved:**
- src/extension.ts
- src/bundledTools.ts (if used to find `mikro_hb`)
- VS Code Settings (`mikroc-pic32-bootloader.bootloaderPath`, `mikroc-pic32-bootloader.hexFilePattern`)
- bin/win32/mikro_hb.exe (if bundled)

### 5.1 Command invocation

1. User clicks the status bar button **"⚡ Flash PIC32"** or runs `MikroC PIC32: Flash Device` from the Command Palette.
2. In `src/extension.ts`, the command handler calls `flashToDevice()`.

### 5.2 Reading configuration

**Files:**
- src/extension.ts
- VS Code settings (not a file in the repo, but user configuration)

Steps in `flashToDevice()`:

1. It reads the VS Code configuration for this extension:
   - `bootloaderPath` (path to `mikro_hb.exe`).
   - `hexFilePattern` (glob pattern for .hex files, default `**/*.hex`).
2. If `bootloaderPath` is **not** configured:
   - It shows a warning and offers:
     - "Open Settings" → opens the setting `mikroc-pic32-bootloader.bootloaderPath`.
     - "Download Tool" → opens the GitHub releases page for the MikroC bootloader.
   - Then returns (no flashing done).

> Note: `bootloaderPath` could point to a bundled `mikro_hb.exe` from `bin/win32`, or to an external installation path.

### 5.3 Choosing the .hex file

**Files:**
- src/extension.ts

Steps:

1. `flashToDevice()` uses `vscode.workspace.findFiles(hexFilePattern, '**/node_modules/**', 100)` to search for `.hex` files in the workspace.
2. If **no files** are found:
   - It shows an error message.
3. If **one file** is found:
   - It selects that file automatically.
4. If **multiple files** are found:
   - It shows a Quick Pick listing the filenames and relative paths.
   - The user chooses which `.hex` to flash.

### 5.4 Running the bootloader

**Files:**
- src/extension.ts
- bin/win32/mikro_hb.exe (or user-provided path)

Steps:

1. `flashToDevice()` creates a new VS Code terminal:
   - Name: `"MikroC Bootloader"`.
   - Working directory: the folder of the selected `.hex` file.
2. It shows the terminal and sends a PowerShell command that:
   - Executes `"<bootloaderPath>" "<hexFilePath>"`.
   - Checks `$LASTEXITCODE` to determine success or failure:
     - `0` or `1` → success (device reboots).
     - `255` → device not found.
     - anything else → generic failure.
3. Output in the terminal shows a green success message or a red failure message.

At this point, the generated XC32 project has been built, and its `.hex` has been flashed to the PIC32 using the MikroC bootloader.

---

## 6. Where HTML and Webviews Fit In

While the flow above focuses on project generation and flashing, the extension also uses webviews for richer UIs (e.g. configuration editors):

**Files involved (conceptual):**
- src/configEditor.ts
- src/webview/** (HTML/JS/CSS)
- src/devices/pic32mz/efhDevices.ts

High-level steps when a config editor command runs:

1. `extension.ts` calls `testConfigEditor(context)`.
2. `testConfigEditor` picks a device and creates a `ConfigEditor` instance.
3. `ConfigEditor` creates a VS Code webview panel and loads an HTML file from `src/webview`.
4. The HTML/JS in the webview renders UI controls and communicates with the extension via `postMessage`.
5. When the user confirms, `ConfigEditor.show()` resolves with configuration data, which can be used to:
   - Compute clock frequencies.
   - Feed the project generator.

These webview flows reuse the same building blocks described earlier (device lists, generators, bundled tools), but add a graphical editor on top.

---

## 7. Summary

- **package.json**: declares commands, activation events, and entry point.
- **src/extension.ts**: main orchestrator; registers commands and implements `createXC32Project`, `flashToDevice`, and test UIs.
- **src/devices/**: describes supported PIC32 devices for pickers and generators.
- **src/generators/**: converts high-level options into concrete project files (.c/.h, Makefiles, configs).
- **src/bundledTools.ts**: finds and configures bundled `make` and `mikro_hb` tools.
- **bin/win32/**: actual binaries (make.exe, mikro_hb.exe, etc.).
- **src/webview/** + **configEditor.ts**: HTML-based UIs for configuration editing.
- **readme/*.md**: design and implementation notes you can read at leisure.

You can keep this document open as a map of "what runs when" for the common flow of creating an XC32 project and flashing it to hardware.