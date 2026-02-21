/**
 * PIC32-IDE-VSCode Extension
 * MPLABX project import with Makefile generation
 * MikroC project generation using config UI
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { MPLABXImporter, saveMetadata, ProjectMetadata, ProjectInfo } from './projectImporter';
const packageJson = require('../package.json');
import { MakefileGenerator } from './makefileGenerator';
import { MikroCImporter } from './mikrocImporter';
import { BootloaderUpdater } from './bootloaderUpdater';
import { BundledToolsManager } from './bundledTools';
import { loadDeviceDefinitions, getAllDevicesFlat, DeviceDefinition, detectDeviceFamily, getConfigBits, getDeviceClockFrequency } from './deviceLoader';
import { ConfigEditorProvider, generateXC32Config, generatePBCLKStartup } from './configEditor';

// Device definitions loaded from JSON files at runtime
let SUPPORTED_DEVICES: Record<string, DeviceDefinition[]> = {
    'PIC32MZ-EF (High Performance)': [
        // 2MB Flash variants (512KB RAM)
        { label: '32MZ2048EFG064', description: '2MB Flash, 512KB RAM, 64-pin (EFG - No CAN)' },
        { label: '32MZ2048EFG100', description: '2MB Flash, 512KB RAM, 100-pin (EFG - No CAN)' },
        { label: '32MZ2048EFG144', description: '2MB Flash, 512KB RAM, 144-pin (EFG - No CAN)' },
        { label: '32MZ2048EFH064', description: '2MB Flash, 512KB RAM, 64-pin (EFH - CAN, 252MHz)' },
        { label: '32MZ2048EFH100', description: '2MB Flash, 512KB RAM, 100-pin (EFH - CAN, 252MHz)' },
        { label: '32MZ2048EFH144', description: '2MB Flash, 512KB RAM, 144-pin (EFH - CAN, 252MHz)' },
        { label: '32MZ2048EFM064', description: '2MB Flash, 512KB RAM, 64-pin (EFM - CAN+Crypto)' },
        { label: '32MZ2048EFM100', description: '2MB Flash, 512KB RAM, 100-pin (EFM - CAN+Crypto)' },
        { label: '32MZ2048EFM144', description: '2MB Flash, 512KB RAM, 144-pin (EFM - CAN+Crypto)' },
        // 1MB Flash variants (512KB RAM)
        { label: '32MZ1024EFG064', description: '1MB Flash, 512KB RAM, 64-pin (EFG - No CAN)' },
        { label: '32MZ1024EFG100', description: '1MB Flash, 512KB RAM, 100-pin (EFG - No CAN)' },
        { label: '32MZ1024EFG144', description: '1MB Flash, 512KB RAM, 144-pin (EFG - No CAN)' },
        { label: '32MZ1024EFH064', description: '1MB Flash, 512KB RAM, 64-pin (EFH - CAN)' },
        { label: '32MZ1024EFH100', description: '1MB Flash, 512KB RAM, 100-pin (EFH - CAN)' },
        { label: '32MZ1024EFH144', description: '1MB Flash, 512KB RAM, 144-pin (EFH - CAN)' },
        { label: '32MZ1024EFM064', description: '1MB Flash, 512KB RAM, 64-pin (EFM - CAN+Crypto)' },
        { label: '32MZ1024EFM100', description: '1MB Flash, 512KB RAM, 100-pin (EFM - CAN+Crypto)' },
        { label: '32MZ1024EFM144', description: '1MB Flash, 512KB RAM, 144-pin (EFM - CAN+Crypto)' },
        // 1MB Flash variants (256KB RAM)
        { label: '32MZ1024EFE064', description: '1MB Flash, 256KB RAM, 64-pin (EFE - No CAN)' },
        { label: '32MZ1024EFE100', description: '1MB Flash, 256KB RAM, 100-pin (EFE - No CAN)' },
        { label: '32MZ1024EFE144', description: '1MB Flash, 256KB RAM, 144-pin (EFE - No CAN)' },
        { label: '32MZ1024EFF064', description: '1MB Flash, 256KB RAM, 64-pin (EFF - CAN)' },
        { label: '32MZ1024EFF100', description: '1MB Flash, 256KB RAM, 100-pin (EFF - CAN)' },
        { label: '32MZ1024EFF144', description: '1MB Flash, 256KB RAM, 144-pin (EFF - CAN)' },
        { label: '32MZ1024EFK064', description: '1MB Flash, 256KB RAM, 64-pin (EFK - CAN+Crypto)' },
        { label: '32MZ1024EFK100', description: '1MB Flash, 256KB RAM, 100-pin (EFK - CAN+Crypto)' },
        { label: '32MZ1024EFK144', description: '1MB Flash, 256KB RAM, 144-pin (EFK - CAN+Crypto)' },
        // 512KB Flash variants (128KB RAM)
        { label: '32MZ0512EFE064', description: '512KB Flash, 128KB RAM, 64-pin (EFE - No CAN)' },
        { label: '32MZ0512EFE100', description: '512KB Flash, 128KB RAM, 100-pin (EFE - No CAN)' },
        { label: '32MZ0512EFE144', description: '512KB Flash, 128KB RAM, 144-pin (EFE - No CAN)' },
        { label: '32MZ0512EFF064', description: '512KB Flash, 128KB RAM, 64-pin (EFF - CAN)' },
        { label: '32MZ0512EFF100', description: '512KB Flash, 128KB RAM, 100-pin (EFF - CAN)' },
        { label: '32MZ0512EFF144', description: '512KB Flash, 128KB RAM, 144-pin (EFF - CAN)' },
        { label: '32MZ0512EFK064', description: '512KB Flash, 128KB RAM, 64-pin (EFK - CAN+Crypto)' },
        { label: '32MZ0512EFK100', description: '512KB Flash, 128KB RAM, 100-pin (EFK - CAN+Crypto)' },
        { label: '32MZ0512EFK144', description: '512KB Flash, 128KB RAM, 144-pin (EFK - CAN+Crypto)' },
    ],
    'PIC32MX (General Purpose)': [
        // PIC32MX1/2 Series (28-pin, basic/USB, 40-50MHz)
        { label: '32MX110F016B', description: '16KB Flash, 4KB RAM, 28-pin' },
        { label: '32MX120F032B', description: '32KB Flash, 4KB RAM, 28-pin' },
        { label: '32MX130F064B', description: '64KB Flash, 16KB RAM, 28-pin' },
        { label: '32MX130F256B', description: '256KB Flash, 16KB RAM, 28-pin' },
        { label: '32MX150F128B', description: '128KB Flash, 32KB RAM, 28-pin' },
        { label: '32MX170F256B', description: '256KB Flash, 64KB RAM, 28-pin' },
        { label: '32MX170F512H', description: '512KB Flash, 64KB RAM, 64-pin' },
        { label: '32MX170F512L', description: '512KB Flash, 64KB RAM, 100-pin' },
        { label: '32MX210F016B', description: '16KB Flash, 4KB RAM, 28-pin (USB)' },
        { label: '32MX220F032B', description: '32KB Flash, 8KB RAM, 28-pin (USB)' },
        { label: '32MX230F064B', description: '64KB Flash, 16KB RAM, 28-pin (USB)' },
        { label: '32MX230F256B', description: '256KB Flash, 16KB RAM, 28-pin (USB)' },
        { label: '32MX250F128B', description: '128KB Flash, 32KB RAM, 28-pin (USB)' },
        { label: '32MX270F256B', description: '256KB Flash, 64KB RAM, 28-pin (USB)' },
        { label: '32MX270F512H', description: '512KB Flash, 64KB RAM, 64-pin (USB)' },
        { label: '32MX270F512L', description: '512KB Flash, 64KB RAM, 100-pin (USB)' },
        // PIC32MX1/2 Series (44-pin variants)
        { label: '32MX110F016D', description: '16KB Flash, 4KB RAM, 44-pin' },
        { label: '32MX120F032D', description: '32KB Flash, 8KB RAM, 44-pin' },
        { label: '32MX130F064D', description: '64KB Flash, 16KB RAM, 44-pin' },
        { label: '32MX130F256D', description: '256KB Flash, 16KB RAM, 44-pin' },
        { label: '32MX150F128D', description: '128KB Flash, 64KB RAM, 44-pin' },
        { label: '32MX170F256D', description: '256KB Flash, 64KB RAM, 44-pin' },
        { label: '32MX210F016D', description: '16KB Flash, 4KB RAM, 44-pin (USB)' },
        { label: '32MX220F032D', description: '32KB Flash, 8KB RAM, 44-pin (USB)' },
        { label: '32MX230F064D', description: '64KB Flash, 16KB RAM, 44-pin (USB)' },
        { label: '32MX230F256D', description: '256KB Flash, 16KB RAM, 44-pin (USB)' },
        { label: '32MX250F128D', description: '128KB Flash, 32KB RAM, 44-pin (USB)' },
        { label: '32MX270F256D', description: '256KB Flash, 64KB RAM, 44-pin (USB)' },
        // PIC32MX1/2 Series (64-pin and 100-pin variants)
        { label: '32MX120F064H', description: '64KB Flash, 8KB RAM, 64-pin' },
        { label: '32MX130F128H', description: '128KB Flash, 16KB RAM, 64-pin' },
        { label: '32MX130F128L', description: '128KB Flash, 16KB RAM, 100-pin' },
        { label: '32MX150F256H', description: '256KB Flash, 32KB RAM, 64-pin' },
        { label: '32MX150F256L', description: '256KB Flash, 32KB RAM, 100-pin' },
        { label: '32MX230F128H', description: '128KB Flash, 16KB RAM, 64-pin (USB)' },
        { label: '32MX230F128L', description: '128KB Flash, 16KB RAM, 100-pin (USB)' },
        { label: '32MX250F256H', description: '256KB Flash, 32KB RAM, 64-pin (USB)' },
        { label: '32MX250F256L', description: '256KB Flash, 32KB RAM, 100-pin (USB)' },
        // PIC32MX154/174/254/274 Series (CTMU, Low Power)
        { label: '32MX154F128B', description: '128KB Flash, 32KB RAM, 28-pin (CTMU)' },
        { label: '32MX154F128D', description: '128KB Flash, 32KB RAM, 44-pin (CTMU)' },
        { label: '32MX174F256B', description: '256KB Flash, 64KB RAM, 28-pin (CTMU)' },
        { label: '32MX174F256D', description: '256KB Flash, 64KB RAM, 44-pin (CTMU)' },
        { label: '32MX254F128B', description: '128KB Flash, 32KB RAM, 28-pin (USB+CTMU)' },
        { label: '32MX254F128D', description: '128KB Flash, 32KB RAM, 44-pin (USB+CTMU)' },
        { label: '32MX274F256B', description: '256KB Flash, 64KB RAM, 28-pin (USB+CTMU)' },
        { label: '32MX274F256D', description: '256KB Flash, 64KB RAM, 44-pin (USB+CTMU)' },
        // PIC32MX3/4 Series (64-pin, 80-120MHz)
        { label: '32MX320F032H', description: '32KB Flash, 8KB RAM, 64-pin' },
        { label: '32MX320F064H', description: '64KB Flash, 16KB RAM, 64-pin' },
        { label: '32MX320F128H', description: '128KB Flash, 16KB RAM, 64-pin' },
        { label: '32MX320F128L', description: '128KB Flash, 16KB RAM, 100-pin' },
        { label: '32MX330F064H', description: '64KB Flash, 16KB RAM, 64-pin' },
        { label: '32MX330F064L', description: '64KB Flash, 16KB RAM, 100-pin' },
        { label: '32MX340F128H', description: '128KB Flash, 32KB RAM, 64-pin (USB)' },
        { label: '32MX340F128L', description: '128KB Flash, 32KB RAM, 100-pin (USB)' },
        { label: '32MX340F256H', description: '256KB Flash, 32KB RAM, 64-pin (USB)' },
        { label: '32MX340F512H', description: '512KB Flash, 32KB RAM, 64-pin (USB)' },
        { label: '32MX350F128H', description: '128KB Flash, 32KB RAM, 64-pin' },
        { label: '32MX350F128L', description: '128KB Flash, 32KB RAM, 100-pin' },
        { label: '32MX350F256H', description: '256KB Flash, 64KB RAM, 64-pin' },
        { label: '32MX350F256L', description: '256KB Flash, 64KB RAM, 100-pin' },
        { label: '32MX360F256L', description: '256KB Flash, 32KB RAM, 100-pin (USB)' },
        { label: '32MX360F512L', description: '512KB Flash, 32KB RAM, 100-pin (USB)' },
        { label: '32MX370F512H', description: '512KB Flash, 128KB RAM, 64-pin' },
        { label: '32MX370F512L', description: '512KB Flash, 128KB RAM, 100-pin' },
        { label: '32MX420F032H', description: '32KB Flash, 8KB RAM, 64-pin (USB)' },
        { label: '32MX430F064H', description: '64KB Flash, 16KB RAM, 64-pin (USB)' },
        { label: '32MX430F064L', description: '64KB Flash, 16KB RAM, 100-pin (USB)' },
        { label: '32MX440F128H', description: '128KB Flash, 32KB RAM, 64-pin (USB)' },
        { label: '32MX440F128L', description: '128KB Flash, 32KB RAM, 100-pin (USB)' },
        { label: '32MX440F256H', description: '256KB Flash, 32KB RAM, 64-pin (USB)' },
        { label: '32MX440F512H', description: '512KB Flash, 32KB RAM, 64-pin (USB)' },
        { label: '32MX450F128H', description: '128KB Flash, 32KB RAM, 64-pin (USB)' },
        { label: '32MX450F128L', description: '128KB Flash, 32KB RAM, 100-pin (USB)' },
        { label: '32MX450F256H', description: '256KB Flash, 64KB RAM, 64-pin (USB)' },
        { label: '32MX450F256L', description: '256KB Flash, 64KB RAM, 100-pin (USB)' },
        { label: '32MX460F256L', description: '256KB Flash, 32KB RAM, 100-pin (USB)' },
        { label: '32MX460F512L', description: '512KB Flash, 32KB RAM, 100-pin (USB)' },
        { label: '32MX470F512H', description: '512KB Flash, 128KB RAM, 64-pin (USB)' },
        { label: '32MX470F512L', description: '512KB Flash, 128KB RAM, 100-pin (USB)' },
        // PIC32MX5/6/7 Series (USB+Ethernet, CAN, 64-100 pin)
        { label: '32MX530F128H', description: '128KB Flash, 16KB RAM, 64-pin (USB+CAN)' },
        { label: '32MX530F128L', description: '128KB Flash, 16KB RAM, 100-pin (USB+Ethernet+CAN)' },
        { label: '32MX534F064H', description: '64KB Flash, 16KB RAM, 64-pin (USB+CAN)' },
        { label: '32MX534F064L', description: '64KB Flash, 16KB RAM, 100-pin (USB+CAN)' },
        { label: '32MX550F256H', description: '256KB Flash, 32KB RAM, 64-pin (USB+CAN)' },
        { label: '32MX550F256L', description: '256KB Flash, 32KB RAM, 100-pin (USB+CAN)' },
        { label: '32MX564F064H', description: '64KB Flash, 16KB RAM, 64-pin (USB+Ethernet+CAN)' },
        { label: '32MX564F064L', description: '64KB Flash, 16KB RAM, 100-pin (USB+Ethernet+CAN)' },
        { label: '32MX564F128H', description: '128KB Flash, 32KB RAM, 64-pin (USB+Ethernet+CAN)' },
        { label: '32MX564F128L', description: '128KB Flash, 32KB RAM, 100-pin (USB+Ethernet+CAN)' },
        { label: '32MX570F512H', description: '512KB Flash, 64KB RAM, 64-pin (USB+CAN)' },
        { label: '32MX570F512L', description: '512KB Flash, 64KB RAM, 100-pin (USB+CAN)' },
        { label: '32MX575F256H', description: '256KB Flash, 64KB RAM, 64-pin (USB+CAN)' },
        { label: '32MX575F256L', description: '256KB Flash, 64KB RAM, 100-pin (USB+CAN)' },
        { label: '32MX575F512H', description: '512KB Flash, 128KB RAM, 64-pin (USB+CAN)' },
        { label: '32MX575F512L', description: '512KB Flash, 128KB RAM, 100-pin (USB+CAN)' },
        { label: '32MX664F064H', description: '64KB Flash, 16KB RAM, 64-pin (USB+Ethernet)' },
        { label: '32MX664F064L', description: '64KB Flash, 16KB RAM, 100-pin (USB+Ethernet)' },
        { label: '32MX664F128H', description: '128KB Flash, 32KB RAM, 64-pin (USB+Ethernet)' },
        { label: '32MX664F128L', description: '128KB Flash, 32KB RAM, 100-pin (USB+Ethernet)' },
        { label: '32MX675F256H', description: '256KB Flash, 64KB RAM, 64-pin (USB+Ethernet)' },
        { label: '32MX675F256L', description: '256KB Flash, 64KB RAM, 100-pin (USB+Ethernet)' },
        { label: '32MX675F512H', description: '512KB Flash, 128KB RAM, 64-pin (USB+Ethernet)' },
        { label: '32MX675F512L', description: '512KB Flash, 128KB RAM, 100-pin (USB+Ethernet)' },
        { label: '32MX695F512H', description: '512KB Flash, 128KB RAM, 64-pin (USB+Ethernet)' },
        { label: '32MX695F512L', description: '512KB Flash, 128KB RAM, 100-pin (USB+Ethernet)' },
        { label: '32MX764F128H', description: '128KB Flash, 32KB RAM, 64-pin (USB+Ethernet+CAN)' },
        { label: '32MX764F128L', description: '128KB Flash, 32KB RAM, 100-pin (USB+Ethernet+CAN)' },
        { label: '32MX775F256H', description: '256KB Flash, 64KB RAM, 64-pin (USB+Ethernet+CAN)' },
        { label: '32MX775F256L', description: '256KB Flash, 64KB RAM, 100-pin (USB+Ethernet+CAN)' },
        { label: '32MX775F512H', description: '512KB Flash, 128KB RAM, 64-pin (USB+Ethernet+CAN)' },
        { label: '32MX775F512L', description: '512KB Flash, 128KB RAM, 100-pin (USB+Ethernet+CAN)' },
        { label: '32MX795F512H', description: '512KB Flash, 128KB RAM, 64-pin (USB+Ethernet+CAN)' },
        { label: '32MX795F512L', description: '512KB Flash, 128KB RAM, 100-pin (USB+Ethernet+CAN)' },
    ]
};

let flashStatusBarItem: vscode.StatusBarItem;
let programStatusBarItem: vscode.StatusBarItem;
let buildStatusBarItem: vscode.StatusBarItem;
let rebuildStatusBarItem: vscode.StatusBarItem;
let bootloaderUpdater: BootloaderUpdater;
let bundledTools: BundledToolsManager;

/**
 * Detect installed XC32 compiler and return the latest version path
 * Uses hybrid approach: quick check common paths, then optional deep search
 * TODO: Add Linux support when Windows version is complete
 */
