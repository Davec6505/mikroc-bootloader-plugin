// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Status bar item for quick access
let statusBarItem: vscode.StatusBarItem;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	console.log('MikroC PIC32 Bootloader extension is now active!');

	// Register flash command
	const disposable = vscode.commands.registerCommand('mikroc-pic32-bootloader.flash', async () => {
		try {
			await flashToDevice();
		} catch (error) {
			vscode.window.showErrorMessage(`Flash failed: ${error}`);
		}
	});

	// Create status bar button
	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
	statusBarItem.command = 'mikroc-pic32-bootloader.flash';
	statusBarItem.text = '$(zap) Flash PIC32';
	statusBarItem.tooltip = 'Flash .hex file to PIC32 device using MikroC bootloader';
	
	// Update status bar visibility based on settings
	updateStatusBarVisibility();

	// Watch for configuration changes
	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('mikroc-pic32-bootloader.showStatusBarButton')) {
				updateStatusBarVisibility();
			}
		})
	);

	context.subscriptions.push(disposable, statusBarItem);
}

function updateStatusBarVisibility() {
	const config = vscode.workspace.getConfiguration('mikroc-pic32-bootloader');
	const showButton = config.get<boolean>('showStatusBarButton', true);
	
	if (showButton) {
		statusBarItem.show();
	} else {
		statusBarItem.hide();
	}
}

async function flashToDevice() {
	const config = vscode.workspace.getConfiguration('mikroc-pic32-bootloader');
	const bootloaderPath = config.get<string>('bootloaderPath');
	const hexFilePattern = config.get<string>('hexFilePattern', '**/*.hex');

	// Validate bootloader path
	if (!bootloaderPath) {
		vscode.window.showErrorMessage('Bootloader path not configured. Please set mikroc-pic32-bootloader.bootloaderPath in settings.');
		return;
	}

	// Search for hex files
	const hexFiles = await vscode.workspace.findFiles(hexFilePattern, '**/node_modules/**', 100);
	
	if (hexFiles.length === 0) {
		vscode.window.showErrorMessage(`No .hex files found matching pattern: ${hexFilePattern}`);
		return;
	}

	let selectedFile: vscode.Uri;
	
	if (hexFiles.length === 1) {
		selectedFile = hexFiles[0];
	} else {
		// Let user pick which hex file to flash
		const items = hexFiles.map(file => ({
			label: path.basename(file.fsPath),
			description: vscode.workspace.asRelativePath(file.fsPath),
			uri: file
		}));

		const selection = await vscode.window.showQuickPick(items, {
			placeHolder: 'Select .hex file to flash'
		});

		if (!selection) {
			return; // User cancelled
		}

		selectedFile = selection.uri;
	}

	// Execute the bootloader
	vscode.window.showInformationMessage(`Flashing ${path.basename(selectedFile.fsPath)} to PIC32 device...`);
	
	// Create a new terminal to show the bootloader output
	const terminal = vscode.window.createTerminal({
		name: 'MikroC Bootloader',
		cwd: path.dirname(selectedFile.fsPath)
	});
	
	terminal.show();
	
	// Run bootloader and capture result
	// Note: Exit code 1 is normal (device reboots and disconnects)
	// Exit code 255 typically indicates device not found
	terminal.sendText(`
		& "${bootloaderPath}" "${selectedFile.fsPath}"
		if ($LASTEXITCODE -eq 0 -or $LASTEXITCODE -eq 1) {
			Write-Host ""
			Write-Host "✓ Flash completed successfully! Device rebooted." -ForegroundColor Green
		} elseif ($LASTEXITCODE -eq 255) {
			Write-Host ""
			Write-Host "✗ Device not found. Check USB connection." -ForegroundColor Red
		} else {
			Write-Host ""
			Write-Host "✗ Flash failed with exit code $LASTEXITCODE" -ForegroundColor Red
		}
	`.replace(/^\s+/gm, ''));
}

// This method is called when your extension is deactivated
export function deactivate() {}
