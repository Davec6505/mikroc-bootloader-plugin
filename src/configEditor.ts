/**
 * PIC32 Configuration Editor
 * 
 * Webview-based config editor matching MikroC's Edit Project dialog
 * Supports .cfgsch import/export and live register preview
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { PIC32Device } from './devices/pic32mz/efhDevices';
import { EFH_UI_SCHEMA, ConfigSetting } from './devices/pic32mz/efhUiSchema';

export class ConfigEditor {
    private panel: vscode.WebviewPanel | undefined;
    private device: PIC32Device;
    private currentConfig: Map<number, string>;
    private onConfigComplete: ((config: Map<number, string>) => void) | undefined;

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
    public async show(): Promise<Map<number, string>> {
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
                            if (this.onConfigComplete) {
                                this.onConfigComplete(this.currentConfig);
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
     * TODO: Implement actual register mapping in next phase
     */
    private calculateAndSendRegisters() {
        if (!this.panel) {return;}

        // Placeholder - will implement actual register calculation
        const registers = {
            DEVCFG3: {
                address: '$1FC0FFC0',
                value: '0x43000000'
            },
            DEVCFG2: {
                address: '$1FC0FFC4',
                value: '0x40013122'
            },
            DEVCFG1: {
                address: '$1FC0FFC8',
                value: '0x5F74C4F9'
            },
            DEVCFG0: {
                address: '$1FC0FFCC',
                value: '0x403FF75B'
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
        const usbPllInput = this.currentConfig.get(11) || "USB PLL input is 24 MHz";

        // Extract numeric values
        const inputDivMatch = pllInputDiv.match(/(\d+)x/);
        const multMatch = pllMult.match(/by (\d+)/);
        const outputDivMatch = pllOutputDiv.match(/(\d+)x/);
        const inputFreqMatch = usbPllInput.match(/(\d+) MHz/);

        if (!inputDivMatch || !multMatch || !outputDivMatch || !inputFreqMatch) {
            return 200.0; // Default
        }

        const inputFreq = parseInt(inputFreqMatch[1]);
        const inputDiv = parseInt(inputDivMatch[1]);
        const mult = parseInt(multMatch[1]);
        const outputDiv = parseInt(outputDivMatch[1]);

        // Clock = (Input / InputDiv) * Mult / OutputDiv
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