async function detectXC32Compiler(): Promise<string | null> {
    try {
        // Step 1: Quick check common installation paths (instant)
        const commonPaths = [
            'C:/Program Files/Microchip/xc32',
            'C:/Program Files (x86)/Microchip/xc32',
            'C:/Microchip/xc32'
        ];

        for (const basePath of commonPaths) {
            if (fs.existsSync(basePath)) {
                console.log(`Checking common path: ${basePath}`);
                const versionDirs = fs.readdirSync(basePath)
                    .filter(name => name.startsWith('v'))
                    .map(name => ({ name, path: path.join(basePath, name) }))
                    .filter(item => fs.existsSync(path.join(item.path, 'bin', 'xc32-gcc.exe')))
                    .sort((a, b) => b.name.localeCompare(a.name)); // Sort descending

                if (versionDirs.length > 0) {
                    const foundPath = versionDirs[0].path.replace(/\\/g, '/');
                    console.log(`Found XC32 compiler: ${foundPath}`);
                    return foundPath;
                }
            }
        }

        console.log('XC32 compiler not found in common locations');
        return null;
    } catch (error) {
        console.error('Error detecting XC32 compiler:', error);
        return null;
    }
}

/**
 * Detect DFP (Device Family Pack) location for a given device
 * Returns the path to the DFP directory or null if not found
 */
async function detectDFP(deviceName: string): Promise<string | null> {
    try {
        // Determine device family from device name
        let dfpFamily = '';
        if (deviceName.startsWith('32MZ') && (deviceName.includes('EF') || deviceName.includes('EC'))) {
            dfpFamily = 'PIC32MZ-EF_DFP';
        } else if (deviceName.startsWith('32MZ')) {
            dfpFamily = 'PIC32MZ-DA_DFP';
        } else if (deviceName.startsWith('32MX')) {
            dfpFamily = 'PIC32MX_DFP';
        } else if (deviceName.startsWith('32MK')) {
            dfpFamily = 'PIC32MK_DFP';
        } else {
            console.log(`Unknown device family for ${deviceName}`);
            return null;
        }

        // Check common DFP locations (ordered by likelihood)
        const commonPaths = [
            'C:/Program Files/Microchip/MPLABX',                     // MPLABX v6.25+ (most common)
            'C:/Program Files (x86)/Microchip/MPLABX',              // MPLABX (x86)
            'C:/Program Files/Microchip/packs/Microchip',           // Standalone packs directory
            'C:/.microchip/packs/Microchip'                          // User packs cache
        ];

        for (const basePath of commonPaths) {
            if (!fs.existsSync(basePath)) {
                continue;
            }

            // Search for DFP in MPLABX packs directory
            if (basePath.includes('MPLABX')) {
                const versions = fs.readdirSync(basePath).filter(v => v.startsWith('v'));
                for (const version of versions) {
                    const packsDir = path.join(basePath, version, 'packs', 'Microchip', dfpFamily);
                    if (fs.existsSync(packsDir)) {
                        // Get latest version
                        const dfpVersions = fs.readdirSync(packsDir)
                            .filter(v => fs.existsSync(path.join(packsDir, v, 'xc32')))
                            .sort((a, b) => b.localeCompare(a));
                        
                        if (dfpVersions.length > 0) {
                            const dfpPath = path.join(packsDir, dfpVersions[0]).replace(/\\/g, '/');
                            console.log(`Found DFP: ${dfpPath}`);
                            return dfpPath;
                        }
                    }
                }
            } else {
                // Check .microchip/packs directory
                const dfpDir = path.join(basePath, dfpFamily);
                if (fs.existsSync(dfpDir)) {
                    const dfpVersions = fs.readdirSync(dfpDir)
                        .filter(v => fs.existsSync(path.join(dfpDir, v, 'xc32')))
                        .sort((a, b) => b.localeCompare(a));
                    
                    if (dfpVersions.length > 0) {
                        const dfpPath = path.join(dfpDir, dfpVersions[0]).replace(/\\/g, '/');
                        console.log(`Found DFP: ${dfpPath}`);
                        return dfpPath;
                    }
                }
            }
        }

        console.log(`DFP not found for ${deviceName} (${dfpFamily})`);
        return null;
    } catch (error) {
        console.error('Error detecting DFP:', error);
        return null;
    }
}

