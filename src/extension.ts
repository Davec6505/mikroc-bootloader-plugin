/**
 * PIC32-IDE-VSCode Extension
 * MPLABX project import with Makefile generation
 * MikroC project generation using config UI
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { MPLABXImporter, saveMetadata, ProjectMetadata } from './projectImporter';
import { MakefileGenerator } from './makefileGenerator';
import { MikroCImporter } from './mikrocImporter';
import { BootloaderUpdater } from './bootloaderUpdater';
import { BundledToolsManager } from './bundledTools';

let statusBarItem: vscode.StatusBarItem;
let bootloaderUpdater: BootloaderUpdater;
let bundledTools: BundledToolsManager;

export function activate(context: vscode.ExtensionContext) {
    console.log('PIC32-IDE-VSCode extension activated!');

    // Initialize bundled tools and bootloader updater
    bundledTools = new BundledToolsManager(context.extensionPath);
    bootloaderUpdater = new BootloaderUpdater(context, process.platform);
    bundledTools.setBootloaderUpdater(bootloaderUpdater);

    // Check for bootloader updates (non-blocking background check)
    bootloaderUpdater.checkAndUpdate().catch(err => {
        console.error('Bootloader update check failed:', err);
    });

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('pic32-ide.importMPLABX', () => importMPLABXProject(context)),
        vscode.commands.registerCommand('pic32-ide.importMikroC', () => importMikroCProject(context)),
        vscode.commands.registerCommand('pic32-ide.flash', () => flashDevice()),
        vscode.commands.registerCommand('pic32-ide.build', () => buildProject()),
        vscode.commands.registerCommand('pic32-ide.updateBootloader', () => bootloaderUpdater.forceCheckForUpdates())
    );
    
    // TODO: Add 'pic32-ide.newMikroCProject' command to open configEditor UI

    // Status bar button for quick flash
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = 'pic32-ide.flash';
    statusBarItem.text = '$(zap) Flash PIC32';
    statusBarItem.tooltip = 'Flash .hex file to PIC32 device';
    statusBarItem.show();

    context.subscriptions.push(statusBarItem);
}

/**
 * Import MPLABX Project
 */
async function importMPLABXProject(context: vscode.ExtensionContext) {
    // Select MPLABX project folder
    const projectFolders = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: 'Select MPLABX Project Folder (.X folder or parent)'
    });

    if (!projectFolders || projectFolders.length === 0) {
        return;
    }

    const projectPath = projectFolders[0].fsPath;

    // Parse project
    const importer = new MPLABXImporter();
    const projectInfo = await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Parsing MPLABX Makefiles...',
        cancellable: false
    }, async () => {
        return await importer.parseProject(projectPath);
    });

    if (!projectInfo) {
        return;
    }

    // Show project info
    vscode.window.showInformationMessage(
        `Found: ${projectInfo.projectName} (${projectInfo.deviceName})\n` +
        `Compiler: ${projectInfo.compilerBinDir}\n` +
        `DFP: ${projectInfo.dfpPath}\n` +
        `Startup: ${projectInfo.usesCrt0 ? 'CRT0 (default)' : 'startup.S (custom)'}\n` +
        `Source files: ${projectInfo.sourceFiles.length}`
    );

    // Select output folder
    const outputFolders = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: 'Select Output Folder',
        title: 'Where should the VS Code project be created?'
    });

    if (!outputFolders || outputFolders.length === 0) {
        return;
    }

    const outputPath = path.join(outputFolders[0].fsPath, projectInfo.projectName);

    // Create directory if it doesn't exist
    if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
    }

    // Copy and organize files
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Copying and organizing project files...',
        cancellable: false
    }, async () => {
        await importer.copyAndOrganizeFiles(projectInfo, outputPath);
    });

    // Generate Makefiles
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Generating Makefiles...',
        cancellable: false
    }, async () => {
        const generator = new MakefileGenerator();
        await generator.generate({
            projectInfo,
            outputPath,
            optimizationLevel: '-O2'
        });
    });

    // Save metadata for re-import
    const metadata: ProjectMetadata = {
        projectType: 'mplabx',
        sourceProject: projectInfo.xFolderPath || projectPath,
        device: projectInfo.deviceName,
        imported: new Date().toISOString(),
        lastSync: new Date().toISOString(),
        toolchain: {
            compiler: projectInfo.compiler,
            compilerPath: projectInfo.compilerBinDir || '',
            dfpPath: projectInfo.dfpPath,
        },
        folders: {
            mccGenerated: 'srcs/config/default',
            userCode: ['srcs/app', 'srcs/drivers'],
        },
    };
    saveMetadata(outputPath, metadata);

    // Ask to open project
    const openAction = await vscode.window.showInformationMessage(
        `Project imported successfully!\nLocation: ${outputPath}\n\nReady to build with "make build"`,
        'Open Project',
        'Open in New Window'
    );

    if (openAction === 'Open Project') {
        await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(outputPath), false);
    } else if (openAction === 'Open in New Window') {
        await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(outputPath), true);
    }
}

