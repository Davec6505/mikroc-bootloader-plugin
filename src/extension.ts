// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ConfigEditor } from './configEditor';
import { EFH_DEVICES, PIC32Device, getDevicesForDisplay } from './devices/pic32mz/efhDevices';
import { generateXC32Project, validateProjectOptions as validateXC32Options, XC32ProjectOptions } from './generators/xc32ProjectGen';
import { generateMikroCProject, validateMikroCProjectOptions, MikroCProjectOptions } from './generators/mikrocProjectGen';
import { MakeToolDetector } from './makeToolDetector';

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
		const choice = await vscode.window.showWarningMessage(
			'Bootloader path not configured. Configure path or download the tool.',
			'Open Settings', 'Download Tool'
		);
		if (choice === 'Open Settings') {
			await vscode.commands.executeCommand('workbench.action.openSettings', 'mikroc-pic32-bootloader.bootloaderPath');
		} else if (choice === 'Download Tool') {
			vscode.env.openExternal(vscode.Uri.parse('https://github.com/Davec6505/MikroC_bootloader/releases'));
		}
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
	// Check if make is available before proceeding
	const makeDetector = new MakeToolDetector(context);
	const makeAvailable = await makeDetector.ensureMake();
	
	if (!makeAvailable) {
		vscode.window.showWarningMessage('Project creation cancelled. GNU Make is required to build XC32 projects.');
		return;
	}

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

	// Step 5: Resolve toolchain paths BEFORE generating project
	const toolchainPaths = resolveXc32ToolchainPaths();

	// Step 6: Verify toolchain availability - HALT if missing
	if (!toolchainPaths.xc32Bin || !toolchainPaths.dfpPath) {
		const missing: string[] = [];
		if (!toolchainPaths.xc32Bin) {missing.push('XC32 Compiler');}
		if (!toolchainPaths.dfpPath) {missing.push('PIC32MZ-EF Device Family Pack (DFP)');}
		
		const action = await vscode.window.showErrorMessage(
			`Cannot generate project: ${missing.join(' and ')} not found.`,
			{ modal: true },
			'Install XC32',
			'Install DFP',
			'Configure Paths'
		);

		if (action === 'Install XC32') {
			vscode.env.openExternal(vscode.Uri.parse('https://www.microchip.com/en-us/tools-resources/develop/mplab-xc-compilers/xc32'));
		} else if (action === 'Install DFP') {
			vscode.env.openExternal(vscode.Uri.parse('https://packs.download.microchip.com/'));
		} else if (action === 'Configure Paths') {
			await vscode.commands.executeCommand('workbench.action.openSettings', 'mikroc-pic32-bootloader');
		}
		return; // HALT - don't generate project
	}

	// Step 7: Validate options
	const options: XC32ProjectOptions = {
		projectName,
		deviceName: device.name,
		outputPath,
		settings: result.config,
		heapSize: result.heapSize,
		xc32Version: result.xc32Version,
		dfpVersion: result.dfpVersion,
		xc32CompilerBinDir: toolchainPaths.xc32Bin,
		dfpPath: toolchainPaths.dfpPath,
		useMikroeBootloader: result.useMikroeBootloader || false,
		pinConfigurations: result.pinConfigurations,
		timerConfigurations: result.timerConfigurations
	};

	const errors = validateXC32Options(options);
	if (errors.length > 0) {
		vscode.window.showErrorMessage(`Project validation failed: ${errors.join(', ')}`);
		return;
	}

	// Step 8: Generate project (toolchain already verified)
	await vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		title: 'Creating XC32 Project',
		cancellable: false
	}, async (progress) => {
		progress.report({ message: 'Generating project structure...' });
		await generateXC32Project(options);
		progress.report({ message: 'Project created successfully!' });
	});

	// Step 8: Show success and offer to open project
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
 * Verify XC32 compiler and DFP presence and guide the user if missing
 */