/**
 * Download and install DFP for a device from Microchip packs repository
 */
async function downloadDFP(deviceName: string): Promise<string | null> {
    // Determine device family
    let dfpFamily = '';
    let packName = '';
    
    if (deviceName.startsWith('32MZ') && (deviceName.includes('EF') || deviceName.includes('EC'))) {
        dfpFamily = 'PIC32MZ-EF_DFP';
        packName = 'Microchip.PIC32MZ-EF_DFP';
    } else if (deviceName.startsWith('32MZ')) {
        dfpFamily = 'PIC32MZ-DA_DFP';
        packName = 'Microchip.PIC32MZ-DA_DFP';
    } else if (deviceName.startsWith('32MX')) {
        dfpFamily = 'PIC32MX_DFP';
        packName = 'Microchip.PIC32MX_DFP';
    } else if (deviceName.startsWith('32MK')) {
        dfpFamily = 'PIC32MK_DFP';
        packName = 'Microchip.PIC32MK_DFP';
    } else {
        vscode.window.showErrorMessage(`Unknown device family for ${deviceName}`);
        return null;
    }

    const choice = await vscode.window.showWarningMessage(
        `DFP (Device Family Pack) not found for ${deviceName}.\n\nRequired: ${dfpFamily}\n\nXC32 v4.0+ requires DFP for compilation.\n\nYou can:\n• Browse to existing DFP location\n• Download and install DFP manually\n• Continue and configure later`,
        'Browse for DFP',
        'Show Instructions',
        'Continue Anyway'
    );

    if (choice === 'Browse for DFP') {
        // Let user browse to DFP folder
        const selectedPath = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: `Select ${dfpFamily} Version Folder`,
            title: `Locate ${dfpFamily} (containing xc32 subfolder)`
        });
        
        if (selectedPath && selectedPath.length > 0) {
            const selectedDir = selectedPath[0].fsPath;
            // Verify it's a valid DFP installation (must have xc32 subfolder)
            if (fs.existsSync(path.join(selectedDir, 'xc32'))) {
                const dfpPath = selectedDir.replace(/\\/g, '/');
                vscode.window.showInformationMessage(`Using DFP: ${dfpPath}`);
                return dfpPath;
            } else {
                vscode.window.showErrorMessage(`Selected folder does not contain 'xc32' subfolder. Please select the DFP version folder (e.g., PIC32MZ-EF_DFP/1.3.231)`);
                return null;
            }
        }
        return null;
    } else if (choice === 'Show Instructions') {
        vscode.window.showInformationMessage(
            `To install ${dfpFamily}:\n\n` +
            `1. Visit: https://www.microchip.com/packs\n` +
            `2. Search for: "${packName}"\n` +
            `3. Download the .atpack file\n` +
            `4. Create directory: C:\\Program Files\\Microchip\\packs\\Microchip\\${dfpFamily}\\<version>\n` +
            `5. Extract .atpack contents to that directory\n` +
            `6. Update DFP_PATH variable in Makefile\n\n` +
            `Note: Adjust v6.25 to match your MPLABX version if different.`,
            { modal: true }
        );
        return null;
    }

    return null;
}

/**
 * Clean up old extension versions from PATH and add current version
 * 
 * This function uses exact string matching instead of regex patterns.
 * The exact path that was added is stored in globalState, so we can
 * remove it precisely on updates without complex pattern matching.
 * 
 * @param currentPath The new path to add
 * @param oldPath The exact old path to remove (if any)
 * @param execAsync Promisified exec function
 */
async function cleanupOldPathEntries(currentPath: string, oldPath: string | null, execAsync: any): Promise<void> {
    console.log('[PATH] Cleaning up old extension versions from PATH...');
    
    const cleanupScript = `
        $currentPath = '${currentPath.replace(/\\/g, '\\\\')}';
        $userPath = [Environment]::GetEnvironmentVariable('Path', 'User');
        
        if ($null -eq $userPath) { 
            Write-Output 'ERROR: No user PATH found'
            exit 1
        }
        
        # Split PATH into entries
        $pathEntries = $userPath -split ';';
        
        # Remove the exact old path if provided
        $oldPath = '${oldPath ? oldPath.replace(/\\/g, '\\\\\\\\').replace(/'/g, "''") : ''}';
        
        if ($oldPath -ne '') {
            Write-Host "Removing old extension path: $oldPath" -ForegroundColor Yellow
            $cleanedEntries = $pathEntries | Where-Object { 
                $_ -ne $oldPath
            }
        } else {
            Write-Host "No old path to remove" -ForegroundColor Gray
            $cleanedEntries = $pathEntries
        }
        
        # Add current version
        $newPath = "$currentPath;" + ($cleanedEntries -join ';');
        
        # Remove any trailing semicolons
        $newPath = $newPath -replace ';+$', '';
        
        try {
            [Environment]::SetEnvironmentVariable('Path', $newPath, 'User');
            Write-Output 'SUCCESS'
        } catch {
            Write-Output "ERROR: $($_.Exception.Message)"
        }
    `;
    
    const scriptBase64 = Buffer.from(cleanupScript, 'utf16le').toString('base64');
    
    try {
        const { stdout, stderr } = await execAsync(
            `powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand "${scriptBase64}"`,
            { timeout: 10000 }
        );
        
        if (stderr) {
            console.error('[PATH] Cleanup stderr:', stderr);
        }
        
        const result = stdout.trim();
        console.log('[PATH] Cleanup result:', result);
        
        if (result === 'SUCCESS') {
            console.log('[PATH] Successfully cleaned up old versions and added current version');
        } else {
            console.warn('[PATH] Cleanup may have failed:', result);
        }
    } catch (error) {
        console.error('[PATH] Error during cleanup:', error);
    }
}

/**
 * Add bundled tools to user's PATH environment variable (Windows only)
 * This allows users to just type "make" from any terminal
 */
