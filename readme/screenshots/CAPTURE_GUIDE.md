# Screenshot Capture Guide

## Required Screenshots

Take these 4 screenshots to showcase the extension in the README.

### 1. **config-editor.png** - Visual Configuration Editor
**What to capture:**
- Open VS Code in a test folder
- Run command: `XC Project Importer: Import MPLABX Project` → Choose "Create New XC32 Project"
- Enter project name (e.g., "TestProject")
- Select any PIC32MZ device (e.g., 32MZ2048EFH100)
- **THIS OPENS THE CONFIG EDITOR** - capture the entire window showing:
  - Left panel with all configuration options (PLL, oscillator, watchdog, etc.)
  - Right panel showing device info and calculated clock frequency
  - PBCLK section visible (for PIC32MZ)

**How to capture:**
- Press `Windows + Shift + S` to open Snipping Tool
- Select the entire VS Code window
- Save as `config-editor.png`

**Tips:**
- Adjust some PLL settings to show interesting values (e.g., 200MHz system clock)
- Make sure the calculated frequency shows in the right panel

---

### 2. **project-structure.png** - Project Organization
**What to capture:**
- After creating or importing a project, show the VS Code Explorer sidebar with:
  - Expanded folder structure showing:
    - `srcs/` folder with main.c and config/default/ (MCC structure)
    - `incs/` folder with organized headers
    - `objs/` and `bins/` folders
    - `Makefile` at root
    - `.vscode/` with tasks.json
  - One source file open in the editor (e.g., main.c with the generated template)

**How to capture:**
- Open an imported/created project
- Expand the folder tree in Explorer
- Open main.c in the editor
- Capture the entire window

**Tips:**
- Make sure MCC folder structure is visible (config/default/peripheral/)
- Show a readable code snippet in the editor

---

### 3. **status-bar-buttons.png** - Build/Flash Controls
**What to capture:**
- Focus on the **bottom status bar** of VS Code showing:
  - ⚙️ **Build** button (left side)
  - 🔄 **Rebuild** button (next to Build)
  - ⚡ **Flash** button (next to Rebuild)
- Include a bit of the editor window above to show context

**How to capture:**
- Open any XC32 project
- Zoom in slightly so the status bar buttons are clearly visible
- Use Snipping Tool to capture just the bottom portion of the window (status bar + a bit of editor)

**Tips:**
- Make sure all three buttons are visible and readable
- Show the tooltips if possible (hover over a button before capturing)

---

### 4. **device-picker.png** - Device Selection UI
**What to capture:**
- The quick pick menu showing the device list when creating a new project:
  - Run command: `XC Project Importer: Import MPLABX Project` → "Create New XC32 Project"
  - Enter project name
  - **CAPTURE THE DEVICE PICKER** showing:
    - Search box at top
    - List of PIC32 devices with descriptions
    - Categories (PIC32MZ-EF, PIC32MX, etc.)

**How to capture:**
- Open the device picker as described above
- Type a search term (e.g., "32MZ") to show filtered results
- Capture the dropdown/quick pick menu

**Tips:**
- Show at least 5-10 devices in the list
- Make sure device descriptions are readable (flash/RAM info)

---

## Alternative: GIF Animations (Optional but Powerful!)

If you want to go the extra mile, create a short GIF showing:
- **Create New Project Workflow** (10-15 seconds):
  1. Run command
  2. Enter project name
  3. Select device
  4. Config editor opens → adjust PLL settings → click OK
  5. Project created with folder structure

**Tools for GIF capture:**
- **ScreenToGif** (Windows, free): https://www.screentogif.com/
- **LICEcap** (Windows/Mac, free): https://www.cockos.com/licecap/
- **Kap** (Mac, free): https://getkap.co/

**GIF Tips:**
- Keep it under 5MB for GitHub
- 10-15 seconds max
- Use 10-15 FPS (not 60fps - file too large)
- Optimize with ScreenToGif's built-in optimizer

---

## After Capturing

1. Save all screenshots to this folder (`readme/screenshots/`)
2. Verify they appear in the README (check GitHub/preview)
3. Commit and push
4. Check the Marketplace listing to ensure images display correctly

## Sizing Guidelines

- **Width**: 1200-1600px (readable on GitHub)
- **Format**: PNG (better quality than JPG for UI screenshots)
- **File size**: Keep under 500KB each (compress if needed)

## Compression Tools (if needed)

- **TinyPNG**: https://tinypng.com/ (web-based)
- **PNGGauntlet**: https://pnggauntlet.com/ (Windows)

---

Good luck! These screenshots will significantly improve your extension's appeal and help users understand what they're getting before installing.