async function verifyToolchainPrereqs(): Promise<void> {
	const isWindows = process.platform === 'win32';
	const missingItems: string[] = [];
	const cfg = vscode.workspace.getConfiguration('mikroc-pic32-bootloader');
	const userXc32Bin = (cfg.get<string>('xc32CompilerBinDir') || '').trim();
	const userDfp = (cfg.get<string>('dfpPath') || '').trim();

	// Check XC32 install
	let xc32Found = false;
	if (userXc32Bin) {
		const exe = path.join(userXc32Bin, isWindows ? 'xc32-gcc.exe' : 'xc32-gcc');
		xc32Found = fs.existsSync(exe);
	}
	if (isWindows) {
		const xc32Base = 'C:\\Program Files\\Microchip\\xc32';
		try {
			if (!xc32Found) {
				const dirs = await fs.promises.readdir(xc32Base, { withFileTypes: true } as any);
				xc32Found = (dirs as any[]).some((d: any) => d.isDirectory && d.isDirectory() && /^v\d+\.\d+/.test(d.name));
			}
		} catch {
			xc32Found = false;
		}
	} else {
		if (!xc32Found) {
			try { xc32Found = fs.existsSync('/opt/microchip/xc32'); } catch { xc32Found = false; }
		}
	}

	if (!xc32Found) {
		missingItems.push('XC32 compiler');
	}

	// Check DFP presence (via MPLABX packs folder or common packs location)
	let dfpFound = false;
	if (userDfp) {
		dfpFound = fs.existsSync(userDfp);
	}
	if (isWindows) {
		const mplabxBase = 'C:\\Program Files\\Microchip\\MPLABX';
		const altPacks = 'C:\\Microchip\\packs\\Microchip\\PIC32MZ-EF_DFP';
		try {
			if (!dfpFound && fs.existsSync(mplabxBase)) {
				dfpFound = true;
			} else if (!dfpFound && fs.existsSync(altPacks)) {
				dfpFound = true;
			}
		} catch {
			dfpFound = false;
		}
	} else {
		if (!dfpFound) { dfpFound = fs.existsSync('/opt/microchip/mplabx'); }
	}

	if (!dfpFound) {
		missingItems.push('PIC32MZ-EF Device Family Pack (DFP)');
	}

	if (missingItems.length === 0) {
		return;
	}

	const detail = missingItems.join(' and ');
	const action = await vscode.window.showWarningMessage(
		`${detail} not detected. You can set custom locations in Settings or install tools.`,
		'Open Settings',
		'Get XC32',
		'Get DFP',
		'Proceed Anyway'
	);

	if (action === 'Open Settings') {
		await vscode.commands.executeCommand('workbench.action.openSettings', 'mikroc-pic32-bootloader.xc32CompilerBinDir');
	} else if (action === 'Get XC32') {
		vscode.env.openExternal(vscode.Uri.parse('https://www.microchip.com/en-us/tools-resources/develop/mplab-xc-compilers/xc32'));
	} else if (action === 'Get DFP') {
		// MPLAB X packs installer or direct packs location; advise manual placement if MPLAB X not installed
		vscode.env.openExternal(vscode.Uri.parse('https://packs.download.microchip.com/'));
		vscode.window.showInformationMessage(
			'If you do not install MPLAB X, create C:\\Microchip\\packs\\Microchip\\PIC32MZ-EF_DFP\\<version> and extract the DFP there. Then pass DFP="<that path>" to make.'
		);
	}
}

/**
 * Resolve XC32 bin and DFP locations based on user settings and common install paths.
 *
 * These paths are baked into the generated Root Makefile so that users don't need to
 * pass COMPILER_LOCATION/DFP on every make invocation. If detection fails, the fields
 * are left undefined and the generated Makefile will fall back to auto-detection.
 */