async function addBundledToolsToPath(context: vscode.ExtensionContext): Promise<void> {
    // Only for Windows
    if (process.platform !== 'win32') {
        return;
    }

    const currentVersion = packageJson.version;
    const PATH_HANDLED_KEY = `pic32.path.handled.v${currentVersion}`;
    const PATH_ADDED_KEY = 'pic32.path.addedPath';  // Stores the exact path we added
    const alreadyHandled = context.globalState.get<boolean>(PATH_HANDLED_KEY, false);
    
    if (alreadyHandled) {
        console.log(`[PATH] Already handled for v${currentVersion}, skipping check`);
        return;
    }

    const bundledBinPath = path.join(context.extensionPath, 'bin', 'win32');
    console.log(`[PATH] Checking if bundled tools (v${currentVersion}) need to be added to PATH: ${bundledBinPath}`);
    
    try {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        // Check if CURRENT version's path exists, and if a saved old path exists
        const savedOldPath = context.globalState.get<string>(PATH_ADDED_KEY, '');
        
        const checkScript = `
            $currentPath = '${bundledBinPath.replace(/\\/g, '\\\\')}';
            $savedOldPath = '${savedOldPath.replace(/\\/g, '\\\\').replace(/'/g, "''")}';
            $userPath = [Environment]::GetEnvironmentVariable('Path', 'User');
            
            if ($null -eq $userPath) { 
                Write-Output 'NOT_FOUND'
                exit
            }
            
            # Split into entries for exact matching
            $pathEntries = $userPath -split ';';
            $currentExists = $pathEntries -contains $currentPath
            $oldPathExists = ($savedOldPath -ne '') -and ($pathEntries -contains $savedOldPath)
            
            if ($currentExists -and -not $oldPathExists) {
                # Current version exists and no old version - all good
                Write-Output 'CURRENT_EXISTS_CLEAN'
                exit
            }
            
            if ($currentExists -and $oldPathExists -and ($currentPath -ne $savedOldPath)) {
                # Both exist but they're different - need cleanup
                Write-Output 'CURRENT_EXISTS_WITH_OLD'
                exit
            }
            
            if ($oldPathExists -and -not $currentExists) {
                # Old version exists, current doesn't - update needed
                Write-Output 'OLD_VERSION_EXISTS'
                exit
            }
            
            Write-Output 'NOT_FOUND'
        `;
        
        const scriptBase64 = Buffer.from(checkScript, 'utf16le').toString('base64');
        
        const { stdout, stderr } = await execAsync(
            `powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand "${scriptBase64}"`,
            { timeout: 5000 }
        );
        
        if (stderr) {
            console.error('[PATH] PowerShell stderr:', stderr);
        }
        
        const checkResult = stdout.trim();
        console.log(`[PATH] Check result: ${checkResult}`);
        
        if (checkResult === 'CURRENT_EXISTS_CLEAN') {
            console.log(`[PATH] Current version (v${currentVersion}) already in PATH, no duplicates`);
            await context.globalState.update(PATH_HANDLED_KEY, true);
            return;
        }
        
        if (checkResult === 'CURRENT_EXISTS_WITH_OLD') {
            console.log('[PATH] Current version exists but old version also detected, cleaning up...');
            // Auto-cleanup without prompting - remove old version, keep current
            await cleanupOldPathEntries(bundledBinPath, savedOldPath, execAsync);
            // Update saved path to current
            await context.globalState.update(PATH_ADDED_KEY, bundledBinPath);
            await context.globalState.update(PATH_HANDLED_KEY, true);
            
            vscode.window.showInformationMessage(
                `✓ Removed old extension path from PATH (v${currentVersion} kept)\n\nRestart VS Code to apply changes.`,
                { modal: false }
            );
            return;
        }
        
        if (checkResult === 'OLD_VERSION_EXISTS') {
            console.log('[PATH] Old version detected, auto-updating to current version...');
            // Auto-update without prompting - remove old, add new
            await cleanupOldPathEntries(bundledBinPath, savedOldPath, execAsync);
            // Update saved path to current
            await context.globalState.update(PATH_ADDED_KEY, bundledBinPath);
            await context.globalState.update(PATH_HANDLED_KEY, true);
            
            vscode.window.showInformationMessage(
                `✓ Bundled tools updated to v${currentVersion}\n\nRestart VS Code to apply changes.`,
                { modal: false }
            );
            return;
        }

        // Ask user if they want to add to PATH
        const choice = await vscode.window.showInformationMessage(
            'To use "make" from any terminal, the bundled tools need to be added to your PATH.\n\nThis is a one-time setup (no admin rights needed).\n\nPath to add:\n' + bundledBinPath,
            { modal: true },
            'Add to PATH',
            'Skip'
        );

        if (choice !== 'Add to PATH') {
            console.log('[PATH] User chose to skip PATH addition');
            // Mark as handled so we don't keep asking (for this version)
            await context.globalState.update(PATH_HANDLED_KEY, true);
            return;
        }

        // Add to user PATH using PowerShell with Base64 encoding to avoid quoting issues
        const addScript = `
            $targetPath = '${bundledBinPath.replace(/\\/g, '\\\\')}';
            $userPath = [Environment]::GetEnvironmentVariable('Path', 'User');
            if ($null -eq $userPath) { $userPath = '' }
            if ($userPath -notlike "*$targetPath*") {
                if ($userPath -eq '') { $newPath = $targetPath }
                else { $newPath = "$targetPath;$userPath" }
                try {
                    [Environment]::SetEnvironmentVariable('Path', $newPath, 'User');
                    Write-Output 'SUCCESS'
                } catch {
                    Write-Output "ERROR: $($_.Exception.Message)"
                }
            } else {
                Write-Output 'ALREADY_EXISTS'
            }
        `;

        console.log('[PATH] Attempting to add to PATH...');
        const addScriptBase64 = Buffer.from(addScript, 'utf16le').toString('base64');
        
        const { stdout: addResult, stderr: addStderr } = await execAsync(
            `powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand "${addScriptBase64}"`,
            { timeout: 10000 }
        );
        
        if (addStderr) {
            console.error('[PATH] PowerShell add stderr:', addStderr);
        }
        
        console.log('[PATH] Add result:', addResult.trim());
        
        const result = addResult.trim();
        if (result === 'SUCCESS' || result === 'ALREADY_EXISTS') {
            // Save the exact path we added for future cleanup
            await context.globalState.update(PATH_ADDED_KEY, bundledBinPath);
            // Mark as handled so we don't prompt again
            await context.globalState.update(PATH_HANDLED_KEY, true);
            
            await vscode.window.showInformationMessage(
                '✓ Bundled tools added to PATH!\n\nIMPORTANT: Restart VS Code to apply changes.\n\nAfter restart, you can use "make" in any terminal.',
                { modal: true }
            );
        } else if (result.startsWith('ERROR:')) {
            throw new Error(result);
        } else {
            throw new Error('Unknown result: ' + result);
        }
    } catch (error) {
        console.error('[PATH] Failed to add bundled tools to PATH:', error);
        
        // Provide manual instructions
        const errorMsg = error instanceof Error ? error.message : String(error);
        const manualChoice = await vscode.window.showErrorMessage(
            `Failed to automatically add tools to PATH:\n${errorMsg}\n\nYou can:\n1. Add manually to User PATH\n2. Use VS Code tasks (Ctrl+Shift+B)`,
            { modal: true },
            'Show Manual Instructions',
            'Copy Path'
        );
        
        if (manualChoice === 'Show Manual Instructions') {
            vscode.window.showInformationMessage(
                `Manual PATH Setup:\n\n` +
                `1. Press Win+R, type: sysdm.cpl\n` +
                `2. Advanced → Environment Variables\n` +
                `3. Under "User variables", select Path → Edit\n` +
                `4. Click New, add: ${bundledBinPath}\n` +
                `5. Click OK, restart VS Code`,
                { modal: true }
            );
        } else if (manualChoice === 'Copy Path') {
            await vscode.env.clipboard.writeText(bundledBinPath);
            vscode.window.showInformationMessage('Path copied to clipboard!');
        }
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log('PIC32-IDE-VSCode extension activated!');

    // Load device definitions from JSON files
    try {
        SUPPORTED_DEVICES = loadDeviceDefinitions(context.extensionPath);
        const totalDevices = Object.values(SUPPORTED_DEVICES).reduce((sum, arr) => sum + arr.length, 0);
        console.log(`Loaded ${totalDevices} device definitions from JSON files`);
    } catch (error) {
        console.error('Failed to load device definitions:', error);
        vscode.window.showErrorMessage(
            'Failed to load device definitions. Extension cannot function. Please reinstall.',
            { modal: true }
        );
        return; // Cannot continue without devices
    }

    // Initialize bundled tools and bootloader updater
    bundledTools = new BundledToolsManager(context.extensionPath);
    bootloaderUpdater = new BootloaderUpdater(context, process.platform);
    bundledTools.setBootloaderUpdater(bootloaderUpdater);

    // Check for bootloader updates (non-blocking background check)
    bootloaderUpdater.checkAndUpdate().catch(err => {
        console.error('Bootloader update check failed:', err);
    });

    // Add bundled tools to PATH on first run (one-time setup)
    addBundledToolsToPath(context).catch(err => {
        console.error('Failed to add bundled tools to PATH:', err);
    });

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('pic32-ide.importMPLABX', () => importMPLABXProject(context)),
        vscode.commands.registerCommand('pic32-ide.importMikroC', () => importMikroCProject(context)),
        vscode.commands.registerCommand('pic32-ide.flash', () => flashDevice()),
        vscode.commands.registerCommand('pic32-ide.programDevice', () => programDevice()),
        vscode.commands.registerCommand('pic32-ide.editConfig', () => editProjectConfig(context)),
        vscode.commands.registerCommand('pic32-ide.build', () => buildProject()),
        vscode.commands.registerCommand('pic32-ide.rebuild', () => rebuildProject()),
        vscode.commands.registerCommand('pic32-ide.updateBootloader', () => bootloaderUpdater.forceCheckForUpdates()),
        vscode.commands.registerCommand('pic32-ide.addToPath', async () => {
            // Reset the handled flag for current version so user can re-trigger the prompt
            const currentVersion = packageJson.version;
            await context.globalState.update(`pic32.path.handled.v${currentVersion}`, false);
            await addBundledToolsToPath(context);
        }),
        vscode.commands.registerCommand('pic32-ide.cleanupPath', async () => {
            // Manual cleanup command to remove duplicate paths
            const bundledBinPath = path.join(context.extensionPath, 'bin', 'win32');
            const savedOldPath = context.globalState.get<string>('pic32.path.addedPath', '');
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);
            
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Cleaning up duplicate extension paths from PATH...',
                cancellable: false
            }, async () => {
                await cleanupOldPathEntries(bundledBinPath, savedOldPath, execAsync);
            });
            
            // Save the current path and mark as handled
            await context.globalState.update('pic32.path.addedPath', bundledBinPath);
            const currentVersion = packageJson.version;
            await context.globalState.update(`pic32.path.handled.v${currentVersion}`, true);
            
            vscode.window.showInformationMessage(
                'PATH cleanup complete! Restart VS Code to apply changes.',
                { modal: false }
            );
        })
    );
    
    // Note: createXC32Project and createMikroCProject are internal functions
    // accessed through import commands via quick pick menu

    // Status bar buttons
    buildStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 102);
    buildStatusBarItem.command = 'pic32-ide.build';
    buildStatusBarItem.text = '$(tools) Build';
    buildStatusBarItem.tooltip = 'Build project (make)';
    buildStatusBarItem.show();

    rebuildStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 101);
    rebuildStatusBarItem.command = 'pic32-ide.rebuild';
    rebuildStatusBarItem.text = '$(refresh) Rebuild';
    rebuildStatusBarItem.tooltip = 'Rebuild project (make clean && make)';
    rebuildStatusBarItem.show();

    flashStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    flashStatusBarItem.command = 'pic32-ide.flash';
    flashStatusBarItem.text = '$(zap) Flash';
    flashStatusBarItem.tooltip = 'Flash .hex file to PIC32 device via MikroE bootloader';

    programStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
    programStatusBarItem.command = 'pic32-ide.programDevice';
    programStatusBarItem.text = '$(chip) Program';
    programStatusBarItem.tooltip = 'Program device via ICSP (PICkit/ICD/SNAP) using MPLAB IPE';

    context.subscriptions.push(buildStatusBarItem, rebuildStatusBarItem, flashStatusBarItem, programStatusBarItem);

    // Show the correct flash/program button based on current workspace project type
    updateStatusBarForWorkspace();

    // Re-evaluate whenever the user opens a different folder
    context.subscriptions.push(
        vscode.workspace.onDidChangeWorkspaceFolders(() => updateStatusBarForWorkspace())
    );
}

/**
 * Show/hide Flash vs Program status bar buttons based on pic32-project.json.
 *   usesBootloader: true  → Flash (MikroE HID), hide Program (ICSP)
 *   usesBootloader: false → Program (ICSP),     hide Flash
 *   No metadata file      → show both (unknown project / fresh workspace)
 */
function updateStatusBarForWorkspace(): void {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        // No folder open — show both so buttons are always visible
        flashStatusBarItem.show();
        programStatusBarItem.show();
        return;
    }

    const metaPath = path.join(workspaceFolder.uri.fsPath, '.vscode', 'pic32-project.json');
    if (!fs.existsSync(metaPath)) {
        // Not one of our projects — show both
        flashStatusBarItem.show();
        programStatusBarItem.show();
        return;
    }

    try {
        const meta: ProjectMetadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        if (meta.usesBootloader === true) {
            flashStatusBarItem.show();
            programStatusBarItem.hide();
        } else if (meta.usesBootloader === false) {
            flashStatusBarItem.hide();
            programStatusBarItem.show();
        } else {
            // Field absent (older projects) — show both
            flashStatusBarItem.show();
            programStatusBarItem.show();
        }
    } catch {
        // Malformed JSON — show both as safe fallback
        flashStatusBarItem.show();
        programStatusBarItem.show();
    }
}

/**
 * Import or Create XC32 Project (unified workflow)
 */
