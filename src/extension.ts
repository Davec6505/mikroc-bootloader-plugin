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

let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
    console.log('PIC32-IDE-VSCode extension activated!');

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('pic32-ide.importMPLABX', () => importMPLABXProject(context)),
        vscode.commands.registerCommand('pic32-ide.flash', () => flashDevice()),
        vscode.commands.registerCommand('pic32-ide.build', () => buildProject())
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

    // Flash
    const terminal = vscode.window.createTerminal('PIC32 Flash');
    terminal.show();
    terminal.sendText(`mikro_hb "${hexFile.fsPath}"`);
}

export function deactivate() {}
