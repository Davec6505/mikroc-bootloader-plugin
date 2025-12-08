// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ConfigEditor } from './configEditor';
import { EFH_DEVICES, PIC32Device, getDevicesForDisplay } from './devices/pic32mz/efhDevices';
import { generateXC32Project, validateProjectOptions as validateXC32Options, XC32ProjectOptions } from './generators/xc32ProjectGen';
import { generateMikroCProject, validateMikroCProjectOptions, MikroCProjectOptions } from './generators/mikrocProjectGen';

const execAsync = promisify(exec);

// Status bar item for quick access
let statusBarItem: vscode.StatusBarItem;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	console.log('MikroC PIC32 Bootloader extension is now active!');

	// Register flash command
	const flashDisposable = vscode.commands.registerCommand('mikroc-pic32-bootloader.flash', async () => {
		try {
			await flashToDevice();
		} catch (error) {
			vscode.window.showErrorMessage(`Flash failed: ${error}`);
		}
	});

	// Register config editor test command
	const configDisposable = vscode.commands.registerCommand('mikroc-pic32-bootloader.testConfigEditor', async () => {
		try {
			await testConfigEditor(context);
		} catch (error) {
			vscode.window.showErrorMessage(`Config editor failed: ${error}`);
		}
	});

	// Register XC32 project generator command
	const xc32ProjectDisposable = vscode.commands.registerCommand('mikroc-pic32-bootloader.createXC32Project', async () => {
		try {
			await createXC32Project(context);
		} catch (error) {
			vscode.window.showErrorMessage(`XC32 project creation failed: ${error}`);
		}
	});

	// Register MikroC project generator command
	const mikrocProjectDisposable = vscode.commands.registerCommand('mikroc-pic32-bootloader.createMikroCProject', async () => {
		try {
			await createMikroCProject(context);
		} catch (error) {
			vscode.window.showErrorMessage(`MikroC project creation failed: ${error}`);
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

	context.subscriptions.push(flashDisposable, configDisposable, xc32ProjectDisposable, mikrocProjectDisposable, statusBarItem);
}

/**
 * Test the config editor (temporary command for development)
 */
async function testConfigEditor(context: vscode.ExtensionContext) {
	// Show device picker
	const deviceItems = getDevicesForDisplay();
	const selectedDevice = await vscode.window.showQuickPick(deviceItems, {
		placeHolder: 'Select PIC32 device'
	});

	if (!selectedDevice) {
		return;
	}

	// Find device object
	const device = EFH_DEVICES.find(d => d.name === selectedDevice.value);
	if (!device) {
		vscode.window.showErrorMessage('Device not found');
		return;
	}

	// Open config editor
	const editor = new ConfigEditor(context, device);
	try {
		const result = await editor.show();
		
		// Show success message with config summary
		const clockFreq = calculateClockFromConfig(result.config);
		vscode.window.showInformationMessage(
			`Configuration complete! System clock: ${clockFreq.toFixed(2)} MHz, Heap: ${result.heapSize} bytes`
		);
	} catch (error) {
		// User cancelled
		console.log('Config editor cancelled');
	}
}

/**
 * Calculate system clock from config (helper for test command)
 */
function calculateClockFromConfig(config: Map<number, string>): number {
	const pllInputDiv = config.get(6) || "3x Divider";
	const pllMult = config.get(9) || "PLL Multiply by 50";
	const pllOutputDiv = config.get(10) || "2x Divider";
	const usbPllInput = config.get(11) || "USB PLL input is 24 MHz";

	const inputDivMatch = pllInputDiv.match(/(\d+)x/);
	const multMatch = pllMult.match(/by (\d+)/);
	const outputDivMatch = pllOutputDiv.match(/(\d+)x/);
	const inputFreqMatch = usbPllInput.match(/(\d+) MHz/);

	if (!inputDivMatch || !multMatch || !outputDivMatch || !inputFreqMatch) {
		return 200.0;
	}

	const inputFreq = parseInt(inputFreqMatch[1]);
	const inputDiv = parseInt(inputDivMatch[1]);
	const mult = parseInt(multMatch[1]);
	const outputDiv = parseInt(outputDivMatch[1]);

	return (inputFreq / inputDiv) * mult / outputDiv;
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

/**
 * Handler for creating XC32 project
 */
async function createXC32Project(context: vscode.ExtensionContext): Promise<void> {
	// Step 1: Device selection
	const deviceItems = getDevicesForDisplay();
	const selectedDevice = await vscode.window.showQuickPick(deviceItems, {
		placeHolder: 'Select target PIC32MZ device',
		title: 'Create XC32 Project - Device Selection'
	});

	if (!selectedDevice) {
		return; // User cancelled
	}

	const device = EFH_DEVICES.find(d => d.name === selectedDevice.value);
	if (!device) {
		vscode.window.showErrorMessage('Device not found');
		return;
	}

	// Step 2: Project name input
	const projectName = await vscode.window.showInputBox({
		prompt: 'Enter project name',
		placeHolder: 'my_xc32_project',
		validateInput: (value) => {
			if (!value || value.trim().length === 0) {
				return 'Project name cannot be empty';
			}
			if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
				return 'Project name can only contain letters, numbers, underscores, and hyphens';
			}
			return null;
		}
	});

	if (!projectName) {
		return; // User cancelled
	}

	// Step 3: Output folder selection
	const folderUri = await vscode.window.showOpenDialog({
		canSelectFiles: false,
		canSelectFolders: true,
		canSelectMany: false,
		openLabel: 'Select output folder',
		title: 'Create XC32 Project - Output Location'
	});

	if (!folderUri || folderUri.length === 0) {
		return; // User cancelled
	}

	const outputPath = folderUri[0].fsPath;

	// Step 4: Configuration settings via ConfigEditor
	const editor = new ConfigEditor(context, device);
	const result = await editor.show();

	// Step 5: Validate options
	const options: XC32ProjectOptions = {
		projectName,
		deviceName: device.name,
		outputPath,
		settings: result.config,
		heapSize: result.heapSize,
		xc32Version: result.xc32Version,
		dfpVersion: result.dfpVersion,
		useMikroeBootloader: result.useMikroeBootloader || false
	};

	const errors = validateXC32Options(options);
	if (errors.length > 0) {
		throw new Error(`Validation failed: ${errors.join(', ')}`);
	}

	// Step 6: Generate project
	await vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		title: 'Creating XC32 Project',
		cancellable: false
	}, async (progress) => {
		progress.report({ message: 'Generating project structure...' });
		await generateXC32Project(options);
		progress.report({ message: 'Project created successfully!' });
	});

	// Step 7: Show success and offer to open project
	const openAction = await vscode.window.showInformationMessage(
		`XC32 project "${projectName}" created successfully at ${path.join(outputPath, projectName)}`,
		'Open Project',
		'Open in New Window'
	);

	if (openAction === 'Open Project') {
		await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(path.join(outputPath, projectName)), false);
	} else if (openAction === 'Open in New Window') {
		await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(path.join(outputPath, projectName)), true);
	}
}