async function importMPLABXProject(context: vscode.ExtensionContext) {
    // Show quick pick menu: Import or Create
    const choice = await vscode.window.showQuickPick(
        [
            {
                label: '$(folder-opened) Import Existing MPLABX Project',
                description: 'Browse for an existing MPLABX .X project folder',
                action: 'import'
            },
            {
                label: '$(new-file) Create New XC32 Project',
                description: 'Generate a new XC32 project from template',
                action: 'create'
            }
        ],
        {
            placeHolder: 'Choose an option for XC32 project workflow',
            title: 'XC32 Project Importer'
        }
    );

    if (!choice) {
        return;
    }

    if (choice.action === 'create') {
        // Delegate to create project function
        await createXC32Project(context);
        return;
    }

    // Import workflow continues below
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
        const makePath = bundledTools.getMakePath() || 'make';
        const binPath = bundledTools.getBinPath();
        const shPath = path.join(binPath, 'sh.exe').replace(/\\/g, '/');
        
        await generator.generate({
            projectInfo,
            outputPath,
            optimizationLevel: '-O2',
            makePath,
            binPath,
            shPath
        });
    });

    // Save metadata for re-import
    const metadata: ProjectMetadata = {
        projectType: 'mplabx',
        sourceProject: projectInfo.xFolderPath || projectPath,
        device: projectInfo.deviceName,
        imported: new Date().toISOString(),
        lastSync: new Date().toISOString(),
        // Bootloader projects use startup.S with -nostartfiles; CRT0 projects use ICSP
        usesBootloader: !projectInfo.usesCrt0,
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

    // Update status bar immediately so buttons reflect this project's flash method
    updateStatusBarForWorkspace();

    // Generate tasks.json from template
    const vscodeDir = path.join(outputPath, '.vscode');
    if (!fs.existsSync(vscodeDir)) {
        fs.mkdirSync(vscodeDir, { recursive: true });
    }

    const makePath = bundledTools.getMakePath();
    const binPath = bundledTools.getBinPath();
    
    // VS Code shell tasks handle path escaping automatically - don't add quotes
    const makeCommand = makePath || 'make';
    // Always provide bin path for DLL dependencies (normalized to forward slashes)
    const makeBinDir = binPath.replace(/\\/g, '/');
    // Path to bundled sh.exe for SHELL environment variable
    const shPath = path.join(binPath, 'sh.exe').replace(/\\/g, '/');

    const tasksTemplatePath = path.join(__dirname, 'templates', 'xc32', 'tasks.json.template');
    if (fs.existsSync(tasksTemplatePath)) {
        let tasksContent = fs.readFileSync(tasksTemplatePath, 'utf-8');
        tasksContent = tasksContent.replace(/\{\{MAKE_COMMAND\}\}/g, makeCommand);
        tasksContent = tasksContent.replace(/\{\{MAKE_BIN_DIR\}\}/g, makeBinDir);
        tasksContent = tasksContent.replace(/\{\{SH_PATH\}\}/g, shPath);
        
        const tasksPath = path.join(vscodeDir, 'tasks.json');
        fs.writeFileSync(tasksPath, tasksContent, 'utf-8');
        console.log('MPLABX import: tasks.json generated successfully');
        console.log('Make command:', makeCommand);
        console.log('Make bin dir:', makeBinDir);
        console.log('Shell path:', shPath);
    }

    // Ask to open project
    const openAction = await vscode.window.showInformationMessage(
        `Project imported successfully!\nLocation: ${outputPath}\n\nReady to build: Click Build button in status bar, press Ctrl+Shift+B, or type "make" in terminal`,
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
 * Create new XC32 Project with basic template
 */
async function createXC32Project(context: vscode.ExtensionContext) {
    // Get project name
    const projectName = await vscode.window.showInputBox({
        prompt: 'Enter project name',
        placeHolder: 'MyXC32Project',
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
        return;
    }

    // Get target device from dropdown
    const allDevices = Object.values(SUPPORTED_DEVICES).flat();
    const deviceChoice = await vscode.window.showQuickPick(allDevices, {
        placeHolder: 'Select target PIC32 device',
        title: 'Choose Device',
        matchOnDescription: true
    });

    if (!deviceChoice) {
        return;
    }

    const deviceName = deviceChoice.label;

    // Get device family for config editor
    const familyName = detectDeviceFamily(deviceName);
    if (!familyName) {
        vscode.window.showErrorMessage(`Unknown device family for ${deviceName}`);
        return;
    }

    // Show config editor modal for oscillator/PLL configuration
    const configProvider = new ConfigEditorProvider(
        context.extensionUri,
        {
            deviceName,
            deviceFamily: familyName,
            compiler: 'XC32'
        }
    );
    const projectConfig = await configProvider.showModal();
    
    if (!projectConfig) {
        // User cancelled config editor
        console.log('[DEBUG] User cancelled config editor');
        return;
    }

    console.log('[DEBUG] Config received:', JSON.stringify(projectConfig, null, 2));

    // Detect XC32 compiler with progress notification
    const xc32Path = await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Searching for XC32 compiler...',
        cancellable: false
    }, async () => {
        return await detectXC32Compiler();
    });
    
    // Detect DFP for the selected device
    const dfpPath = await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Searching for DFP for ${deviceName}...`,
        cancellable: false
    }, async () => {
        return await detectDFP(deviceName);
    });
    
    let finalXC32Path = xc32Path;
    
    if (!finalXC32Path) {
        const choice = await vscode.window.showWarningMessage(
            'XC32 compiler not found in standard locations:\n• C:\\Program Files\\Microchip\\xc32\n• C:\\Program Files (x86)\\Microchip\\xc32\n\nYou can:\n• Browse to XC32 installation folder\n• Generate template Makefile (edit path manually)',
            'Browse for XC32',
            'Generate Template',
            'Cancel'
        );
        
        if (choice === 'Browse for XC32') {
            const selectedPath = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                openLabel: 'Select XC32 Version Folder (e.g., v5.00)',
                title: 'Locate XC32 Compiler Installation'
            });
            
            if (selectedPath && selectedPath.length > 0) {
                const selectedDir = selectedPath[0].fsPath;
                // Verify it's a valid XC32 installation
                if (fs.existsSync(path.join(selectedDir, 'bin', 'xc32-gcc.exe'))) {
                    finalXC32Path = selectedDir.replace(/\\/g, '/');
                    vscode.window.showInformationMessage(`Using XC32 compiler: ${finalXC32Path}`);
                } else {
                    vscode.window.showErrorMessage('Selected folder does not contain xc32-gcc.exe. Please select the version folder (e.g., v5.00)');
                    return;
                }
            } else {
                return; // User cancelled browse
            }
        } else if (choice !== 'Generate Template') {
            return;
        }
        
        if (choice === 'Generate Template') {
            vscode.window.showInformationMessage('Template Makefile will be generated. Edit XC32_PATH in Makefile after creation.');
        }
    }
    
    // Handle missing DFP
    let finalDfpPath = dfpPath;
    if (!finalDfpPath) {
        finalDfpPath = await downloadDFP(deviceName);
    }

    // Ask about MikroC bootloader
    const useBootloader = await vscode.window.showQuickPick(
        [
            { label: 'No', description: 'Use standard CRT0 startup (recommended for most projects)', value: false },
            { label: 'Yes', description: 'Use custom startup.S for MikroC bootloader', value: true }
        ],
        {
            placeHolder: 'Use MikroC bootloader?',
            title: 'Bootloader Configuration'
        }
    );

    if (!useBootloader) {
        return;
    }

    const useMikroBootloader = useBootloader.value;

    // Select output folder
    const outputFolders = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: 'Select Location for New Project',
        title: 'Where should the project be created?'
    });

    if (!outputFolders || outputFolders.length === 0) {
        return;
    }

    const outputPath = path.join(outputFolders[0].fsPath, projectName);

    // Check if directory already exists
    if (fs.existsSync(outputPath)) {
        const overwrite = await vscode.window.showWarningMessage(
            `Folder "${projectName}" already exists. Overwrite?`,
            'Yes', 'No'
        );
        if (overwrite !== 'Yes') {
            return;
        }
    }

    // Create project structure
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Creating XC32 project "${projectName}"...`,
        cancellable: false
    }, async () => {
        try {
            // Create directories
            const srcsDir = path.join(outputPath, 'srcs');
            const incsDir = path.join(outputPath, 'incs');
            const objsDir = path.join(outputPath, 'objs');
            const binsDir = path.join(outputPath, 'bins');
            
            fs.mkdirSync(srcsDir, { recursive: true });
            fs.mkdirSync(incsDir, { recursive: true });
            fs.mkdirSync(objsDir, { recursive: true });
            fs.mkdirSync(binsDir, { recursive: true });

            // Generate #pragma config statements from config editor
            const configBits = generateXC32Config(projectConfig, familyName).join('\n');
            
            // Use calculated system clock frequency from config editor
            const sysClockFreq = `${projectConfig.clock.systemFrequency}UL`;
            
            // Generate PBCLK startup code for PIC32MZ
            const pbclkStartup = deviceName.startsWith('32MZ') 
                ? generatePBCLKStartup(projectConfig) 
                : '';
        
        // Generate main.c template with device-specific configuration
        const mainTemplate = `/**
 * ${projectName}
 * XC32 Project
 * Device: ${deviceName}
 * Generated: ${new Date().toLocaleDateString()}
 */

#include <xc.h>
#include <sys/attribs.h>

${configBits}

#define SYS_CLK_FREQ ${sysClockFreq}   // System clock frequency (Hz) - ${projectConfig.clock.systemFrequency / 1000000}MHz
${pbclkStartup}
void delay_ms(uint32_t ms) {
    uint32_t ticks = (SYS_CLK_FREQ / 2000) * ms;
    _CP0_SET_COUNT(0);
    while (_CP0_GET_COUNT() < ticks);
}

int main(void) {
${deviceName.startsWith('32MZ') ? '    // Configure peripheral bus clocks (PIC32MZ)\n    configure_peripheral_clocks();\n    \n' : ''}    // Initialize LED (example: RB9)
    ANSELB &= ~(1 << 9);   // Digital mode
    TRISB &= ~(1 << 9);    // Output
    LATB = 0;              // Initial state

    while (1) {
        LATBINV = (1 << 9);  // Toggle LED
        delay_ms(500);
    }

    return 0;
}
`;

        fs.writeFileSync(path.join(srcsDir, 'main.c'), mainTemplate, 'utf-8');

        // Save config.json to project root for future editing
        fs.writeFileSync(
            path.join(outputPath, 'config.json'),
            JSON.stringify(projectConfig, null, 4),
            'utf-8'
        );

        // Generate startup.S if using MikroC bootloader
        if (useMikroBootloader) {
            const startupDir = path.join(srcsDir, 'startup');
            fs.mkdirSync(startupDir, { recursive: true });
            
            // Copy startup.S template
            const templatePath = path.join(__dirname, 'templates', 'xc32', 'startup.S');
            const startupContent = fs.readFileSync(templatePath, 'utf-8');
            fs.writeFileSync(path.join(startupDir, 'startup.S'), startupContent, 'utf-8');
        }

        // Generate Makefiles using MakefileGenerator (same as MPLABX importer)
        const projectInfo: ProjectInfo = {
            projectType: 'mplabx',
            projectName: projectName,
            deviceName: deviceName,
            compilerBinDir: finalXC32Path ? path.join(finalXC32Path, 'bin').replace(/\\/g, '/') : undefined,
            dfpPath: finalDfpPath || undefined,
            compiler: 'XC32',
            sourceFiles: [],
            headerFiles: [],
            includePaths: [],
            defines: new Map<string, string>(),
            heapSize: String(projectConfig.build?.heapSize ?? 4096),
            stackSize: String(projectConfig.build?.stackSize ?? 4096),
            usesCrt0: !useMikroBootloader,
            cflags: [],
            ldflags: useMikroBootloader ? ['-nostartfiles'] : []
        };

        const generator = new MakefileGenerator();
        const makePath = bundledTools.getMakePath() || 'make';
        const binPath = bundledTools.getBinPath();
        const shPath = path.join(binPath, 'sh.exe').replace(/\\/g, '/');
        
        await generator.generate({
            projectInfo,
            outputPath,
            optimizationLevel: `-O${projectConfig.build?.optLevel ?? '2'}`,
            makePath,
            binPath,
            shPath
        });

        // Generate .vscode/tasks.json
        const vscodeDir = path.join(outputPath, '.vscode');
        fs.mkdirSync(vscodeDir, { recursive: true });

        const tasksContent = {
            "version": "2.0.0",
            "tasks": [
                {
                    "label": "Build XC32 Project",
                    "type": "shell",
                    "command": "make",
                    "group": {
                        "kind": "build",
                        "isDefault": true
                    },
                    "problemMatcher": ["$gcc"]
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

        fs.writeFileSync(path.join(vscodeDir, 'tasks.json'), JSON.stringify(tasksContent, null, 4), 'utf-8');

        // Generate README
        const readmeContent = `# ${projectName}

Basic XC32 project created with PIC32-IDE-VSCode extension.

## Project Structure

\`\`\`
${projectName}/
├── srcs/
│   └── main.c       # Main application code
├── incs/            # Header files
├── objs/            # Object files (generated)
├── bins/            # Binary outputs (generated)
├── Makefile         # Build configuration
└── .vscode/
    └── tasks.json   # VS Code build tasks
\`\`\`

## Build Instructions

1. **Configure Device**: Edit \`Makefile\` and set \`DEVICE\` to your target PIC32 device
2. **Configure XC32 Path**: Verify \`XC32_PATH\` in \`Makefile\` matches your installation
3. **Configure DFP Path**: ${finalDfpPath ? 'DFP auto-detected and configured' : 'REQUIRED - Set \\`DFP_PATH\\` in Makefile (see below)'}
4. **Build**: Press \`Ctrl+Shift+B\` or run \`make\`
5. **Flash**: Run \`make flash\` (configure flash tool first)

${!finalDfpPath ? `### Installing Device Family Pack (DFP)

XC32 v4.0+ requires a Device Family Pack for ${deviceName}.

**Installation Steps:**
1. Visit: https://www.microchip.com/packs
2. Search for your device family pack
3. Download the .atpack file
4. Create directory: \`C:\\\\Program Files\\\\Microchip\\\\MPLABX\\\\v6.25\\\\packs\\\\Microchip\\\\<DFP_NAME>\\\\<version>\`
5. Extract .atpack contents to that directory
6. Update \`DFP_PATH\` variable in Makefile with the full path

**Note:** If you have a different MPLABX version, adjust v6.25 to match your installation.

` : ''}

## Next Steps

- Add more source files to \`srcs/\` directory
- Configure device-specific settings in \`main.c\`
- Add peripheral initialization code
- Configure bootloader or programmer for flashing

Generated: ${new Date().toLocaleString()}
`;

        fs.writeFileSync(path.join(outputPath, 'README.md'), readmeContent, 'utf-8');

        // Save project metadata so status bar buttons show correctly on next open
        const projMetadata: ProjectMetadata = {
            projectType: 'mplabx',
            sourceProject: outputPath,
            device: deviceName,
            imported: new Date().toISOString(),
            lastSync: new Date().toISOString(),
            usesBootloader: useMikroBootloader,
            toolchain: {
                compiler: 'XC32',
                compilerPath: finalXC32Path ? path.join(finalXC32Path, 'bin').replace(/\\/g, '/') : '',
                dfpPath: finalDfpPath || undefined,
            },
            folders: {
                mccGenerated: '',
                userCode: ['srcs'],
            },
        };
        saveMetadata(outputPath, projMetadata);

        } catch (error) {
            console.error('[ERROR] Project creation failed:', error);
            vscode.window.showErrorMessage(`Failed to create project: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    });

    // Show success and open project
    const dfpStatus = finalDfpPath ? '✓ DFP detected and configured' : '⚠️ DFP not found - see README.md for installation';
    const openAction = await vscode.window.showInformationMessage(
        `XC32 project "${projectName}" created successfully!\n\n${dfpStatus}\n\nNext: ${finalDfpPath ? 'Click Build button in status bar, press Ctrl+Shift+B, or type "make" in terminal' : 'Install DFP, then click Build button or press Ctrl+Shift+B'}`,
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
 * Convert MikroC library short name to device-aware .emcl filename
 */
function libraryShortNameToEmcl(shortName: string, deviceName: string): string {
    const isMZ = deviceName.toUpperCase().includes('MZ');
    const isEF = deviceName.toUpperCase().includes('EF');
    const map: Record<string, string> = {
        'Delays':      '__Lib_Delays.emcl',
        'CP0':         '__Lib_CP0.emcl',
        'System':      (isMZ && isEF) ? '__Lib_System_MZ_EF.emcl'    : '__Lib_System.emcl',
        'SoftReset':   '__Lib_SoftResetDma.emcl',
        'Math':        '__Lib_Math.emcl',
        'MathDouble':  (isMZ && isEF) ? '__Lib_MathDouble_MZ_EF.emcl' : '__Lib_MathDouble.emcl',
        'C_String':    '__Lib_CString.emcl',
        'C_Stdlib':    (isMZ && isEF) ? '__Lib_CStdlib_EF.emcl'      : '__Lib_CStdlib.emcl',
        'C_Type':      '__Lib_CType.emcl',
        'C_Math':      (isMZ && isEF) ? '__Lib_CMath_EF.emcl'        : '__Lib_CMath.emcl',
        'Sprintf':     (isMZ && isEF) ? '__Lib_Sprintf_EF.emcl'      : '__Lib_Sprintf.emcl',
        'Sprinti':     '__Lib_Sprinti.emcl',
        'Sprintl':     '__Lib_Sprintl.emcl',
        'Conversions': (isMZ && isEF) ? '__Lib_Conversions_EF.emcl'  : '__Lib_Conversions.emcl',
        'MemManager':  '__Lib_MemManager.emcl',
        'UART':        isMZ ? '__Lib_UART_123456_MZ.emcl' : '__Lib_UART.emcl',
        'SPI':         '__Lib_SPI.emcl',
        'I2C':         '__Lib_I2C.emcl',
        'USB':         '__Lib_USB.emcl',
        'FLASH':       '__Lib_FLASH.emcl',
        'CAN':         '__Lib_CAN.emcl',
    };
    return map[shortName] || `__Lib_${shortName}.emcl`;
}

/**
 * Generate MikroC .mcp32 project file content (INI format)
 * Compatible with MikroC PRO for PIC32 IDE — can be opened directly in the IDE.
 */
function generateMCP32Content(
    config: import('./configEditor').ProjectConfig,
    projectName: string,
    sourceFiles: string[],
    libraries: string[]     // short names e.g. ['Delays', 'USB']
): string {
    const mikroCDevice = 'P' + config.device;
    const clock        = Math.round(config.clock.systemFrequency);
    const heapSize     = config.build?.heapSize ?? 4096;
    const fileLines    = sourceFiles.map((f, i) => `File${i}=${f}`).join('\r\n');
    const libLines     = libraries.map((l, i) => `File${i}=${l}`).join('\r\n');
    return [
        '[DEVICE]',
        `Name=${mikroCDevice}`,
        `Clock=${clock}`,
        '[MEMORY_MODEL]',
        'Value=0',
        '[BUILD_TYPE]',
        'Value=0',
        '[USE_EEPROM]',
        'Value=0',
        '[EEPROM_DEFINITION]',
        'Value=',
        '[USE_HEAP]',
        'Value=1',
        '[HEAP_SIZE]',
        `Value=${heapSize}`,
        '[FILES]',
        ...(sourceFiles.length ? [fileLines] : []),
        `Count=${sourceFiles.length}`,
        '[BINARIES]',
        'Count=0',
        '[SEARCH_PATH]',
        'Count=0',
        '[HEADER_PATH]',
        'Count=0',
        '[HEADERS]',
        'Count=0',
        '[PLDS]',
        'Count=0',
        '[Useses]',
        ...(libraries.length ? [libLines] : []),
        `Count=${libraries.length}`,
        '[INTERRUPT_DEFS]',
        'EBASE=9FC01000',
        'VECTOR_SPACEING=32',
        'VECTOR_MODE=1',
        'USE_SRS=7',
    ].join('\r\n') + '\r\n';
}

/**
 * Generate MikroC Makefile content from ProjectConfig
 */
function generateMikroCMakefileContent(
    config: import('./configEditor').ProjectConfig,
    compilerInstallPath: string,
    projectName: string,
    sourceFiles: string[],   // relative file names e.g. ['main.c']
    emclLibs: string[],      // e.g. ['__Lib_Delays.emcl']
    _makePath: string,
    binPath: string,
    shPath: string,
    projectPath: string      // absolute path for search paths
): string {
    const mikroCDevice = 'P' + config.device;
    const clock        = Math.round(config.clock.systemFrequency);
    const clockMHz     = Math.floor(clock / 1_000_000);
    const heapSize     = config.build?.heapSize ?? 4096;

    const srcs       = sourceFiles.map(f => `\\"${f}\\"`).join(' ');
    const libs        = emclLibs.map(l => `\\"${l}\\"`).join(' ');
    const installEsc  = compilerInstallPath.replace(/\\/g, '\\\\');
    const projWin     = projectPath.replace(/\//g, '\\');
    const bundledBin  = binPath.replace(/\\/g, '/');

    const flags = [
        '-MSF', '-DBG',
        `-p${mikroCDevice}`,
        `-HEAP ${heapSize}`,
        '-Y', '-DL', '-SSA',
        '-EBASE 0x9FC01000',
        '-INTDEF MV_SRS7_IS32',
        '-O11111113',
        `-fo${clockMHz}`,
        `-N\\"${projectName}.mcp32\\"`,
        `-SP$(MIKROC_PATH)\\\\Defs\\\\"`,
        `-SP$(MIKROC_PATH)\\\\Uses\\\\"`,
        `-SP\\"${projWin}\\\\"`,
        `-IP$(MIKROC_PATH)\\\\Uses\\\\"`,
        `-IP\\"${projWin}\\"`,
    ].join(' ');

    return `# MikroC Project Makefile
# Generated by XC Project Importer
# Project: ${projectName}
# Device: ${mikroCDevice}
# Compiler: MikroC PRO for PIC32
SHELL = ${shPath}
export PATH := ${bundledBin}:$(PATH)

# MikroC compiler path (can be overridden: make MIKROC_PATH="your/path")
MIKROC_PATH ?= \\"${installEsc}
MIKROC := $(MIKROC_PATH)\\\\mikroCPIC32.exe\\"

# Project settings
PROJECT_NAME = ${projectName}
DEVICE       = ${mikroCDevice}
CLOCK        = ${clock}

# Source files (add more as needed — wrap each in escaped quotes)
SRCS = ${srcs}

# Library files
LIBS = ${libs}

# Compiler flags
FLAGS = ${flags}

all:
\t@echo Building $(PROJECT_NAME) for $(DEVICE)...
\t@powershell -Command "& $(MIKROC) $(FLAGS) $(SRCS) $(LIBS)"
\t@test -f $(PROJECT_NAME).hex && echo "Build complete! Output: $(PROJECT_NAME).hex" || (echo "Build FAILED - no hex file generated" && exit 1)

rebuild:
\t@echo Rebuilding all files for $(PROJECT_NAME)...
\t@powershell -Command "& $(MIKROC) $(FLAGS) -RA $(SRCS) $(LIBS)"
\t@test -f $(PROJECT_NAME).hex && echo "Build complete! Output: $(PROJECT_NAME).hex" || (echo "Build FAILED - no hex file generated" && exit 1)

clean:
\t@echo Cleaning build artifacts...
\t@rm -f *.emcl *.asm *.lst *.log *.mcl *.user.dic 2>nul || true
\t@echo Clean complete!

flash: all
\t@echo Flashing $(PROJECT_NAME).hex...

.PHONY: all rebuild clean flash
`;
}

/**
 * Create new MikroC Project — calls config editor, generates .mcp32, Makefile and metadata
 */
async function createMikroCProject(context: vscode.ExtensionContext) {
    // Step 1: Project name
    const projectName = await vscode.window.showInputBox({
        prompt: 'Enter project name',
        placeHolder: 'MyMikroCProject',
        validateInput: (value) => {
            if (!value || value.trim().length === 0) {
                return 'Project name cannot be empty';
            }
            if (!/^[a-zA-Z0-9_\-\s]+$/.test(value)) {
                return 'Only letters, numbers, spaces, underscores and hyphens allowed';
            }
            return null;
        }
    });
    if (!projectName) { return; }

    // Step 2: Device picker
    const allDevices = Object.values(SUPPORTED_DEVICES).flat();
    const deviceChoice = await vscode.window.showQuickPick(allDevices, {
        placeHolder: 'Select target PIC32 device',
        title: 'Choose Device',
        matchOnDescription: true
    });
    if (!deviceChoice) { return; }

    const deviceName = deviceChoice.label;   // e.g. '32MZ2048EFH064'
    const familyName = detectDeviceFamily(deviceName) || 'PIC32MZ-EF';

    // Step 3: Config editor (MikroC-aware — shows library selector, hides pragma config)
    const configProvider = new ConfigEditorProvider(
        context.extensionUri,
        { deviceName, deviceFamily: familyName, compiler: 'MikroC' }
    );
    const config = await configProvider.showModal();
    if (!config) { return; }  // user cancelled

    // Step 4: Output folder
    const outputFolders = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: 'Select Location for New Project',
        title: 'Where should the project be created?'
    });
    if (!outputFolders || outputFolders.length === 0) { return; }

    const outputPath = path.join(outputFolders[0].fsPath, projectName);

    if (fs.existsSync(outputPath)) {
        const overwrite = await vscode.window.showWarningMessage(
            `Folder "${projectName}" already exists. Overwrite?`, 'Yes', 'No'
        );
        if (overwrite !== 'Yes') { return; }
    }

    // Step 5: Detect MikroC compiler
    const importer = new MikroCImporter();
    let compilerPaths = await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Detecting MikroC PRO for PIC32...',
        cancellable: false
    }, async () => importer.detectCompilerPath('PIC32'));

    if (!compilerPaths) {
        const choice = await vscode.window.showWarningMessage(
            'MikroC PRO for PIC32 not found in standard locations.',
            'Specify Path', 'Use Template Paths', 'Cancel'
        );
        if (choice === 'Specify Path') {
            const picked = await vscode.window.showOpenDialog({
                canSelectFiles: false, canSelectFolders: true, canSelectMany: false,
                openLabel: 'Select MikroC PRO for PIC32 Installation Folder'
            });
            if (picked && picked.length > 0) {
                compilerPaths = await importer.validateCompilerPath(picked[0].fsPath, 'PIC32');
            }
        } else if (choice === 'Use Template Paths') {
            const tmpl = 'C:\\Users\\Public\\Documents\\Mikroelektronika\\mikroC PRO for PIC32';
            compilerPaths = {
                compilerExe: `${tmpl}\\mikroCPIC32.exe`,
                installPath: tmpl,
                defsPath: `${tmpl}\\Defs`,
                usesPath: `${tmpl}\\Uses`
            };
        } else {
            return;
        }
    }
    if (!compilerPaths) { return; }

    // Step 6: Generate all project files
    const libraries    = config.libraries ?? ['Delays'];
    const emclLibs     = libraries.map(l => libraryShortNameToEmcl(l, deviceName));
    const isPIC32MZ    = deviceName.startsWith('32MZ');
    const mikroCDevice = 'P' + deviceName;
    const sysclkMHz    = Math.round(config.clock.systemFrequency / 1_000_000);

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Creating MikroC project "${projectName}"...`,
        cancellable: false
    }, async () => {
        fs.mkdirSync(outputPath, { recursive: true });

        // main.c — MikroC syntax (.Fn bit notation, no #pragma config)
        const pbclkCode = isPIC32MZ ? generatePBCLKStartup(config) : '';
        const mainC = `/**
 * ${projectName}
 * MikroC PRO for PIC32
 * Device: ${mikroCDevice}
 * SYSCLK: ${sysclkMHz} MHz
 * Generated: ${new Date().toLocaleDateString()}
 *
 * Configuration bits are stored in ${projectName}.mcp32
 * To edit: Command Palette → "XC Project Importer: Edit Project Configuration"
 */
${pbclkCode}
void main() {
${isPIC32MZ ? '    configure_peripheral_clocks();   // Set up peripheral bus clocks\n' : ''}
    // Example: RB9 LED  (MikroC .Fn bit-field notation)
    ANSELB.F9 = 0;   // Digital mode
    TRISB.F9  = 0;   // Output
    LATB.F9   = 0;   // Initial low

    while (1) {
        LATB.F9 = ~LATB.F9;   // Toggle
        Delay_ms(500);
    }
}
`;
        fs.writeFileSync(path.join(outputPath, 'main.c'), mainC, 'utf-8');

        // .mcp32 project file (INI format — MikroC IDE compatible)
        const mcp32 = generateMCP32Content(config, projectName, ['main.c'], libraries);
        fs.writeFileSync(path.join(outputPath, `${projectName}.mcp32`), mcp32, 'utf-8');

        // Makefile
        const makePath  = bundledTools.getMakePath() || 'make';
        const binPath   = bundledTools.getBinPath();
        const shPath    = path.join(binPath, 'sh.exe').replace(/\\/g, '/');
        const makefile  = generateMikroCMakefileContent(
            config, compilerPaths!.installPath, projectName,
            ['main.c'], emclLibs, makePath, binPath, shPath, outputPath
        );
        fs.writeFileSync(path.join(outputPath, 'Makefile'), makefile, 'utf-8');

        // .vscode/tasks.json
        const vscodeDir  = path.join(outputPath, '.vscode');
        fs.mkdirSync(vscodeDir, { recursive: true });
        const makeBinDir = binPath.replace(/\\/g, '/');
        const bundledMake = bundledTools.getMakePath() || 'make';
        const tasks = {
            version: '2.0.0',
            tasks: [
                {
                    label: 'Build MikroC Project',
                    type: 'shell',
                    command: bundledMake,
                    args: [],
                    options: { env: { PATH: `${makeBinDir};${process.env.PATH ?? ''}` } },
                    group: { kind: 'build', isDefault: true },
                    problemMatcher: []
                },
                {
                    label: 'Rebuild MikroC Project',
                    type: 'shell',
                    command: bundledMake,
                    args: ['rebuild'],
                    options: { env: { PATH: `${makeBinDir};${process.env.PATH ?? ''}` } },
                    problemMatcher: []
                },
                {
                    label: 'Clean Build Artifacts',
                    type: 'shell',
                    command: bundledMake,
                    args: ['clean'],
                    options: { env: { PATH: `${makeBinDir};${process.env.PATH ?? ''}` } },
                    problemMatcher: []
                }
            ]
        };
        fs.writeFileSync(path.join(vscodeDir, 'tasks.json'), JSON.stringify(tasks, null, 4), 'utf-8');

        // config.json (same format as XC32 — used by editProjectConfig)
        fs.writeFileSync(path.join(outputPath, 'config.json'), JSON.stringify(config, null, 4), 'utf-8');

        // .vscode/pic32-project.json metadata
        const metadata: ProjectMetadata = {
            projectType: 'mikroc',
            sourceProject: outputPath,
            device: deviceName,              // WITHOUT 'P' prefix so detectDeviceFamily() works
            imported: new Date().toISOString(),
            lastSync: new Date().toISOString(),
            usesBootloader: true,
            toolchain: {
                compiler: 'MikroC',
                compilerPath: compilerPaths!.installPath,
                dfpPath: ''
            },
            folders: { mccGenerated: '', userCode: ['.'] }
        };
        saveMetadata(outputPath, metadata);
    });

    updateStatusBarForWorkspace();

    const openAction = await vscode.window.showInformationMessage(
        `MikroC project "${projectName}" created!\n\nDevice: ${mikroCDevice}  |  SYSCLK: ${sysclkMHz} MHz\nLocation: ${outputPath}`,
        { modal: true },
        'Add to Workspace',
        'Open in New Window',
        'Open Project'
    );

    if (openAction === 'Add to Workspace') {
        const n = vscode.workspace.workspaceFolders?.length ?? 0;
        vscode.workspace.updateWorkspaceFolders(n, 0, { uri: vscode.Uri.file(outputPath) });
    } else if (openAction === 'Open in New Window') {
        await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(outputPath), true);
    } else if (openAction === 'Open Project') {
        await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(outputPath), false);
    }
}

/**
 * Import MikroC Project (copy source to new output folder, generate Makefile)
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
            vscode.window.showErrorMessage('MikroC project parsing failed — no .mcp* file found or file could not be read.');
            return;
        }
        
        console.log('MikroC import: Project parsed successfully:', projectInfo.projectName, projectInfo.deviceName);
        
        // Detect compiler (no intermediate toast — just run silently)
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

        // Ask where to create the VS Code project (same pattern as MPLABX importer)
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

        // Create destination folder
        if (!fs.existsSync(outputPath)) {
            fs.mkdirSync(outputPath, { recursive: true });
        }

        // Copy entire source project to the new output folder
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Copying project files to ${outputPath}...`,
            cancellable: false
        }, async () => {
            fs.cpSync(projectPath, outputPath, { recursive: true });
        });

        // Remap projectInfo so all paths point into the new output folder
        const oldProjectPath = projectInfo.projectPath;
        projectInfo.projectPath = outputPath;
        projectInfo.sourceFiles = projectInfo.sourceFiles.map(f =>
            path.join(outputPath, path.relative(oldProjectPath, f))
        );
        projectInfo.headerFiles = projectInfo.headerFiles.map(f =>
            path.join(outputPath, path.relative(oldProjectPath, f))
        );

        console.log(`MikroC import: Project files copied to: ${outputPath}`);

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
        const vscodeDir = path.join(outputPath, '.vscode');
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
        
        // Ask how to open the project — modal so it cannot be missed
        const openAction = await vscode.window.showInformationMessage(
            `MikroC project "${projectInfo.projectName}" imported successfully!\n\nDevice: ${projectInfo.deviceName}\nProject created at: ${outputPath}\n\nHow would you like to open it?`,
            { modal: true },
            'Add to Workspace',
            'Open in New Window',
            'Open Project'
        );

        if (openAction === 'Add to Workspace') {
            const currentFolders = vscode.workspace.workspaceFolders?.length ?? 0;
            vscode.workspace.updateWorkspaceFolders(currentFolders, 0, { uri: vscode.Uri.file(outputPath) });
        } else if (openAction === 'Open in New Window') {
            await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(outputPath), true);
        } else if (openAction === 'Open Project') {
            await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(outputPath), false);
        }
        
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to import MikroC project: ${error}`);
        console.error('MikroC import error:', error);
    }
}

/**
 * Build current project (runs the default build task)
 */
async function buildProject() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
    }

    // Execute the default build task
    await vscode.commands.executeCommand('workbench.action.tasks.build');
}

/**
 * Rebuild current project (clean + build)
 */
async function rebuildProject() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
    }

    // Check if Makefile has a 'rebuild' target
    const makefilePath = path.join(workspaceFolder.uri.fsPath, 'Makefile');
    let hasRebuildTarget = false;
    
    if (fs.existsSync(makefilePath)) {
        const makefileContent = fs.readFileSync(makefilePath, 'utf-8');
        hasRebuildTarget = /^rebuild:/m.test(makefileContent);
    }

    // Get bundled make path
    const makePath = bundledTools.getMakePath() || 'make';
    const binPath = bundledTools.getBinPath();
    const shPath = path.join(binPath, 'sh.exe').replace(/\\/g, '/');
    
    const terminal = vscode.window.createTerminal({
        name: 'PIC32 Rebuild',
        env: {
            'PATH': `${binPath};${process.env.PATH}`,
            'SHELL': shPath
        }
    });
    terminal.show();
    
    if (hasRebuildTarget) {
        terminal.sendText(`& "${makePath}" rebuild`);
    } else {
        // Fallback: run clean then build
        terminal.sendText(`& "${makePath}" clean ; & "${makePath}"`);
    }
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
    const terminal = vscode.window.createTerminal({
        name: 'PIC32 Flash',
        cwd: workspaceFolder.uri.fsPath
    });
    terminal.show();
    terminal.sendText(`& "${bootloaderPath}" "${hexFile.fsPath}"`);
}

/**
 * Open the Config Editor for an existing project.
 * Reads config.json + pic32-project.json, shows the modal, then saves back
 * and regenerates the Makefile with updated build settings.
 */
async function editProjectConfig(context: vscode.ExtensionContext) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder open. Open your XC32 or MikroC project folder first.');
        return;
    }

    const root = workspaceFolder.uri.fsPath;
    const metaPath  = path.join(root, '.vscode', 'pic32-project.json');
    const configPath = path.join(root, 'config.json');

    // Require project metadata — we need the device name and family
    if (!fs.existsSync(metaPath)) {
        vscode.window.showErrorMessage(
            'No pic32-project.json found. This command only works with projects created or imported by this extension.'
        );
        return;
    }

    let meta: ProjectMetadata;
    try {
        meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    } catch {
        vscode.window.showErrorMessage('Could not read .vscode/pic32-project.json — file may be corrupted.');
        return;
    }

    const deviceName = meta.device;
    const familyName = detectDeviceFamily(deviceName);
    if (!familyName) {
        vscode.window.showErrorMessage(`Unknown device family for "${deviceName}". Cannot open config editor.`);
        return;
    }

    // Load existing config.json if present (pre-populates the editor)
    let existingConfig: import('./configEditor').ProjectConfig | undefined;
    if (fs.existsSync(configPath)) {
        try {
            existingConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        } catch {
            vscode.window.showWarningMessage('config.json could not be parsed — opening editor with defaults.');
        }
    }

    // Open the config editor modal
    const configProvider = new ConfigEditorProvider(
        context.extensionUri,
        {
            deviceName,
            deviceFamily: familyName,
            compiler: (meta.toolchain?.compiler as 'XC32' | 'MikroC') || 'XC32',
            existingConfig
        }
    );

    const updatedConfig = await configProvider.showModal();
    if (!updatedConfig) {
        return; // User cancelled
    }

    // Write config.json
    fs.writeFileSync(configPath, JSON.stringify(updatedConfig, null, 4), 'utf-8');

    const compilerType = (meta.toolchain?.compiler as 'XC32' | 'MikroC') || 'XC32';
    const projectName  = path.basename(root);

    const clockChanged = !existingConfig ||
        existingConfig.pll?.multiplier !== updatedConfig.pll?.multiplier ||
        existingConfig.pll?.inputDiv   !== updatedConfig.pll?.inputDiv   ||
        existingConfig.pll?.outputDiv  !== updatedConfig.pll?.outputDiv  ||
        existingConfig.oscillator?.primary?.frequency !== updatedConfig.oscillator?.primary?.frequency;

    if (compilerType === 'MikroC') {
        // ── MikroC branch: regenerate Makefile + .mcp32 ──────────────────────────
        try {
            const compilerInstallPath = meta.toolchain?.compilerPath || '';
            const binPath  = bundledTools.getBinPath();
            const shPath   = path.join(binPath, 'sh.exe').replace(/\\/g, '/');
            const libraries = updatedConfig.libraries ?? ['Delays'];
            const emclLibs  = libraries.map(l => libraryShortNameToEmcl(l, deviceName));

            // Find existing .mcp32 to discover source file list
            const mcp32File = fs.readdirSync(root).find(f => f.toLowerCase().endsWith('.mcp32'));
            const sourceFiles: string[] = ['main.c'];    // safe fallback
            if (mcp32File) {
                try {
                    const ini = fs.readFileSync(path.join(root, mcp32File), 'utf-8');
                    const filesSection = ini.match(/\[FILES\]([\s\S]*?)(?=\[)/);
                    if (filesSection) {
                        const matches = [...filesSection[1].matchAll(/^File\d+=(.+)$/mg)];
                        if (matches.length) {
                            sourceFiles.length = 0;
                            matches.forEach(m => sourceFiles.push(m[1].trim()));
                        }
                    }
                } catch { /* keep fallback */ }
            }

            // Regenerate Makefile
            const makefile = generateMikroCMakefileContent(
                updatedConfig, compilerInstallPath, projectName,
                sourceFiles, emclLibs,
                bundledTools.getMakePath() || 'make', binPath, shPath, root
            );
            fs.writeFileSync(path.join(root, 'Makefile'), makefile, 'utf-8');

            // Regenerate .mcp32
            const mcp32Out = mcp32File
                ? path.join(root, mcp32File)
                : path.join(root, `${projectName}.mcp32`);
            fs.writeFileSync(mcp32Out, generateMCP32Content(updatedConfig, projectName, sourceFiles, libraries), 'utf-8');

            const msg = clockChanged
                ? 'Config saved, Makefile and .mcp32 updated. ⚠️ Clock/PLL changed — rebuild to apply.'
                : 'Config saved, Makefile and .mcp32 updated. Run Build to apply changes.';
            vscode.window.showInformationMessage(msg, 'Build Now').then(action => {
                if (action === 'Build Now') { vscode.commands.executeCommand('workbench.action.tasks.build'); }
            });
        } catch (err) {
            vscode.window.showErrorMessage(`Makefile regeneration failed: ${err instanceof Error ? err.message : String(err)}`);
        }

    } else {
        // ── XC32 branch: regenerate Makefile via MakefileGenerator ───────────────
        const compilerBinDir = meta.toolchain?.compilerPath || '';
        const dfpPath        = meta.toolchain?.dfpPath || '';

        const projectInfo: ProjectInfo = {
            projectType: 'mplabx',
            projectName,
            deviceName,
            compilerBinDir: compilerBinDir || undefined,
            dfpPath: dfpPath || undefined,
            compiler: 'XC32',
            sourceFiles: [],
            headerFiles: [],
            includePaths: [],
            defines: new Map<string, string>(),
            heapSize:  String(updatedConfig.build?.heapSize  ?? 4096),
            stackSize: String(updatedConfig.build?.stackSize ?? 4096),
            usesCrt0:  meta.usesBootloader !== true,
            cflags:  [],
            ldflags: meta.usesBootloader ? ['-nostartfiles'] : []
        };

        try {
            const generator = new MakefileGenerator();
            const makePath  = bundledTools.getMakePath() || 'make';
            const binPath   = bundledTools.getBinPath();
            const shPath    = path.join(binPath, 'sh.exe').replace(/\\/g, '/');

            await generator.generate({
                projectInfo,
                outputPath: root,
                optimizationLevel: `-O${updatedConfig.build?.optLevel ?? '2'}`,
                makePath, binPath, shPath
            });

            const msg = clockChanged
                ? 'Config saved and Makefile updated. ⚠️ Clock/PLL changed — update #pragma config in your source and rebuild.'
                : 'Config saved and Makefile updated. Run Build to apply changes.';
            vscode.window.showInformationMessage(msg, 'Build Now').then(action => {
                if (action === 'Build Now') { vscode.commands.executeCommand('workbench.action.tasks.build'); }
            });
        } catch (err) {
            vscode.window.showErrorMessage(`Makefile regeneration failed: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
}

