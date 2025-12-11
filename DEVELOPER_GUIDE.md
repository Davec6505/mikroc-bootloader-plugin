# Developer Guide - MikroC PIC32 Bootloader Extension

This guide explains how the extension works and how to learn VS Code extension development.

## Table of Contents
- [How This Extension Works](#how-this-extension-works)
- [Code Walkthrough](#code-walkthrough)
- [Learning Resources](#learning-resources)
- [Building from Source](#building-from-source)

---

## How This Extension Works

### Architecture Overview

```
┌─────────────────────────────────────────────────┐
│           VS Code Command Palette               │
│     "MikroC PIC32: Flash Device" (Ctrl+Shift+P) │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│          extension.ts - flashToDevice()         │
│  1. Read configuration                          │
│  2. Search workspace for .hex files             │
│  3. Show file picker (if multiple files)        │
│  4. Execute mikro_hb.exe with selected file     │
│  5. Display output in terminal + notifications  │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│      mikro_hb.exe (MikroC HID Bootloader)       │
│      Flashes .hex file to PIC32 device          │
└─────────────────────────────────────────────────┘
```

---

## Code Walkthrough

### 1. Extension Manifest (package.json)

The `package.json` file is the **manifest** that tells VS Code about your extension:

```json
{
  "name": "mikroc-pic32-bootloader",
  "displayName": "MikroC PIC32 Bootloader",
  "main": "./out/extension.js",  // Entry point after compilation
  
  "contributes": {
    // Commands that appear in command palette (Ctrl+Shift+P)
    "commands": [
      {
        "command": "mikroc-pic32-bootloader.flash",
        "title": "MikroC PIC32: Flash Device"
      }
    ],
    
    // User-configurable settings
    "configuration": {
      "properties": {
        "mikroc-pic32-bootloader.bootloaderPath": {
          "type": "string",
          "default": "C:\\Users\\davec\\GIT\\MikroC_bootloader\\bins\\mikro_hb.exe"
        }
      }
    }
  }
}
```

**Key Points:**
- `contributes.commands` - Registers commands visible in command palette
- `contributes.configuration` - Defines user settings (File > Preferences > Settings)
- `main` - Points to compiled JavaScript entry point

---

### 2. Extension Entry Point (extension.ts)

#### activate() Function
Called when VS Code loads the extension:

```typescript
export function activate(context: vscode.ExtensionContext) {
    // Register the flash command
    const disposable = vscode.commands.registerCommand(
        'mikroc-pic32-bootloader.flash',  // Must match package.json
        async () => {
            try {
                await flashToDevice();
            } catch (error) {
                vscode.window.showErrorMessage(`Flash failed: ${error}`);
            }
        }
    );
    
    // Add to disposables (cleaned up when extension deactivates)
    context.subscriptions.push(disposable);
}
```

**Key VS Code APIs Used:**
- `vscode.commands.registerCommand()` - Links command ID to handler function
- `context.subscriptions` - Manages cleanup when extension unloads

---

#### flashToDevice() Function - Step by Step

```typescript
async function flashToDevice() {
    // STEP 1: Get user configuration
    const config = vscode.workspace.getConfiguration('mikroc-pic32-bootloader');
    const bootloaderPath = config.get<string>('bootloaderPath');
    const hexFilePattern = config.get<string>('hexFilePattern', '**/*.hex');
```

**API:** `vscode.workspace.getConfiguration()`
- Reads settings from VS Code's settings.json
- Users can configure via: File > Preferences > Settings > Extensions > MikroC PIC32 Bootloader

---

```typescript
    // STEP 2: Validate bootloader exists
    if (!bootloaderPath) {
        vscode.window.showErrorMessage('Bootloader path not configured...');
        return;
    }
```

**API:** `vscode.window.showErrorMessage()`
- Shows red notification popup in bottom-right corner

---

```typescript
    // STEP 3: Search workspace for .hex files
    const hexFiles = await vscode.workspace.findFiles(
        hexFilePattern,           // Include pattern: **/*.hex
        '**/node_modules/**',     // Exclude pattern
        100                       // Max results
    );
    
    if (hexFiles.length === 0) {
        vscode.window.showErrorMessage(`No .hex files found...`);
        return;
    }
```

**API:** `vscode.workspace.findFiles()`
- Searches all workspace folders
- Returns array of `vscode.Uri` objects (file paths)
- Supports glob patterns like `**/*.hex` (all .hex files in any subdirectory)

---

```typescript
    // STEP 4: Handle multiple files
    let selectedFile: vscode.Uri;
    
    if (hexFiles.length === 1) {
        selectedFile = hexFiles[0];
    } else {
        // Show picker dialog
        const items = hexFiles.map(file => ({
            label: path.basename(file.fsPath),     // "firmware.hex"
            description: vscode.workspace.asRelativePath(file.fsPath), // "build/firmware.hex"
            uri: file
        }));
        
        const selection = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select .hex file to flash'
        });
        
        if (!selection) return; // User pressed Escape
        selectedFile = selection.uri;
    }
```

**API:** `vscode.window.showQuickPick()`
- Shows a dropdown picker dialog
- Returns selected item or `undefined` if cancelled

---

```typescript
    // STEP 5: Create terminal for output
    const terminal = vscode.window.createTerminal({
        name: 'MikroC Bootloader',
        cwd: path.dirname(selectedFile.fsPath)
    });
    
    terminal.show();  // Makes terminal visible
    terminal.sendText(`& "${bootloaderPath}" "${selectedFile.fsPath}"`);
```

**API:** `vscode.window.createTerminal()`
- Creates an integrated terminal instance
- `cwd` - Sets working directory
- `sendText()` - Types command into terminal (as if user typed it)

---

```typescript
    // STEP 6: Execute and capture output
    try {
        const { stdout, stderr } = await execAsync(
            `& "${bootloaderPath}" "${selectedFile.fsPath}"`,
            { 
                shell: 'powershell.exe',
                cwd: path.dirname(selectedFile.fsPath)
            }
        );
        
        if (stdout) {
            vscode.window.showInformationMessage(`Flash completed: ${stdout.trim()}`);
        }
    } catch (error: any) {
        // Enhanced error handling
        const errorDetails = [
            error.code ? `Exit code: ${error.code}` : '',
            error.stdout ? `Output: ${error.stdout.trim()}` : '',
            error.stderr ? `Error: ${error.stderr.trim()}` : '',
            !error.stdout && !error.stderr ? 
                'No output from bootloader. Ensure device is connected and in bootloader mode.' : ''
        ].filter(Boolean).join('\n');
        
        vscode.window.showErrorMessage(`Flash failed!\n${errorDetails}`);
    }
}
```

**Node.js API:** `child_process.exec()` (promisified)
- Executes shell commands
- Captures stdout/stderr
- Throws error if exit code != 0

---

## Learning Resources

### 🎯 Start Here: Official VS Code Extension Documentation

1. **[Your First Extension](https://code.visualstudio.com/api/get-started/your-first-extension)**
   - 10-minute tutorial
   - Creates a "Hello World" extension
   - Sets up development environment
   
2. **[Extension Anatomy](https://code.visualstudio.com/api/get-started/extension-anatomy)**
   - Explains manifest structure
   - Activation events
   - Extension lifecycle

3. **[VS Code API Reference](https://code.visualstudio.com/api/references/vscode-api)**
   - Complete API documentation
   - Every function used in this extension is documented here

---

### 📚 Step-by-Step Learning Path

#### Week 1: Foundation
- [ ] Complete "Your First Extension" tutorial
- [ ] Read "Extension Anatomy"
- [ ] Create a command that shows "Hello World" message
- [ ] Publish extension locally and test it

**Goal:** Understand extension structure and activation

---

#### Week 2: Commands & Configuration
- [ ] Study [Command API](https://code.visualstudio.com/api/references/vscode-api#commands)
- [ ] Study [Configuration](https://code.visualstudio.com/api/references/contribution-points#contributes.configuration)
- [ ] Create extension with 3 commands and 2 configurable settings
- [ ] Read settings in your code using `getConfiguration()`

**Goal:** Register commands and read user settings

---

#### Week 3: Workspace APIs
- [ ] Study [Workspace API](https://code.visualstudio.com/api/references/vscode-api#workspace)
- [ ] Practice `findFiles()`, `openTextDocument()`, `workspaceFolders`
- [ ] Create extension that searches for files by pattern
- [ ] Display file list using `showQuickPick()`

**Goal:** Search files and interact with workspace

---

#### Week 4: Terminal & Process Integration
- [ ] Study [Terminal API](https://code.visualstudio.com/api/references/vscode-api#window.createTerminal)
- [ ] Learn Node.js `child_process` module
- [ ] Create extension that runs external command and shows output
- [ ] Handle errors and exit codes

**Goal:** Execute external tools from VS Code

---

### 🎓 Recommended Courses

#### Free Resources
1. **Microsoft Learn - VS Code Extension Development**
   - Official Microsoft training
   - [https://learn.microsoft.com/en-us/training/](https://learn.microsoft.com/en-us/training/)
   - Search for "Visual Studio Code"

2. **VS Code Extension Samples (GitHub)**
   - 50+ example extensions
   - [https://github.com/microsoft/vscode-extension-samples](https://github.com/microsoft/vscode-extension-samples)
   - Clone and explore each sample

3. **TypeScript Handbook**
   - Essential for extension development
   - [https://www.typescriptlang.org/docs/handbook/intro.html](https://www.typescriptlang.org/docs/handbook/intro.html)

#### YouTube Channels
- **Code with Ado** - Search: "VS Code extension tutorial"
- **Traversy Media** - Search: "TypeScript crash course"
- **Ben Awad** - Covers advanced VS Code topics

---

### 🔍 APIs Used in This Extension

| API | Purpose | Documentation |
|-----|---------|---------------|
| `commands.registerCommand()` | Register command handler | [Link](https://code.visualstudio.com/api/references/vscode-api#commands.registerCommand) |
| `workspace.getConfiguration()` | Read user settings | [Link](https://code.visualstudio.com/api/references/vscode-api#workspace.getConfiguration) |
| `workspace.findFiles()` | Search for files | [Link](https://code.visualstudio.com/api/references/vscode-api#workspace.findFiles) |
| `window.showQuickPick()` | Show picker dialog | [Link](https://code.visualstudio.com/api/references/vscode-api#window.showQuickPick) |
| `window.createTerminal()` | Create terminal instance | [Link](https://code.visualstudio.com/api/references/vscode-api#window.createTerminal) |
| `window.showInformationMessage()` | Show notification | [Link](https://code.visualstudio.com/api/references/vscode-api#window.showInformationMessage) |
| `window.showErrorMessage()` | Show error notification | [Link](https://code.visualstudio.com/api/references/vscode-api#window.showErrorMessage) |

---

## Building from Source

### Prerequisites
```bash
# Check Node.js version (need 22.x or later)
node --version

# Check npm version
npm --version
```

### Development Workflow

```bash
# 1. Clone repository (after you create it tonight)
git clone https://github.com/yourusername/mikroc-pic32-bootloader.git
cd mikroc-pic32-bootloader

# 2. Install dependencies
npm install

# 3. Compile TypeScript to JavaScript
npm run compile

# 4. Run in watch mode (auto-compile on save)
npm run watch
```

### Testing the Extension

**Method 1: Debug Mode (Recommended for development)**
1. Open extension folder in VS Code
2. Press `F5` (or Run > Start Debugging)
3. A new "Extension Development Host" window opens
4. Test your extension there
5. Set breakpoints in `src/extension.ts` to debug

**Method 2: Install Locally**
```bash
# Package as .vsix
npx @vscode/vsce package --allow-missing-repository --no-dependencies

# Install
code --install-extension mikroc-pic32-bootloader-0.0.1.vsix --force

# Reload VS Code window
# Ctrl+Shift+P > "Developer: Reload Window"
```

---

## Project Structure Explained

```
mikroc-pic32-bootloader/
│
├── src/                        # TypeScript source code
│   ├── extension.ts            # Main extension logic ⭐
│   └── test/
│       └── extension.test.ts   # Unit tests
│
├── out/                        # Compiled JavaScript (generated by tsc)
│   ├── extension.js            # Compiled from src/extension.ts
│   └── test/
│
├── package.json                # Extension manifest ⭐
├── tsconfig.json               # TypeScript compiler settings
├── eslint.config.mjs           # Code linting rules
│
├── README.md                   # User-facing documentation
├── CHANGELOG.md                # Version history
└── DEVELOPER_GUIDE.md          # This file
```

**⭐ Most Important Files:**
- `package.json` - Defines extension metadata, commands, settings
- `src/extension.ts` - All the code logic

---

## Common Patterns in VS Code Extensions

### Pattern 1: Command Registration
```typescript
export function activate(context: vscode.ExtensionContext) {
    const cmd = vscode.commands.registerCommand('my.command', () => {
        vscode.window.showInformationMessage('Hello!');
    });
    context.subscriptions.push(cmd);
}
```

### Pattern 2: Reading Configuration
```typescript
const config = vscode.workspace.getConfiguration('myExtension');
const setting = config.get<string>('mySetting', 'default');
```

### Pattern 3: File Search
```typescript
const files = await vscode.workspace.findFiles('**/*.txt', '**/node_modules/**');
```

### Pattern 4: User Input
```typescript
const result = await vscode.window.showInputBox({
    prompt: 'Enter something',
    placeHolder: 'Type here...'
});
```

### Pattern 5: Quick Pick Selection
```typescript
const choice = await vscode.window.showQuickPick(['Option 1', 'Option 2'], {
    placeHolder: 'Choose an option'
});
```

---

## Next Steps for Learning

1. **Clone the vscode-extension-samples repo**
   ```bash
   git clone https://github.com/microsoft/vscode-extension-samples.git
   cd vscode-extension-samples
   ```

2. **Try these samples (in order):**
   - `helloworld-sample` - Basic command
   - `configuration-sample` - Settings
   - `quickinput-sample` - User input dialogs
   - `task-provider-sample` - Running tasks
   - `terminal-sample` - Terminal integration

3. **Modify this extension:**
   - Add serial port selection (for serial bootloader mode)
   - Add progress indicator during flash
   - Save last-used .hex file to settings
   - Add keyboard shortcut for flash command

4. **Publish to VS Code Marketplace:**
   - Follow: [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
   - Create Azure DevOps account
   - Get Personal Access Token
   - Use `vsce publish` command

---

## Debugging Tips

### View Extension Logs
- Open Output panel: `View > Output`
- Select "Extension Host" from dropdown
- See console.log() output and errors

### Common Issues

| Issue | Solution |
|-------|----------|
| Command doesn't appear | Check `contributes.commands` in package.json |
| Extension not loading | Check activation events |
| Can't read settings | Verify configuration key names match |
| File paths wrong | Use `path.normalize()` for cross-platform support |

---

## Questions?

Once you create the GitHub repository tonight, you can:
- Open issues for bugs or questions
- Submit pull requests for improvements
- Share with the community!

**Happy coding! 🚀**