function resolveXc32ToolchainPaths(): { xc32Bin?: string; dfpPath?: string } {
	const isWindows = process.platform === 'win32';
	const cfg = vscode.workspace.getConfiguration('mikroc-pic32-bootloader');
	const userXc32Bin = (cfg.get<string>('xc32CompilerBinDir') || '').trim();
	const userDfp = (cfg.get<string>('dfpPath') || '').trim();

	let xc32Bin: string | undefined;
	let dfpPath: string | undefined;

	// Prefer explicit user-configured XC32 bin directory
	if (userXc32Bin) {
		const exe = path.join(userXc32Bin, isWindows ? 'xc32-gcc.exe' : 'xc32-gcc');
		if (fs.existsSync(exe)) {
			xc32Bin = userXc32Bin;
		}
	}

	// Fallback: dynamically search common install locations
	if (!xc32Bin) {
		const searchBases = isWindows 
			? ['C:', 'D:', 'E:'].map(drive => path.join(drive, path.sep, 'Program Files', 'Microchip', 'xc32'))
			: ['/opt/microchip/xc32', '/usr/local/microchip/xc32'];
		
		for (const base of searchBases) {
			if (!fs.existsSync(base)) {continue;}
			
			try {
				const entries = fs.readdirSync(base, { withFileTypes: true });
				const versionDirs = entries
					.filter(d => d.isDirectory() && /^v\d+\.\d+/.test(d.name))
					.map(d => d.name)
					.sort((a, b) => {
						// Sort by version number descending (v5.00 > v4.35)
						const aMatch = a.match(/v(\d+)\.(\d+)/);
						const bMatch = b.match(/v(\d+)\.(\d+)/);
						if (aMatch && bMatch) {
							const aMajor = parseInt(aMatch[1]);
							const bMajor = parseInt(bMatch[1]);
							if (aMajor !== bMajor) {return bMajor - aMajor;}
							return parseInt(bMatch[2]) - parseInt(aMatch[2]);
						}
						return b.localeCompare(a);
					});
				
				if (versionDirs.length > 0) {
					const binDir = path.join(base, versionDirs[0], 'bin');
					const gccExe = path.join(binDir, isWindows ? 'xc32-gcc.exe' : 'xc32-gcc');
					if (fs.existsSync(gccExe)) {
						xc32Bin = binDir;
						break;
					}
				}
			} catch {
				// Continue searching other locations
			}
		}
	}

	// Prefer explicit user-configured DFP path
	if (userDfp && fs.existsSync(userDfp)) {
		dfpPath = userDfp;
	}

	// Fallback: dynamically search MPLAB X packs or standalone packs folder
	if (!dfpPath) {
		const searchBases = isWindows 
			? [
				path.join('C:', path.sep, 'Program Files', 'Microchip', 'MPLABX'),
				path.join('C:', path.sep, 'Microchip', 'packs', 'Microchip', 'PIC32MZ-EF_DFP'),
				path.join('D:', path.sep, 'Microchip', 'packs', 'Microchip', 'PIC32MZ-EF_DFP')
			]
			: [
				'/opt/microchip/mplabx',
				'/usr/local/microchip/mplabx'
			];
		
		for (const base of searchBases) {
			if (!fs.existsSync(base)) {continue;}
			
			try {
				// Check if this is MPLABX base or direct DFP base
				const isMplabxBase = base.toLowerCase().includes('mplabx') && !base.includes('PIC32MZ-EF_DFP');
				
				if (isMplabxBase) {
					// Search for MPLABX version dirs (v6.25, etc)
					const entries = fs.readdirSync(base, { withFileTypes: true });
					const versionDirs = entries
						.filter(d => d.isDirectory() && /^v\d+\.\d+/.test(d.name))
						.map(d => d.name)
						.sort((a, b) => {
							const aMatch = a.match(/v(\d+)\.(\d+)/);
							const bMatch = b.match(/v(\d+)\.(\d+)/);
							if (aMatch && bMatch) {
								const aMajor = parseInt(aMatch[1]);
								const bMajor = parseInt(bMatch[1]);
								if (aMajor !== bMajor) {return bMajor - aMajor;}
								return parseInt(bMatch[2]) - parseInt(aMatch[2]);
							}
							return b.localeCompare(a);
						});
					
					for (const ver of versionDirs) {
						const packsBase = path.join(base, ver, 'packs', 'Microchip', 'PIC32MZ-EF_DFP');
						if (!fs.existsSync(packsBase)) {continue;}
						
						const dfpEntries = fs.readdirSync(packsBase, { withFileTypes: true });
						const dfpVersions = dfpEntries
							.filter(d => d.isDirectory())
							.map(d => d.name)
							.sort((a, b) => {
								// Sort by version descending (1.4.168 > 1.3.100)
								const aParts = a.split('.').map(Number);
								const bParts = b.split('.').map(Number);
								for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
									const aVal = aParts[i] || 0;
									const bVal = bParts[i] || 0;
									if (aVal !== bVal) {return bVal - aVal;}
								}
								return 0;
							});
						
						if (dfpVersions.length > 0) {
							const candidate = path.join(packsBase, dfpVersions[0]);
							// Verify it has xc32 subdirectory
							if (fs.existsSync(path.join(candidate, 'xc32'))) {
								dfpPath = candidate;
								break;
							}
						}
					}
				} else {
					// Direct DFP base - list version folders
					const dfpEntries = fs.readdirSync(base, { withFileTypes: true });
					const dfpVersions = dfpEntries
						.filter(d => d.isDirectory())
						.map(d => d.name)
						.sort((a, b) => {
							const aParts = a.split('.').map(Number);
							const bParts = b.split('.').map(Number);
							for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
								const aVal = aParts[i] || 0;
								const bVal = bParts[i] || 0;
								if (aVal !== bVal) {return bVal - aVal;}
							}
							return 0;
						});
					
					if (dfpVersions.length > 0) {
						const candidate = path.join(base, dfpVersions[0]);
						if (fs.existsSync(path.join(candidate, 'xc32'))) {
							dfpPath = candidate;
							break;
						}
					}
				}
			} catch {
				// Continue searching other locations
			}
			
			if (dfpPath) {break;}
		}
	}

	return { xc32Bin, dfpPath };
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