/**
 * Import MikroC Project (in-place, no copy)
 */
async function importMikroCProject(context: vscode.ExtensionContext) {
    // Select MikroC project folder
    const projectFolders = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: 'Select MikroC Project Folder'
    });

    if (!projectFolders || projectFolders.length === 0) {
        return;
    }

    const projectPath = projectFolders[0].fsPath;
    console.log(`MikroC import: Selected folder path: ${projectPath}`);
    
    try {
        const importer = new MikroCImporter();
        
        // Parse project
        const projectInfo = await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Parsing MikroC project...',
            cancellable: false
        }, async () => {
            return await importer.parseProject(projectPath);
        });
        
        if (!projectInfo) {
            console.log('MikroC import: Project parsing failed');
            return;
        }
        
        console.log('MikroC import: Project parsed successfully:', projectInfo.projectName, projectInfo.deviceName);
        
        vscode.window.showInformationMessage(
            `Found MikroC PRO for ${projectInfo.compilerType} project: ${projectInfo.projectName}\nDevice: ${projectInfo.deviceName}`
        );
        
        // Detect compiler
        let compilerPaths = await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Detecting MikroC compiler...',
            cancellable: false
        }, async () => {
            return await importer.detectCompilerPath(projectInfo.compilerType);
        });
        
        // If compiler not found, offer alternatives
        if (!compilerPaths) {
            const choice = await vscode.window.showWarningMessage(
                `MikroC PRO for ${projectInfo.compilerType} not found in standard locations.\n\nYou can:\n• Install MikroC PRO for ${projectInfo.compilerType}\n• Specify custom path\n• Generate template Makefile (edit paths manually)`,
                'Specify Path',
                'Generate Template',
                'Cancel'
            );
            
            if (choice === 'Specify Path') {
                const selectedPath = await vscode.window.showOpenDialog({
                    canSelectFiles: false,
                    canSelectFolders: true,
                    canSelectMany: false,
                    openLabel: `Select MikroC PRO for ${projectInfo.compilerType} Installation Folder`,
                    title: `Locate mikroC PRO for ${projectInfo.compilerType}`
                });
                
                if (selectedPath && selectedPath.length > 0) {
                    compilerPaths = await importer.validateCompilerPath(selectedPath[0].fsPath, projectInfo.compilerType);
                }
            } else if (choice === 'Generate Template') {
                // Generate template with placeholder paths
                compilerPaths = {
                    compilerExe: `C:\\Program Files\\Mikroelektronika\\mikroC PRO for ${projectInfo.compilerType}\\mikroC${projectInfo.compilerType}.exe`,
                    installPath: `C:\\Program Files\\Mikroelektronika\\mikroC PRO for ${projectInfo.compilerType}`,
                    defsPath: `C:\\Program Files\\Mikroelektronika\\mikroC PRO for ${projectInfo.compilerType}\\Defs`,
                    usesPath: `C:\\Program Files\\Mikroelektronika\\mikroC PRO for ${projectInfo.compilerType}\\Uses`
                };
                console.log('MikroC import: Using template compiler paths');
                vscode.window.showInformationMessage('Template Makefile will be generated. Edit paths in Makefile after creation.');
            } else {
                // Cancel
                return;
            }
        }
        
        // Final check - if still no compiler paths, exit
        if (!compilerPaths) {
            return;
        }
        
        // Generate Makefile
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Generating Makefile...',
            cancellable: false
        }, async () => {
            await importer.generateMakefile(projectInfo, compilerPaths);
        });
        
        console.log('MikroC import: Makefile generated successfully');
        
        // Generate .vscode/tasks.json
        const vscodeDir = path.join(projectPath, '.vscode');
        if (!fs.existsSync(vscodeDir)) {
            fs.mkdirSync(vscodeDir, { recursive: true });
        }
        
        const tasksPath = path.join(vscodeDir, 'tasks.json');
        const tasksContent = {
            "version": "2.0.0",
            "tasks": [
                {
                    "label": "Build MikroC Project (External Terminal)",
                    "type": "shell",
                    "command": "start cmd /k \"cd /d ${workspaceFolder} && make && pause\"",
                    "group": {
                        "kind": "build",
                        "isDefault": true
                    },
                    "problemMatcher": [],
                    "presentation": {
                        "reveal": "never",
                        "panel": "shared"
                    }
                },
                {
                    "label": "Clean Build Artifacts",
                    "type": "shell",
                    "command": "make clean",
                    "problemMatcher": []
                },
                {
                    "label": "Flash Device",
                    "type": "shell",
                    "command": "make flash",
                    "problemMatcher": []
                }
            ]
        };
        
        fs.writeFileSync(tasksPath, JSON.stringify(tasksContent, null, 4), 'utf-8');
        
        console.log('MikroC import: tasks.json generated successfully');
        
        // Show success message
        vscode.window.showInformationMessage(
            `MikroC project imported successfully!\n\nMakefile generated. Build with Ctrl+Shift+B or "make"\nRe-open ${projectInfo.projectFile} in MikroC IDE for config changes`,
            { modal: false }
        );
        
        // Automatically open the project folder
        console.log('MikroC import: Opening project folder...');
        await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(projectPath), false);
        console.log('MikroC import: Project opened successfully');
        
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to import MikroC project: ${error}`);
        console.error('MikroC import error:', error);
    }
}

/**
 * Build current project
 */
async function buildProject() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
    }

    const terminal = vscode.window.createTerminal('PIC32 Build');
    terminal.show();
    terminal.sendText('make');
}

/**
 * Flash device with bootloader
 */
async function flashDevice() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
    }

    // Find .hex files
    const hexFiles = await vscode.workspace.findFiles('**/*.hex', '**/node_modules/**', 100);

    if (hexFiles.length === 0) {
        vscode.window.showErrorMessage('No .hex files found. Build the project first.');
        return;
    }

    let hexFile: vscode.Uri;

    if (hexFiles.length === 1) {
        hexFile = hexFiles[0];
    } else {
        // Multiple hex files - let user choose
        const items = hexFiles.map(uri => ({
            label: path.basename(uri.fsPath),
            description: path.relative(workspaceFolder.uri.fsPath, uri.fsPath),
            uri
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select .hex file to flash'
        });

        if (!selected) {
            return;
        }

        hexFile = selected.uri;
    }

    // Get bootloader path (downloaded or bundled)
    const bootloaderPath = bundledTools.getBootloaderPath();
    if (!bootloaderPath) {
        vscode.window.showErrorMessage('MikroC bootloader (mikro_hb) not found');
        return;
    }

    // Flash
    const terminal = vscode.window.createTerminal('PIC32 Flash');
    terminal.show();
    terminal.sendText(`"${bootloaderPath}" "${hexFile.fsPath}"`);
}

export function deactivate() {}

