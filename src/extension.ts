// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	console.log('MikroC PIC32 Bootloader extension is now active!');

	const disposable = vscode.commands.registerCommand('mikroc-pic32-bootloader.flash', async () => {
		try {
			await flashToDevice();
		} catch (error) {
			vscode.window.showErrorMessage(`Flash failed: ${error}`);
		}
	});

	context.subscriptions.push(disposable);
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
	terminal.sendText(`& "${bootloaderPath}" "${selectedFile.fsPath}"`);
	
	// Also run it in background to capture result
	try {
		const { stdout, stderr } = await execAsync(`& "${bootloaderPath}" "${selectedFile.fsPath}"`, { 
			shell: 'powershell.exe',
			cwd: path.dirname(selectedFile.fsPath)
		});
		
		if (stdout) {
			vscode.window.showInformationMessage(`Flash completed: ${stdout.trim()}`);
		}
		
		if (stderr) {
			vscode.window.showWarningMessage(`Flash output: ${stderr.trim()}`);
		}
	} catch (error: any) {
		const errorDetails = [
			error.code ? `Exit code: ${error.code}` : '',
			error.stdout ? `Output: ${error.stdout.trim()}` : '',
			error.stderr ? `Error: ${error.stderr.trim()}` : '',
			!error.stdout && !error.stderr ? 'No output from bootloader. Ensure device is connected and in bootloader mode.' : ''
		].filter(Boolean).join('\n');
		
		vscode.window.showErrorMessage(`Flash failed!\n${errorDetails}`);
	}
}

// This method is called when your extension is deactivated
export function deactivate() {}
