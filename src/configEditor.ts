/**
 * PIC32 Configuration Editor
 * 
 * Webview-based config editor matching MikroC's Edit Project dialog
 * Supports .cfgsch import/export and live register preview
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { PIC32Device } from './devices/pic32mz/efhDevices';
import { EFH_UI_SCHEMA, ConfigSetting } from './devices/pic32mz/efhUiSchema';
import { calculateRegisters, formatRegisterValue } from './devices/pic32mz/efhRegisterMap';

export interface ConfigResult {
    config: Map<number, string>;
    heapSize: number;
    xc32Version?: string;
    dfpVersion?: string;
    useMikroeBootloader?: boolean;
}

export class ConfigEditor {
    private panel: vscode.WebviewPanel | undefined;
    private device: PIC32Device;
    private currentConfig: Map<number, string>;
    private heapSize: number = 4096;
    private onConfigComplete: ((result: ConfigResult) => void) | undefined;

    constructor(
        private context: vscode.ExtensionContext,
        device: PIC32Device
    ) {
        this.device = device;
        this.currentConfig = new Map();
        this.initializeDefaults();
    }

    /**
     * Initialize config with default values
     */
    private initializeDefaults() {
        EFH_UI_SCHEMA.forEach(setting => {
            this.currentConfig.set(setting.index, setting.defaultValue);
        });
    }

    /**
     * Show the config editor
     */
    public async show(): Promise<ConfigResult> {
        return new Promise((resolve, reject) => {
            this.onConfigComplete = resolve;

            this.panel = vscode.window.createWebviewPanel(
                'pic32ConfigEditor',
                `Configure ${this.device.name}`,
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: [
                        vscode.Uri.file(path.join(this.context.extensionPath, 'src', 'webview'))
                    ]
                }
            );

            this.panel.webview.html = this.getWebviewContent();

            // Handle messages from webview
            this.panel.webview.onDidReceiveMessage(
                async message => {
                    switch (message.type) {
                        case 'ready':
                            this.sendInitialData();
                            break;
                        case 'calculateRegisters':
                            this.updateConfig(message.config);
                            this.calculateAndSendRegisters();
                            break;
                        case 'ok':
                            this.updateConfig(message.config);
                            this.heapSize = message.heapSize || 4096;
                            if (this.onConfigComplete) {
                                this.onConfigComplete({
                                    config: this.currentConfig,
                                    heapSize: this.heapSize,
                                    xc32Version: message.xc32Version,
                                    dfpVersion: message.dfpVersion,
                                    useMikroeBootloader: message.useMikroeBootloader || false
                                });
                            }
                            this.panel?.dispose();
                            break;
                        case 'cancel':
                            this.panel?.dispose();
                            reject(new Error('User cancelled'));
                            break;
                        case 'saveScheme':
                            this.updateConfig(message.config);
                            await this.saveScheme();
                            break;
                        case 'loadScheme':
                            await this.loadScheme();
                            break;
                        case 'loadDefaults':
                            this.initializeDefaults();
                            this.sendInitialData();
                            break;
                        case 'getXC32Versions':
                            await this.sendXC32Versions();
                            break;
                        case 'getDFPVersions':
                            await this.sendDFPVersions(message.deviceFamily);
                            break;
                    }
                },
                undefined,
                this.context.subscriptions
            );

            this.panel.onDidDispose(() => {
                this.panel = undefined;
            });
        });
    }

    /**
     * Send initial data to webview
     */
    private sendInitialData() {
        if (!this.panel) {return;}

        // Convert Map to object for JSON serialization
        const configObj: { [key: number]: string } = {};
        this.currentConfig.forEach((value, key) => {
            configObj[key] = value;
        });

        this.panel.webview.postMessage({
            type: 'init',
            deviceInfo: this.device,
            uiSchema: EFH_UI_SCHEMA,
            config: configObj
        });

        // Send initial register values
        this.calculateAndSendRegisters();
    }

    /**
     * Update config from webview message
     */
    private updateConfig(configObj: { [key: number]: string }) {
        Object.entries(configObj).forEach(([key, value]) => {
            this.currentConfig.set(parseInt(key), value);
        });
    }

    /**
     * Calculate register values and send to webview
     */
    private calculateAndSendRegisters() {
        if (!this.panel) {return;}

        // Calculate actual register values from current configuration
        const registerValues = calculateRegisters(this.currentConfig);

        const registers = {
            DEVCFG3: {
                address: '$1FC0FFC0',
                value: formatRegisterValue(registerValues.DEVCFG3)
            },
            DEVCFG2: {
                address: '$1FC0FFC4',
                value: formatRegisterValue(registerValues.DEVCFG2)
            },
            DEVCFG1: {
                address: '$1FC0FFC8',
                value: formatRegisterValue(registerValues.DEVCFG1)
            },
            DEVCFG0: {
                address: '$1FC0FFCC',
                value: formatRegisterValue(registerValues.DEVCFG0)
            },
            calculatedClock: this.calculateSystemClock()
        };

        this.panel.webview.postMessage({
            type: 'updateRegisters',
            registers: registers
        });
    }

    /**
     * Calculate system clock from PLL settings
     */
    private calculateSystemClock(): number {
        // Get PLL-related settings
        const pllInputDiv = this.currentConfig.get(6) || "3x Divider";
        const pllMult = this.currentConfig.get(9) || "PLL Multiply by 50";
        const pllOutputDiv = this.currentConfig.get(10) || "2x Divider";
        const oscSelection = this.currentConfig.get(12) || "Primary Osc w/PLL (XT+PLL, HS+PLL)";
        const primaryOsc = this.currentConfig.get(13) || "HS osc mode";

        // Determine input frequency based on oscillator selection
        let inputFreq = 24.0; // Default: 24 MHz crystal
        
        // Check if we're using FRC (8 MHz internal)
        if (oscSelection.includes("FRC") || oscSelection.includes("Fast RC")) {
            inputFreq = 8.0;
        }
        // For primary oscillator, assume 24 MHz crystal (most common for PIC32MZ)
        // User can configure actual crystal frequency in their design
        
        // Extract numeric values from PLL settings
        const inputDivMatch = pllInputDiv.match(/(\d+)x/);
        const multMatch = pllMult.match(/by (\d+)/);
        const outputDivMatch = pllOutputDiv.match(/(\d+)x/);

        if (!inputDivMatch || !multMatch || !outputDivMatch) {
            return 200.0; // Default
        }

        const inputDiv = parseInt(inputDivMatch[1]);
        const mult = parseInt(multMatch[1]);
        const outputDiv = parseInt(outputDivMatch[1]);

        // Clock = (Input / InputDiv) * Mult / OutputDiv
        // Example: (24 MHz / 3) * 50 / 2 = 200 MHz
        const clock = (inputFreq / inputDiv) * mult / outputDiv;
        return clock;
    }

    /**
     * Save config as .cfgsch file
     */
    private async saveScheme() {
        const defaultUri = vscode.workspace.workspaceFolders?.[0]?.uri;
        const fileUri = await vscode.window.showSaveDialog({
            defaultUri: defaultUri,
            filters: {
                'MikroC Scheme Files': ['cfgsch'],
                'All Files': ['*']
            }
        });

        if (!fileUri) {return;}

        const xml = this.generateCfgschXml();
        await fs.promises.writeFile(fileUri.fsPath, xml, 'utf8');
        vscode.window.showInformationMessage(`Scheme saved: ${path.basename(fileUri.fsPath)}`);
    }

    /**
     * Load config from .cfgsch file
     */
    private async loadScheme() {
        const fileUris = await vscode.window.showOpenDialog({
            canSelectMany: false,
            filters: {
                'MikroC Scheme Files': ['cfgsch'],
                'All Files': ['*']
            }
        });

        if (!fileUris || fileUris.length === 0) {return;}

        try {
            const xml = await fs.promises.readFile(fileUris[0].fsPath, 'utf8');
            this.parseCfgschXml(xml);
            this.sendInitialData();
            vscode.window.showInformationMessage(`Scheme loaded: ${path.basename(fileUris[0].fsPath)}`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to load scheme: ${error}`);
        }
    }

    /**
     * Generate .cfgsch XML from current config
     */
    private generateCfgschXml(): string {
        let xml = '<?xml version="1.0"?>\n';
        xml += '<MCU_DEVICE_FLAGS>\n';
        xml += '  <DEVICE>\n';
        xml += `    <DEVICE_NAME>${this.device.name}</DEVICE_NAME>\n`;
        xml += '    <SETTINGS>\n';
        xml += `      <COUNT>${EFH_UI_SCHEMA.length}</COUNT>\n`;

        EFH_UI_SCHEMA.forEach(setting => {
            const value = this.currentConfig.get(setting.index) || setting.defaultValue;
            xml += `      <SETTING${setting.index}>\n`;
            xml += `        <NAME>${setting.name}</NAME>\n`;
            xml += `        <DESCRIPTION>${value}</DESCRIPTION>\n`;
            xml += `      </SETTING${setting.index}>\n`;
        });

        xml += '    </SETTINGS>\n';
        xml += '  </DEVICE>\n';
        xml += '</MCU_DEVICE_FLAGS>\n';

        return xml;
    }

    /**
     * Parse .cfgsch XML and update config
     */
    private parseCfgschXml(xml: string) {
        // Simple XML parsing - extract SETTING values
        const settingRegex = /<SETTING(\d+)>[\s\S]*?<DESCRIPTION>(.*?)<\/DESCRIPTION>[\s\S]*?<\/SETTING\1>/g;
        let match;

        while ((match = settingRegex.exec(xml)) !== null) {
            const index = parseInt(match[1]);
            const value = match[2].trim();
            this.currentConfig.set(index, value);
        }
    }

    /**
     * Detect and send XC32 compiler versions
     */
    private async sendXC32Versions() {
        if (!this.panel) {return;}

        const versions: string[] = [];
        const xc32Base = 'C:\\Program Files\\Microchip\\xc32';

        try {
            if (fs.existsSync(xc32Base)) {
                const dirs = fs.readdirSync(xc32Base, { withFileTypes: true });
                dirs.filter(d => d.isDirectory())
                    .forEach(d => versions.push(d.name));
                // Sort descending (latest first)
                versions.sort().reverse();
            }
        } catch (error) {
            console.error('Error detecting XC32 versions:', error);
        }

        this.panel.webview.postMessage({
            type: 'populateXC32Versions',
            versions: versions
        });
    }

    /**
     * Recursively search for DFP installations
     */
    private findDFPPaths(basePath: string, maxDepth: number = 3): string[] {
        const results: string[] = [];
        
        const searchRecursive = (currentPath: string, depth: number) => {
            if (depth > maxDepth) {return;}
            
            try {
                const entries = fs.readdirSync(currentPath, { withFileTypes: true });
                
                for (const entry of entries) {
                    if (!entry.isDirectory()) {continue;}
                    
                    const fullPath = path.join(currentPath, entry.name);
                    
                    // Check if this is a DFP directory (contains version folders)
                    if (entry.name === 'PIC32MZ-EF_DFP') {
                        results.push(fullPath);
                        continue; // Don't recurse into DFP directory
                    }
                    
                    // Skip common non-relevant directories
                    const skipDirs = ['node_modules', 'bin', 'obj', 'temp', 'tmp', '$RECYCLE.BIN', 
                                     'System Volume Information', 'Windows', 'ProgramData'];
                    if (!skipDirs.includes(entry.name)) {
                        searchRecursive(fullPath, depth + 1);
                    }
                }
            } catch (error) {
                // Skip inaccessible directories
            }
        };
        
        searchRecursive(basePath, 0);
        return results;
    }

    /**
     * Detect and send DFP versions
     */
    private async sendDFPVersions(deviceFamily: string) {
        if (!this.panel) {return;}

        const foundVersions = new Set<string>();
        const isWindows = process.platform === 'win32';
        
        // Start with common root directories
        const rootPaths: string[] = [];
        
        if (isWindows) {
            // Search common Windows locations
            rootPaths.push(
                'C:\\Program Files',
                'C:\\Program Files (x86)',
                `C:\\Users\\${process.env.USERNAME || 'User'}`,
                'C:\\Microchip'
            );
            
            // Also check other drives (D:, E:, etc.) - limit to first 5 drives
            for (let i = 68; i <= 72; i++) { // D-H drives
                const drive = String.fromCharCode(i) + ':\\';
                if (fs.existsSync(drive)) {
                    rootPaths.push(drive + 'Microchip');
                    rootPaths.push(drive + 'Harmony');
                }
            }
        } else {
            rootPaths.push('/opt/microchip', '/usr/local/microchip');
        }

        console.log('Searching for DFP installations in:', rootPaths);

        // Search all root paths for DFP directories
        const dfpPaths: string[] = [];
        for (const rootPath of rootPaths) {
            if (fs.existsSync(rootPath)) {
                const found = this.findDFPPaths(rootPath);
                dfpPaths.push(...found);
            }
        }

        console.log(`Found ${dfpPaths.length} DFP installation(s):`, dfpPaths);

        // Extract versions from all found DFP paths
        for (const dfpBase of dfpPaths) {
            try {
                const dirs = fs.readdirSync(dfpBase, { withFileTypes: true });
                const versionDirs = dirs.filter(d => d.isDirectory() && /^\d+\.\d+\.\d+/.test(d.name));
                versionDirs.forEach(d => foundVersions.add(d.name));
            } catch (error) {
                // Skip inaccessible paths
            }
        }

        // Convert Set to Array and sort descending by version number
        const versionArray = Array.from(foundVersions);
        versionArray.sort((a, b) => {
            const aParts = a.split('.').map(Number);
            const bParts = b.split('.').map(Number);
            for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
                const diff = (bParts[i] || 0) - (aParts[i] || 0);
                if (diff !== 0) {return diff;}
            }
            return 0;
        });

        console.log(`Total unique DFP versions found: ${versionArray.length}`, versionArray);

        this.panel.webview.postMessage({
            type: 'populateDFPVersions',
            versions: versionArray
        });
    }

    /**
     * Get webview HTML content
     */
    private getWebviewContent(): string {
        const htmlPath = path.join(this.context.extensionPath, 'src', 'webview', 'configEditor.html');
        let html = fs.readFileSync(htmlPath, 'utf8');

        // No resource replacements needed - HTML is self-contained
        return html;
    }

    /**
     * Get current configuration
     */
    public getConfig(): Map<number, string> {
        return new Map(this.currentConfig);
    }
}