/**
 * Handler for creating MikroC project
 */
async function createMikroCProject(context: vscode.ExtensionContext): Promise<void> {
	// Step 1: Device selection
	const deviceItems = getDevicesForDisplay();
	const selectedDevice = await vscode.window.showQuickPick(deviceItems, {
		placeHolder: 'Select target PIC32MZ device',
		title: 'Create MikroC Project - Device Selection'
	});

	if (!selectedDevice) {
		return; // User cancelled
	}

	const device = EFH_DEVICES.find(d => d.name === selectedDevice.value);
	if (!device) {
		vscode.window.showErrorMessage('Device not found');
		return;
	}

	// Step 2: Project name input
	const projectName = await vscode.window.showInputBox({
		prompt: 'Enter project name',
		placeHolder: 'my_mikroc_project',
		validateInput: (value) => {
			if (!value || value.trim().length === 0) {
				return 'Project name cannot be empty';
			}
			if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
				return 'Project name can only contain letters, numbers, underscores, and hyphens';
			}
			return null;
		}
	});

	if (!projectName) {
		return; // User cancelled
	}

	// Step 3: Output folder selection
	const folderUri = await vscode.window.showOpenDialog({
		canSelectFiles: false,
		canSelectFolders: true,
		canSelectMany: false,
		openLabel: 'Select output folder',
		title: 'Create MikroC Project - Output Location'
	});

	if (!folderUri || folderUri.length === 0) {
		return; // User cancelled
	}

	const outputPath = folderUri[0].fsPath;

	// Step 4: Configuration settings via ConfigEditor
	const editor = new ConfigEditor(context, device);
	const result = await editor.show();

	// Step 5: Validate options
	const options: MikroCProjectOptions = {
		projectName,
		deviceName: device.name,
		outputPath,
		settings: result.config,
		heapSize: result.heapSize
	};

	const errors = validateMikroCProjectOptions(options);
	if (errors.length > 0) {
		throw new Error(`Validation failed: ${errors.join(', ')}`);
	}

	// Step 6: Generate project
	await vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		title: 'Creating MikroC Project',
		cancellable: false
	}, async (progress) => {
		progress.report({ message: 'Generating project structure...' });
		await generateMikroCProject(options);
		progress.report({ message: 'Project created successfully!' });
	});

	// Step 7: Show success and offer to open project
	const openAction = await vscode.window.showInformationMessage(
		`MikroC project "${projectName}" created successfully at ${path.join(outputPath, projectName)}`,
		'Open Project',
		'Open in New Window'
	);

	if (openAction === 'Open Project') {
		await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(path.join(outputPath, projectName)), false);
	} else if (openAction === 'Open in New Window') {
		await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(path.join(outputPath, projectName)), true);
	}
}

// This method is called when your extension is deactivated
export function deactivate() {}