/**
 * Detect ipecmd.exe from MPLAB X IDE installation (Windows)
 * Searches standard Microchip installation path and returns the latest version found.
 */
async function detectIpecmd(): Promise<string | null> {
    const mplabBase = 'C:\\Program Files\\Microchip\\MPLABX';
    if (!fs.existsSync(mplabBase)) {
        return null;
    }
    // Find all version folders (vX.XX), pick latest
    const versions = fs.readdirSync(mplabBase)
        .filter(d => /^v\d/.test(d))
        .sort()
        .reverse();
    for (const ver of versions) {
        const candidate = path.join(mplabBase, ver, 'mplab_platform', 'mplab_ipe', 'ipecmd.exe');
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }
    return null;
}

/**
 * Program PIC32 device via ICSP using MPLAB IPE (ipecmd.exe)
 * Supports PICkit 4/5, ICD 4/5, MPLAB SNAP
 */
async function programDevice() {
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
        const items = hexFiles.map(uri => ({
            label: path.basename(uri.fsPath),
            description: path.relative(workspaceFolder.uri.fsPath, uri.fsPath),
            uri
        }));
        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select .hex file to program'
        });
        if (!selected) { return; }
        hexFile = selected.uri;
    }

    // Detect ipecmd.exe
    let ipecmdPath = await detectIpecmd();
    if (!ipecmdPath) {
        const action = await vscode.window.showWarningMessage(
            'MPLAB IPE (ipecmd.exe) not found. Install MPLAB X IDE (free) from microchip.com/mplabx, or browse to ipecmd.exe manually.',
            'Browse...', 'Cancel'
        );
        if (action !== 'Browse...') { return; }
        const picked = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            filters: { 'Executable': ['exe'] },
            title: 'Locate ipecmd.exe'
        });
        if (!picked || picked.length === 0) { return; }
        ipecmdPath = picked[0].fsPath;
    }

    // Programmer tool selection
    const programmers = [
        { label: '$(plug) PICkit 4',  description: 'Microchip PICkit 4', flag: 'PK4' },
        { label: '$(plug) PICkit 5',  description: 'Microchip PICkit 5', flag: 'PK5' },
        { label: '$(plug) ICD 4',     description: 'Microchip MPLAB ICD 4', flag: 'ICD4' },
        { label: '$(plug) ICD 5',     description: 'Microchip MPLAB ICD 5', flag: 'ICD5' },
        { label: '$(plug) SNAP',      description: 'Microchip MPLAB SNAP', flag: 'SNAP' },
    ];
    const progChoice = await vscode.window.showQuickPick(programmers, {
        placeHolder: 'Select programming tool connected to your PC'
    });
    if (!progChoice) { return; }

    // Read device name from project metadata
    let deviceName = '';
    const metaPath = path.join(workspaceFolder.uri.fsPath, '.vscode', 'pic32-project.json');
    if (fs.existsSync(metaPath)) {
        try {
            const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
            deviceName = meta.device || '';
        } catch { /* ignore parse errors */ }
    }
    if (!deviceName) {
        const entered = await vscode.window.showInputBox({
            prompt: 'Enter device part number',
            placeHolder: '32MZ2048EFH064',
            value: '32MZ2048EFH064'
        });
        if (!entered) { return; }
        deviceName = entered.trim();
    }

    // Build and run ipecmd command via terminal
    // Flags: -TP<tool>  -P<device>  -F"<hex>"  -E (erase)  -M (program)
    const terminal = vscode.window.createTerminal({
        name: 'PIC32 Program (ICSP)',
        cwd: workspaceFolder.uri.fsPath
    });
    terminal.show();
    terminal.sendText(`& "${ipecmdPath}" -TP${progChoice.flag} -P${deviceName} -F"${hexFile.fsPath}" -E -M`);
}

export function deactivate() {}

