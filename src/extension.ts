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
import { loadDeviceDefinitions, getAllDevicesFlat, DeviceDefinition, detectDeviceFamily, getConfigBits } from './deviceLoader';

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
 * Add bundled tools to user's PATH environment variable (Windows only)
 * This allows users to just type "make" from any terminal
 */
async function addBundledToolsToPath(context: vscode.ExtensionContext): Promise<void> {
    // Only for Windows
    if (process.platform !== 'win32') {
        return;
    }

    const bundledBinPath = path.join(context.extensionPath, 'bin', 'win32');
    console.log(`[PATH] Checking if bundled tools need to be added to PATH: ${bundledBinPath}`);
    
    try {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        // Use PowerShell with proper escaping - encode script as Base64 to avoid quoting issues
        const checkScript = `
            $targetPath = '${bundledBinPath.replace(/\\/g, '\\\\')}';
            $userPath = [Environment]::GetEnvironmentVariable('Path', 'User');
            if ($null -eq $userPath) { Write-Output 'NOT_FOUND' }
            elseif ($userPath -like "*$targetPath*") { Write-Output 'EXISTS' }
            else { Write-Output 'NOT_FOUND' }
        `;
        
        const scriptBase64 = Buffer.from(checkScript, 'utf16le').toString('base64');
        
        const { stdout, stderr } = await execAsync(
            `powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand "${scriptBase64}"`,
            { timeout: 5000 }
        );
        
        if (stderr) {
            console.error('[PATH] PowerShell stderr:', stderr);
        }
        
        console.log(`[PATH] Check result: ${stdout.trim()}`);
        
        if (stdout.trim() === 'EXISTS') {
            console.log('[PATH] Bundled tools already in user PATH');
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
        vscode.commands.registerCommand('pic32-ide.build', () => buildProject()),
        vscode.commands.registerCommand('pic32-ide.rebuild', () => rebuildProject()),
        vscode.commands.registerCommand('pic32-ide.updateBootloader', () => bootloaderUpdater.forceCheckForUpdates()),
        vscode.commands.registerCommand('pic32-ide.addToPath', () => addBundledToolsToPath(context))
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
    flashStatusBarItem.tooltip = 'Flash .hex file to PIC32 device';
    flashStatusBarItem.show();

    context.subscriptions.push(buildStatusBarItem, rebuildStatusBarItem, flashStatusBarItem);
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
        `Project imported successfully!\nLocation: ${outputPath}\n\nReady to build with Ctrl+Shift+B or type "make" in terminal`,
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
        // Create directories
        const srcsDir = path.join(outputPath, 'srcs');
        const incsDir = path.join(outputPath, 'incs');
        const objsDir = path.join(outputPath, 'objs');
        const binsDir = path.join(outputPath, 'bins');
        
        fs.mkdirSync(srcsDir, { recursive: true });
        fs.mkdirSync(incsDir, { recursive: true });
        fs.mkdirSync(objsDir, { recursive: true });
        fs.mkdirSync(binsDir, { recursive: true });

        // Get device family and configuration bits from JSON
        const familyName = detectDeviceFamily(deviceName);
        if (!familyName) {
            vscode.window.showErrorMessage(`Unknown device family for ${deviceName}`);
            return;
        }
        
        // Load configuration bits from JSON (device-specific variant)
        const configBitsArray = getConfigBits(familyName, deviceName);
        const configBits = configBitsArray.join('\n');
        
        // Determine system clock frequency based on family
        const isMZ = deviceName.startsWith('32MZ');
        const sysClockFreq = isMZ ? '200000000UL' : '80000000UL';
        
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

#define SYS_CLK_FREQ ${sysClockFreq}   // System clock frequency (Hz)

void delay_ms(uint32_t ms) {
    uint32_t ticks = (SYS_CLK_FREQ / 2000) * ms;
    _CP0_SET_COUNT(0);
    while (_CP0_GET_COUNT() < ticks);
}

int main(void) {
    // Initialize LED (example: RB9)
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

        // Generate startup.S if using MikroC bootloader
        if (useMikroBootloader) {
            const startupDir = path.join(srcsDir, 'startup');
            fs.mkdirSync(startupDir, { recursive: true });
            
            // Copy startup.S template
            const templatePath = path.join(__dirname, 'templates', 'xc32', 'startup.S');
            const startupContent = fs.readFileSync(templatePath, 'utf-8');
            fs.writeFileSync(path.join(startupDir, 'startup.S'), startupContent, 'utf-8');
        }

        // Generate basic Makefile (Windows)
        // TODO: Adjust for Linux when porting (.exe extensions, paths, etc.)
        const detectedXC32 = finalXC32Path || 'C:/Program Files/Microchip/xc32/vX.XX';
        const detectedDFP = finalDfpPath || '';
        
        const makefileTemplate = `# ${projectName} - XC32 Makefile
# Device: ${deviceName}
# Platform: Windows
# Generated: ${new Date().toLocaleDateString()}

# Project settings
PROJECT_NAME = ${projectName}
DEVICE = ${deviceName}

# Toolchain paths${finalXC32Path ? ' (auto-detected)' : ' (TEMPLATE - UPDATE THIS PATH)'}
XC32_PATH = ${detectedXC32}
COMPILER_BIN = $(XC32_PATH)/bin
CC = "$(COMPILER_BIN)/xc32-gcc.exe"
LD = "$(COMPILER_BIN)/xc32-gcc.exe"
OBJCOPY = "$(COMPILER_BIN)/xc32-bin2hex.exe"

# Device Family Pack (DFP) path${finalDfpPath ? ' (auto-detected)' : ' (REQUIRED - See README.md for installation)'}
# XC32 v4.0+ requires DFP for device support
# Download from: https://www.microchip.com/packs
# Standard location: C:/Program Files/Microchip/MPLABX/v6.25/packs/Microchip/<DFP_NAME>/<version>
DFP_PATH = ${detectedDFP}

# Directories
SRC_DIR = srcs
OBJ_DIR = objs
BIN_DIR = bins

# Source files
SRCS = $(wildcard $(SRC_DIR)/*.c)${useMikroBootloader ? ' $(wildcard $(SRC_DIR)/startup/*.S)' : ''}
OBJS = $(patsubst $(SRC_DIR)/%.c,$(OBJ_DIR)/%.o,$(SRCS))${useMikroBootloader ? '\nOBJS += $(patsubst $(SRC_DIR)/startup/%.S,$(OBJ_DIR)/%.o,$(wildcard $(SRC_DIR)/startup/*.S))' : ''}

# Compiler flags
CFLAGS = -mprocessor=$(DEVICE)${finalDfpPath ? ' -mdfp="$(DFP_PATH)"' : ''} -O2 -Wall
LDFLAGS = -mprocessor=$(DEVICE)${finalDfpPath ? ' -mdfp="$(DFP_PATH)"' : ''}${useMikroBootloader ? ' -nostartfiles' : ''} -Wl,--defsym=_min_heap_size=0x1000

# Output files
ELF = $(BIN_DIR)/$(PROJECT_NAME).elf
HEX = $(BIN_DIR)/$(PROJECT_NAME).hex

.PHONY: all clean flash

all: $(HEX)

$(HEX): $(ELF)
\t@echo Creating hex file...
\t$(OBJCOPY) $(ELF)

$(ELF): $(OBJS)
\t@echo Linking...
\t@mkdir -p $(BIN_DIR)
\t$(LD) $(LDFLAGS) -o $@ $^

$(OBJ_DIR)/%.o: $(SRC_DIR)/%.c
\t@mkdir -p $(OBJ_DIR)
\t@echo Compiling $<...
\t$(CC) $(CFLAGS) -c $< -o $@
${useMikroBootloader ? '\n$(OBJ_DIR)/%.o: $(SRC_DIR)/startup/%.S\n\t@mkdir -p $(OBJ_DIR)\n\t@echo Assembling $<...\n\t$(CC) $(CFLAGS) -c $< -o $@\n' : ''}
clean:
\t@echo Cleaning...
\t@rm -rf $(OBJ_DIR)/* $(BIN_DIR)/*

flash: $(HEX)
\t@echo Flashing $(HEX)...
\t@echo TODO: Add flash command
`;

        fs.writeFileSync(path.join(outputPath, 'Makefile'), makefileTemplate, 'utf-8');

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
    });

    // Show success and open project
    const dfpStatus = finalDfpPath ? '✓ DFP detected and configured' : '⚠️ DFP not found - see README.md for installation';
    const openAction = await vscode.window.showInformationMessage(
        `XC32 project "${projectName}" created successfully!\n\n${dfpStatus}\n\nNext: ${finalDfpPath ? 'Build with Ctrl+Shift+B or type "make" in terminal' : 'Install DFP, then build with Ctrl+Shift+B'}`,
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
 * Create new MikroC Project with basic template
 */
async function createMikroCProject(context: vscode.ExtensionContext) {
    // Get project name
    const projectName = await vscode.window.showInputBox({
        prompt: 'Enter project name',
        placeHolder: 'MyMikroCProject',
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

    // MikroC uses P prefix (P32MZ... instead of 32MZ...)
    const mikroCDevice = 'P' + deviceChoice.label;

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
        title: `Creating MikroC project "${projectName}"...`,
        cancellable: false
    }, async () => {
        // Create flat directory structure (MikroC style)
        fs.mkdirSync(outputPath, { recursive: true });

        // Generate main.c template
        const mainTemplate = `/**
 * ${projectName}
 * MikroC Project
 * Device: ${mikroCDevice}
 * Generated: ${new Date().toLocaleDateString()}
 */

void main() {
    // Configure LED pin (example: RB9)
    ANSELB &= ~(1 << 9);   // Digital mode
    TRISB &= ~(1 << 9);    // Output
    LATB = 0;              // Initial state

    while (1) {
        LATBINV = (1 << 9);  // Toggle LED
        Delay_ms(500);       // MikroC built-in delay
    }
}
`;

        fs.writeFileSync(path.join(outputPath, 'main.c'), mainTemplate, 'utf-8');

        // Generate basic Makefile template (user must configure compiler paths)
        const makefileTemplate = `# ${projectName} - MikroC Makefile
# Device: ${mikroCDevice}
# Generated: ${new Date().toLocaleDateString()}
# NOTE: Configure MIKROC_PATH for your MikroC installation

PROJECT_NAME = ${projectName}

# MikroC compiler path (UPDATE THIS PATH)
MIKROC_PATH ?= \"C:\\Users\\Public\\Documents\\Mikroelektronika\\mikroC PRO for PIC32
MIKROC := $(MIKROC_PATH)\\mikroCPIC32.exe\"

# Device (UPDATE FOR YOUR TARGET)
DEVICE = ${mikroCDevice}

# Source files (add more as needed)
SRCS = \"main.c\"

# Common libraries (auto-detected, add custom libraries manually)
LIBS = \"__Lib_Delays.emcl\" \"__Lib_Math.emcl\"

# Compiler flags
FLAGS = -MSF -DBG -p$(DEVICE)

# Build target
.PHONY: all clean flash

all:
	@echo Building $(PROJECT_NAME)...
	@powershell -Command "& $(MIKROC) $(FLAGS) $(SRCS) $(LIBS)"
	@if exist $(PROJECT_NAME).hex (echo Build complete! Hex file: $(PROJECT_NAME).hex) else (echo Build failed! && exit 1)

clean:
	@echo Cleaning build artifacts...
	@if exist *.asm del /Q *.asm
	@if exist *.lst del /Q *.lst
	@if exist *.mcl del /Q *.mcl
	@if exist *.hex del /Q *.hex
	@echo Clean complete.

flash: all
	@echo Flashing $(PROJECT_NAME).hex...
	@echo TODO: Configure mikro_hb.exe path
`;

        fs.writeFileSync(path.join(outputPath, 'Makefile'), makefileTemplate, 'utf-8');

        // Generate .vscode/tasks.json
        const vscodeDir = path.join(outputPath, '.vscode');
        fs.mkdirSync(vscodeDir, { recursive: true });

        const tasksContent = {
            "version": "2.0.0",
            "tasks": [
                {
                    "label": "Build MikroC Project",
                    "type": "shell",
                    "command": "make",
                    "group": {
                        "kind": "build",
                        "isDefault": true
                    },
                    "problemMatcher": []
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

Basic MikroC project created with PIC32-IDE-VSCode extension.

## Project Structure

MikroC uses a flat folder structure:

\`\`\`
${projectName}/
├── main.c           # Main application code
├── Makefile         # Build configuration
└── .vscode/
    └── tasks.json   # VS Code build tasks
\`\`\`

## Build Instructions

1. **Configure MikroC Path**: Edit \`Makefile\` and set \`MIKROC_PATH\` to your installation
2. **Configure Device**: Set \`DEVICE\` in \`Makefile\` to your target PIC32 device
3. **Build**: Press \`Ctrl+Shift+B\` or run \`make\`
4. **Flash**: Configure bootloader path and run \`make flash\`

## Adding Files

- Place all source files (\`.c\`) in the project root directory
- Update \`SRCS\` variable in \`Makefile\` to include new files
- Add required MikroC libraries to \`LIBS\` variable

## Notes

- MikroC uses a flat project structure (no subdirectories)
- Built-in functions like \`Delay_ms()\` require \`__Lib_Delays.emcl\`
- For advanced configuration, open \`.mcp32\` file in MikroC IDE

Generated: ${new Date().toLocaleString()}
`;

        fs.writeFileSync(path.join(outputPath, 'README.md'), readmeContent, 'utf-8');
    });

    // Show success and open project
    const openAction = await vscode.window.showInformationMessage(
        `MikroC project "${projectName}" created successfully!\n\nNext: Configure MIKROC_PATH and DEVICE in Makefile, then build with Ctrl+Shift+B`,
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

    const terminal = vscode.window.createTerminal('PIC32 Rebuild');
    terminal.show();
    
    if (hasRebuildTarget) {
        terminal.sendText('make rebuild');
    } else {
        // Fallback: run clean then build
        terminal.sendText('make clean && make');
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
    const terminal = vscode.window.createTerminal('PIC32 Flash');
    terminal.show();
    terminal.sendText(`& "${bootloaderPath}" "${hexFile.fsPath}"`);
}

export function deactivate() {}

