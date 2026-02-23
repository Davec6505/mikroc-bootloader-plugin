/**
 * Configuration Editor Webview Provider
 * Provides oscillator/PLL configuration for new projects
 * Uses pre-validated #pragma config templates from device JSON files
 * Substitutes user's PLL/clock values into family-specific templates
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { familyMetadata, getConfigBits } from './deviceLoader';

export interface ConfigEditorOptions {
    deviceName: string;
    deviceFamily: string;
    compiler: 'XC32' | 'MikroC';
    existingConfig?: ProjectConfig;
}

export interface ProjectConfig {
    device: string;
    compiler: string;
    oscillator: {
        selection?: string;  // SPLL, PRIPLL, etc. (FNOSC)
        primary: {
            type: string;  // XT, HS, EC, etc. (POSCMOD)
            frequency: number;  // Hz
        };
        secondary: {
            enabled: boolean;
        };
    };
    pll: {
        inputDiv: number;
        multiplier: number;
        outputDiv: number;
        usbInputDiv?: number;
        usbEnabled?: boolean;
    };
    clock: {
        systemFrequency: number;
        peripheralDiv: number;  // PIC32MX only: FPBDIV (1, 2, 4, 8)
        peripheralBuses?: {     // PIC32MZ EF: PB1-PB5, PB7, PB8 (no PB6 on EF family)
            pb1: { enabled: boolean; divider: number };  // System Bus - always ON (no ON bit)
            pb2: { enabled: boolean; divider: number };  // UART/SPI/I2C
            pb3: { enabled: boolean; divider: number };  // Timers/PWM
            pb4: { enabled: boolean; divider: number };  // GPIO Ports
            pb5: { enabled: boolean; divider: number };  // Flash/EBI/SQI
            pb7: { enabled: boolean; divider: number };  // ADC/Reference Clock (has ON+PBDIV)
            pb8: { enabled: boolean; divider: number };  // USB/CAN/Ethernet
        };
        switchingEnabled: boolean;
        fcksm?: string;       // Clock Switching and Monitor Selection
        fsoscen?: string;     // Secondary Oscillator Enable
        ieso?: string;        // Internal/External Switch Over
        osciofnc?: string;    // CLKO Output Signal Active
    };
    watchdog: {
        enabled: boolean;
        postscaler: string;
        windis?: string;      // Watchdog Window Enable
        fwdtwinsz?: string;   // Watchdog Window Size
    };
    debug: {
        enabled: boolean;
        icesel: string;
        jtagen?: string;      // JTAG Enable
    };
    protection: {
        codeProtect: boolean;
        writeProtect: boolean;
        pwp?: string;         // Program Flash Write Protect
        bwp?: string;         // Boot Flash Write Protect
    };
    interrupts?: {
        mode: string;
        shadowRegisters: boolean;
        srsCount: number;
        vectorSpacing: number;
        ebase: string;
    };
    build?: {
        heapSize: number;    // bytes
        stackSize: number;   // bytes
        optLevel: string;    // '0','1','2','3','s'
        buildType: string;   // 'Release' | 'Debug'
    };
    libraries?: string[];    // MikroC only: short lib names e.g. ['Delays', 'USB']
    peripherals?: string[];  // XC32 only: plib modules to generate e.g. ['coretimer', 'uart1']
    peripheralConfig?: {
        coretimer?: {
            enableInterrupt: boolean;
            periodicInterrupt: boolean;
            periodMs: number;
            stopInDebug: boolean;
        };
    };
}

export class ConfigEditorProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'pic32.configEditor';
    
    private _view?: vscode.WebviewView;
    private _resolveConfig?: (config: ProjectConfig | null) => void;
    
    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly options: ConfigEditorOptions
    ) {}
    
    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;
        
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this._extensionUri, 'out', 'webview')
            ]
        };
        
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        
        // Handle messages from webview
        webviewView.webview.onDidReceiveMessage(message => {
            switch (message.type) {
                case 'ready':
                    this._sendInitialData();
                    break;
                case 'saveConfig':
                    this._handleSaveConfig(message.config);
                    break;
                case 'cancel':
                    this._handleCancel();
                    break;
                case 'loadScheme':
                    this._handleLoadScheme();
                    break;
                case 'saveScheme':
                    this._handleSaveScheme(message.config);
                    break;
                case 'resetDefault':
                    this._handleResetDefault();
                    break;
                case 'openLibraryDoc':
                    this._openLibraryDoc(message.docPage);
                    break;
            }
        });
    }
    
    /**
     * Show config editor as modal and wait for user response
     */
    public async showModal(): Promise<ProjectConfig | null> {
        const panel = vscode.window.createWebviewPanel(
            'pic32ConfigEditor',
            'Edit Project Configuration',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(this._extensionUri, 'out', 'webview')
                ]
            }
        );
        
        panel.webview.html = this._getHtmlForWebview(panel.webview);
        
        return new Promise((resolve) => {
            this._resolveConfig = resolve;
            
            panel.webview.onDidReceiveMessage(message => {
                console.log('[ConfigEditor Backend] Received message:', message.type);
                switch (message.type) {
                    case 'ready':
                        console.log('[ConfigEditor Backend] Webview ready, sending initial data');
                        this._sendInitialData(panel.webview);
                        break;
                    case 'saveConfig':
                        console.log('[ConfigEditor Backend] Received saveConfig, resolving with config');
                        console.log('[ConfigEditor Backend] Config:', JSON.stringify(message.config, null, 2));
                        resolve(message.config as ProjectConfig);
                        panel.dispose();  // Dispose AFTER resolving to prevent onDidDispose from resolving with null
                        break;
                    case 'cancel':
                        console.log('[ConfigEditor Backend] User cancelled');
                        panel.dispose();
                        resolve(null);
                        break;
                    case 'loadScheme':
                        this._handleLoadScheme(panel.webview);
                        break;
                    case 'saveScheme':
                        this._handleSaveScheme(message.config, panel.webview);
                        break;
                    case 'resetDefault':
                        this._handleResetDefault(panel.webview);
                        break;
                    case 'openLibraryDoc':
                        this._openLibraryDoc(message.docPage);
                        break;
                }
            });
            
            panel.onDidDispose(() => {
                if (this._resolveConfig) {
                    this._resolveConfig(null);
                }
            });
        });
    }
    
    private _sendInitialData(webview?: vscode.Webview) {
        const target = webview || this._view?.webview;
        if (!target) {return;}
        
        // Get device constraints from JSON
        const family = familyMetadata.get(this.options.deviceFamily);
        const deviceConstraints = this._getDeviceConstraints();
        const deviceCaps = this._getDeviceCaps();
        
        // Get default config or use existing
        const config = this.options.existingConfig || this._getDefaultConfig();

        // Load library catalog from JSON (only for MikroC)
        let libraryCategories: unknown[] = [];
        if (this.options.compiler === 'MikroC') {
            try {
                const libJsonPath = path.join(this._extensionUri.fsPath, 'src', 'mikroc-libraries.json');
                // Fallback to out/ if src/ not available (packaged extension)
                const libJsonPathOut = path.join(this._extensionUri.fsPath, 'out', 'mikroc-libraries.json');
                const libJsonFile = fs.existsSync(libJsonPath) ? libJsonPath : libJsonPathOut;
                if (fs.existsSync(libJsonFile)) {
                    const raw = fs.readFileSync(libJsonFile, 'utf8');
                    libraryCategories = JSON.parse(raw).categories || [];
                }
            } catch (e) {
                console.warn('[ConfigEditor] Failed to load library catalog:', e);
            }
        }
        
        target.postMessage({
            type: 'init',
            deviceName: this.options.deviceName,
            deviceFamily: this.options.deviceFamily,
            compiler: this.options.compiler,
            constraints: deviceConstraints,
            deviceCaps: deviceCaps,
            libraryCategories: libraryCategories,
            config: config
        });
    }

    /** Compute device peripheral capabilities from device name + family metadata */
    private _getDeviceCaps() {
        const dn  = this.options.deviceName.toUpperCase();
        const isMZ  = dn.startsWith('32MZ');
        const isMX  = dn.startsWith('32MX');
        const isEF  = dn.includes('EF');
        const isDA  = dn.includes('DA');
        const isMX12  = isMX && /32MX[12]/.test(dn);
        const isMX34  = isMX && /32MX[34]/.test(dn);
        const isMX567 = isMX && /32MX[567]/.test(dn);

        // Look up device description from family metadata to determine peripherals
        const family = familyMetadata.get(this.options.deviceFamily);
        const device = family?.devices.find(d => d.label.toUpperCase() === dn);
        const desc   = device?.description?.toUpperCase() || '';

        const hasUSB      = desc.includes('USB')      || isMZ || (isMX && /32MX[2-7]/.test(dn) && !(/32MX3[23]0/.test(dn)));
        const hasCAN      = desc.includes('CAN')      || (isMZ && isEF);
        const hasEthernet = desc.includes('ETHERNET')  || (isMZ && isEF) || /32MX[67]/.test(dn);

        return { isMZ, isEF, isDA, isMX, isMX12, isMX34, isMX567, hasUSB, hasCAN, hasEthernet };
    }

    /** Open CHM library documentation to a specific page */
    private _getMikroCInstallPath(): string {
        const setting = vscode.workspace.getConfiguration('pic32-ide').get<string>('mikroCInstallPath');
        if (setting && fs.existsSync(setting)) { return setting; }
        const pub = process.env['PUBLIC'] || 'C:\\Users\\Public';
        const std = path.join(pub, 'Documents', 'Mikroelektronika', 'mikroC PRO for PIC32');
        if (fs.existsSync(std)) { return std; }
        for (const pf of [process.env['ProgramFiles'], process.env['ProgramFiles(x86)']]) {
            if (!pf) { continue; }
            const candidate = path.join(pf, 'Mikroelektronika', 'mikroC PRO for PIC32');
            if (fs.existsSync(candidate)) { return candidate; }
        }
        return '';
    }

    private _openLibraryDoc(docPage: string) {
        const installPath = this._getMikroCInstallPath();
        if (!installPath) {
            vscode.window.showWarningMessage(
                'MikroC PRO for PIC32 installation not found. ' +
                'Set the "pic32-ide.mikroCInstallPath" setting if installed in a non-standard location.'
            );
            return;
        }
        const chmPath = path.join(installPath, 'mikroC_PRO_PIC32.chm');
        if (!fs.existsSync(chmPath)) {
            vscode.window.showWarningMessage(`MikroC PIC32 help file not found at: ${chmPath}`);
            return;
        }
        if (docPage) {
            // Open to specific page inside CHM using hh.exe
            const url = `ms-its:${chmPath}::/${docPage}.htm`;
            exec(`hh.exe "${url}"`, (err) => {
                if (err) {
                    // Fallback: open CHM file directly
                    exec(`start "" "${chmPath}"`);
                }
            });
        } else {
            // No specific page — open CHM at home
            exec(`start "" "${chmPath}"`);
        }
    }
    
    private _getDeviceConstraints() {
        // Extract valid options from device family metadata
        // This will be parsed from the #pragma config lines
        const isPIC32MZ = this.options.deviceName.startsWith('32MZ');
        
        if (isPIC32MZ) {
            // EF family: up to 252 MHz; DA/EC/W1: up to 200 MHz
            const mzMaxClock = this.options.deviceName.includes('EF') ? 252000000 : 200000000;
            return {
                pllInputDiv: [1, 2, 3, 4, 5, 6, 7, 8],
                pllMultiplier: Array.from({length: 86}, (_, i) => i + 1), // 1-86 for MZ
                pllOutputDiv: [2, 4, 8, 16, 32],
                oscillatorModes: ['EC', 'XT', 'HS'],
                maxSystemClock: mzMaxClock
            };
        } else {
            // PIC32MX
            return {
                pllInputDiv: [1, 2, 3, 4, 5, 6, 10, 12],
                pllMultiplier: Array.from({length: 9}, (_, i) => i + 15), // 15-24 for MX
                pllOutputDiv: [1, 2, 4, 8, 16, 32, 64, 256],
                oscillatorModes: ['EC', 'XT', 'HS'],
                maxSystemClock: this.options.deviceName.match(/32MX[34]/)   ? 120000000
                               : this.options.deviceName.match(/32MX[567]/)  ?  80000000
                               : this.options.deviceName.match(/32MX[12][57]4/) ?  72000000
                               :  50000000  // standard MX1xx/MX2xx (non-XLP)
            };
        }
    }
    
    private _getDefaultConfig(): ProjectConfig {
        const isPIC32MZ = this.options.deviceName.startsWith('32MZ');
        
        if (isPIC32MZ) {
            // PIC32MZ default: 24MHz crystal → 200MHz
            return {
                device: this.options.deviceName,
                compiler: this.options.compiler,
                oscillator: {
                    selection: 'SPLL',
                    primary: { type: 'EC', frequency: 24000000 },
                    secondary: { enabled: false }
                },
                pll: {
                    inputDiv: 3,
                    multiplier: 50,
                    outputDiv: 2,
                    usbInputDiv: 3,
                    usbEnabled: false
                },
                clock: {
                    systemFrequency: 200000000,
                    peripheralDiv: 1,
                    peripheralBuses: {
                        pb1: { enabled: true,  divider: 1 },  // PBDIV=1 → ÷2 → 100MHz (System Bus)
                        pb2: { enabled: true,  divider: 1 },  // PBDIV=1 → ÷2 → 100MHz (UART/SPI/I2C)
                        pb3: { enabled: true,  divider: 1 },  // PBDIV=1 → ÷2 → 100MHz (Timers)
                        pb4: { enabled: true,  divider: 1 },  // PBDIV=1 → ÷2 → 100MHz (Ports)
                        pb5: { enabled: true,  divider: 1 },  // PBDIV=1 → ÷2 → 100MHz (Flash)
                        pb7: { enabled: true,  divider: 1 },  // PBDIV=1 → ÷2 → 100MHz (ADC/Ref)
                        pb8: { enabled: true,  divider: 0 },  // PBDIV=0 → ÷1 → 200MHz (USB/CAN)
                    },
                    switchingEnabled: false,
                    fcksm: 'CSECME',
                    fsoscen: 'OFF',
                    ieso: 'OFF',
                    osciofnc: 'OFF'
                },
                watchdog: { 
                    enabled: false, 
                    postscaler: 'PS1048576',
                    windis: 'OFF',
                    fwdtwinsz: 'WINSZ_25'
                },
                debug: { 
                    enabled: true, 
                    icesel: 'ICS_PGx2',
                    jtagen: 'OFF'
                },
                protection: { 
                    codeProtect: false, 
                    writeProtect: false,
                    pwp: 'OFF',
                    bwp: 'OFF'
                },
                build: {
                    heapSize: 4096,
                    stackSize: 4096,
                    optLevel: '2',
                    buildType: 'Release'
                },
                libraries: ['Delays']
            };
        } else {
            // PIC32MX default: 8MHz crystal → 80MHz
            return {
                device: this.options.deviceName,
                compiler: this.options.compiler,
                oscillator: {
                    selection: 'PRIPLL',
                    primary: { type: 'XT', frequency: 8000000 },
                    secondary: { enabled: false }
                },
                pll: {
                    inputDiv: 2,
                    multiplier: 20,
                    outputDiv: 1,
                    usbInputDiv: 2,
                    usbEnabled: false
                },
                clock: {
                    systemFrequency: 80000000,
                    peripheralDiv: 1,
                    switchingEnabled: false,
                    fcksm: 'CSDCMD',
                    fsoscen: 'OFF',
                    ieso: 'OFF',
                    osciofnc: 'OFF'
                },
                watchdog: { 
                    enabled: false, 
                    postscaler: 'PS1048576',
                    windis: 'OFF',
                    fwdtwinsz: 'WINSZ_25'
                },
                debug: { 
                    enabled: true, 
                    icesel: 'ICS_PGx2',
                    jtagen: 'OFF'
                },
                protection: { 
                    codeProtect: false, 
                    writeProtect: false,
                    pwp: 'OFF',
                    bwp: 'OFF'
                },
                interrupts: {
                    mode: 'multi',
                    shadowRegisters: true,
                    srsCount: 7,
                    vectorSpacing: 32,
                    ebase: '0x9FC01000'
                },
                build: {
                    heapSize: 4096,
                    stackSize: 4096,
                    optLevel: '2',
                    buildType: 'Release'
                },
                libraries: ['Delays']
            };
        }
    }
    
    private _handleSaveConfig(config: ProjectConfig) {
        if (this._resolveConfig) {
            this._resolveConfig(config);
        }
    }
    
    private _handleCancel() {
        if (this._resolveConfig) {
            this._resolveConfig(null);
        }
    }
    
    private async _handleLoadScheme(webview?: vscode.Webview) {
        const fileUri = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            filters: { 'Config Scheme': ['json'] },
            title: 'Load Configuration Scheme'
        });
        
        if (fileUri && fileUri[0]) {
            const config = JSON.parse(fs.readFileSync(fileUri[0].fsPath, 'utf-8'));
            
            const target = webview || this._view?.webview;
            if (target) {
                target.postMessage({
                    type: 'loadedConfig',
                    config: config
                });
            }
        }
    }
    
    private async _handleSaveScheme(config: ProjectConfig, webview?: vscode.Webview) {
        const fileUri = await vscode.window.showSaveDialog({
            filters: { 'Config Scheme': ['json'] },
            defaultUri: vscode.Uri.file('config-scheme.json'),
            title: 'Save Configuration Scheme'
        });
        
        if (fileUri) {
            fs.writeFileSync(fileUri.fsPath, JSON.stringify(config, null, 2), 'utf-8');
            vscode.window.showInformationMessage('Configuration scheme saved!');
        }
    }
    
    private _handleResetDefault(webview?: vscode.Webview) {
        const defaultConfig = this._getDefaultConfig();
        const target = webview || this._view?.webview;
        if (target) {
            target.postMessage({
                type: 'loadedConfig',
                config: defaultConfig
            });
        }
    }
    
    private _getHtmlForWebview(webview: vscode.Webview): string {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'out', 'webview', 'configEditor.js')
        );
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'out', 'webview', 'configEditor.css')
        );
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline';">
    <link href="${styleUri}" rel="stylesheet">
    <title>Edit Project Configuration</title>
</head>
<body>
    <div class="config-container">
        <div class="config-left">
            <h3>General project settings</h3>
            
            <div class="config-section">
                <label>PLL Input Divider (FPLLIDIV)</label>
                <select id="pllInputDiv"></select>
            </div>
            
            <div class="config-section">
                <label>PLL Multiplier (FPLLMULT)</label>
                <select id="pllMultiplier"></select>
            </div>
            
            <div class="config-section">
                <label>System PLL Output Clock Divider (FPLLODIV)</label>
                <select id="pllOutputDiv"></select>
            </div>
            
            <div class="config-section">
                <label>Oscillator Selection Bits (FNOSC)</label>
                <select id="oscSelection">
                    <option value="SPLL">Primary Osc w/PLL (XT+,HS+,EC+PLL)</option>
                    <option value="PRIPLL">Primary Osc w/PLL (PRIPLL)</option>
                    <option value="POSC">Primary Oscillator (XT, HS, EC)</option>
                    <option value="FRC">Fast RC Osc (FRC)</option>
                    <option value="FRCPLL">Fast RC Osc w/Div by N (FRCDIV)</option>
                    <option value="SOSC">Secondary Oscillator (SOSC)</option>
                    <option value="LPRC">Low-Power RC Osc (LPRC)</option>
                </select>
            </div>
            
            <div class="config-section">
                <label>Primary Oscillator Configuration (POSCMOD)</label>
                <select id="oscMode">
                    <option value="EC">EC osc mode</option>
                    <option value="XT">XT osc mode</option>
                    <option value="HS">HS osc mode</option>
                    <option value="OFF">Disabled</option>
                </select>
            </div>
            
            <div class="config-section">
                <label>Oscillator Crystal Frequency [MHz]</label>
                <input type="number" id="oscFrequency" step="0.001" min="0" max="50">
            </div>
            
            <div class="config-section">
                <label>Peripheral Clock Divisor (FPBDIV)</label>
                <select id="pbDiv">
                    <option value="1">Pb_Clk is Sys_Clk/1</option>
                    <option value="2">Pb_Clk is Sys_Clk/2</option>
                    <option value="4">Pb_Clk is Sys_Clk/4</option>
                    <option value="8">Pb_Clk is Sys_Clk/8</option>
                </select>
            </div>
            
            <!-- Peripheral Bus Clocks (PIC32MZ only) -->
            <div id="pbclkSection" class="pbclk-section" style="display:none;">
                <h4>Peripheral Bus Clocks (PIC32MZ EF - PB1-PB5, PB7, PB8)</h4>
                <div class="pbclk-sysclk"><span id="pbclkSysclk">SYSCLK: — MHz</span> &nbsp;|&nbsp; PB1/PB8 max 200 MHz, PB2–PB5/PB7 max 100 MHz</div>
                <div class="pbclk-row">
                    <label>PBCLK1 (System Bus - always ON)</label>
                    <select id="pb1">
                        <option value="0">0 (÷1 = SYSCLK)</option>
                        <option value="1" selected>1 (÷2 = SYSCLK/2)</option>
                        <option value="2">2 (÷3)</option>
                        <option value="3">3 (÷4)</option>
                        <option value="4">4 (÷5)</option>
                        <option value="5">5 (÷6)</option>
                        <option value="6">6 (÷7)</option>
                        <option value="7">7 (÷8)</option>
                    </select>
                    <span class="pbclk-freq" id="pb1Freq">100 MHz</span>
                </div>
                
                <div class="pbclk-row">
                    <label><input type="checkbox" id="pb2Enable" checked> PBCLK2 (UART/SPI/I2C)</label>
                    <select id="pb2">
                        <option value="0">0 (÷1 = SYSCLK)</option>
                        <option value="1" selected>1 (÷2 = SYSCLK/2)</option>
                        <option value="2">2 (÷3)</option>
                        <option value="3">3 (÷4)</option>
                        <option value="4">4 (÷5)</option>
                        <option value="5">5 (÷6)</option>
                        <option value="6">6 (÷7)</option>
                        <option value="7">7 (÷8)</option>
                    </select>
                    <span class="pbclk-freq" id="pb2Freq">100 MHz</span>
                </div>
                
                <div class="pbclk-row">
                    <label><input type="checkbox" id="pb3Enable" checked> PBCLK3 (Timers/PWM)</label>
                    <select id="pb3">
                        <option value="0">0 (÷1 = SYSCLK)</option>
                        <option value="1" selected>1 (÷2 = SYSCLK/2)</option>
                        <option value="2">2 (÷3)</option>
                        <option value="3">3 (÷4)</option>
                        <option value="4">4 (÷5)</option>
                        <option value="5">5 (÷6)</option>
                        <option value="6">6 (÷7)</option>
                        <option value="7">7 (÷8)</option>
                    </select>
                    <span class="pbclk-freq" id="pb3Freq">100 MHz</span>
                </div>
                
                <div class="pbclk-row">
                    <label><input type="checkbox" id="pb4Enable" checked> PBCLK4 (GPIO Ports)</label>
                    <select id="pb4">
                        <option value="0">0 (÷1 = SYSCLK)</option>
                        <option value="1" selected>1 (÷2 = SYSCLK/2)</option>
                        <option value="2">2 (÷3)</option>
                        <option value="3">3 (÷4)</option>
                        <option value="4">4 (÷5)</option>
                        <option value="5">5 (÷6)</option>
                        <option value="6">6 (÷7)</option>
                        <option value="7">7 (÷8)</option>
                    </select>
                    <span class="pbclk-freq" id="pb4Freq">100 MHz</span>
                </div>
                
                <div class="pbclk-row">
                    <label><input type="checkbox" id="pb5Enable" checked> PBCLK5 (Flash/EBI/SQI)</label>
                    <select id="pb5">
                        <option value="0">0 (÷1 = SYSCLK)</option>
                        <option value="1" selected>1 (÷2 = SYSCLK/2)</option>
                        <option value="2">2 (÷3)</option>
                        <option value="3">3 (÷4)</option>
                        <option value="4">4 (÷5)</option>
                        <option value="5">5 (÷6)</option>
                        <option value="6">6 (÷7)</option>
                        <option value="7">7 (÷8)</option>
                    </select>
                    <span class="pbclk-freq" id="pb5Freq">100 MHz</span>
                </div>
                
                <div class="pbclk-row">
                    <label><input type="checkbox" id="pb7Enable" checked> PBCLK7 (ADC/Reference Clock)</label>
                    <select id="pb7">
                        <option value="0">0 (÷1 = SYSCLK)</option>
                        <option value="1" selected>1 (÷2 = SYSCLK/2)</option>
                        <option value="2">2 (÷3)</option>
                        <option value="3">3 (÷4)</option>
                        <option value="4">4 (÷5)</option>
                        <option value="5">5 (÷6)</option>
                        <option value="6">6 (÷7)</option>
                        <option value="7">7 (÷8)</option>
                    </select>
                    <span class="pbclk-freq" id="pb7Freq">100 MHz</span>
                </div>
                
                <div class="pbclk-row">
                    <label><input type="checkbox" id="pb8Enable" checked> PBCLK8 (USB/CAN/Ethernet)</label>
                    <select id="pb8">
                        <option value="0" selected>0 (÷1 = SYSCLK)</option>
                        <option value="1">1 (÷2 = SYSCLK/2)</option>
                        <option value="2">2 (÷3)</option>
                        <option value="3">3 (÷4)</option>
                        <option value="4">4 (÷5)</option>
                        <option value="5">5 (÷6)</option>
                        <option value="6">6 (÷7)</option>
                        <option value="7">7 (÷8)</option>
                    </select>
                    <span class="pbclk-freq" id="pb8Freq">200 MHz</span>
                </div>
            </div>
            
            <div class="config-section">
                <label>Clock Switching and Monitor Selection (FCKSM)</label>
                <select id="fcksm">
                    <option value="CSECME">Clock Switch Enable, FSCM Enabled</option>
                    <option value="CSECMD">Clock Switch Enable, FSCM Disabled</option>
                    <option value="CSDCMD">Clock Switch Disable, FSCM Disabled</option>
                </select>
            </div>
            
            <div class="config-section">
                <label>Secondary Oscillator Enable (FSOSCEN)</label>
                <select id="fsoscen">
                    <option value="OFF">Disabled</option>
                    <option value="ON">Enabled</option>
                </select>
            </div>
            
            <div class="config-section">
                <label>Internal/External Switch Over (IESO)</label>
                <select id="ieso">
                    <option value="OFF">Disabled</option>
                    <option value="ON">Enabled</option>
                </select>
            </div>
            
            <div class="config-section">
                <label>CLKO Output Signal Active on the OSCO Pin (OSCIOFNC)</label>
                <select id="osciofnc">
                    <option value="OFF">Disabled</option>
                    <option value="ON">Enabled</option>
                </select>
            </div>
            
            <div class="config-section">
                <label>Watchdog Timer Enable (FWDTEN)</label>
                <select id="wdtEnable">
                    <option value="OFF">WDT Disabled (SWDTEN Bit Controls)</option>
                    <option value="ON">WDT Enabled</option>
                </select>
            </div>
            
            <div class="config-section">
                <label>Watchdog Timer Postscaler (WDTPS)</label>
                <select id="wdtPostscaler">
                    <option value="PS1">1:1</option>
                    <option value="PS2">1:2</option>
                    <option value="PS4">1:4</option>
                    <option value="PS8">1:8</option>
                    <option value="PS16">1:16</option>
                    <option value="PS32">1:32</option>
                    <option value="PS64">1:64</option>
                    <option value="PS128">1:128</option>
                    <option value="PS256">1:256</option>
                    <option value="PS512">1:512</option>
                    <option value="PS1024">1:1024</option>
                    <option value="PS2048">1:2048</option>
                    <option value="PS4096">1:4096</option>
                    <option value="PS8192">1:8192</option>
                    <option value="PS16384">1:16384</option>
                    <option value="PS32768">1:32768</option>
                    <option value="PS65536">1:65536</option>
                    <option value="PS131072">1:131072</option>
                    <option value="PS262144">1:262144</option>
                    <option value="PS524288">1:524288</option>
                    <option value="PS1048576" selected>1:1048576</option>
                </select>
            </div>
            
            <div class="config-section">
                <label>Watchdog Timer Window Enable (WINDIS)</label>
                <select id="windis">
                    <option value="OFF">Watchdog Timer in Non-Window Mode</option>
                    <option value="ON">Watchdog Timer in Window Mode</option>
                </select>
            </div>
            
            <div class="config-section">
                <label>Watchdog Timer Window Size (FWDTWINSZ)</label>
                <select id="fwdtwinsz">
                    <option value="WINSZ_75">Window Size is 75%</option>
                    <option value="WINSZ_50">Window Size is 50%</option>
                    <option value="WINSZ_37">Window Size is 37.5%</option>
                    <option value="WINSZ_25">Window Size is 25%</option>
                </select>
            </div>
            
            <div class="config-section">
                <label>Background Debugger Enable (DEBUG)</label>
                <select id="debugEnable">
                    <option value="ON" selected>Background Debugger Enabled</option>
                    <option value="OFF">Background Debugger Disabled</option>
                </select>
            </div>
            
            <div class="config-section">
                <label>JTAG Enable (JTAGEN)</label>
                <select id="jtagen">
                    <option value="OFF">JTAG Disabled</option>
                    <option value="ON">JTAG Port Enabled</option>
                </select>
            </div>
            
            <div class="config-section">
                <label>ICE/ICD Comm Channel Select (ICESEL)</label>
                <select id="icesel">
                    <option value="ICS_PGx1">Communicate on PGEC1/PGED1</option>
                    <option value="ICS_PGx2" selected>Communicate on PGEC2/PGED2</option>
                    <option value="ICS_PGx3">Communicate on PGEC3/PGED3</option>
                    <option value="ICS_PGx4">Communicate on PGEC4/PGED4</option>
                </select>
            </div>
            
            <div class="config-section">
                <label>Program Flash Write Protect (PWP)</label>
                <select id="pwp">
                    <option value="OFF">Disable</option>
                    <option value="PWP4K">First 4K</option>
                    <option value="PWP8K">First 8K</option>
                    <option value="PWP16K">First 16K</option>
                    <option value="PWP32K">First 32K</option>
                    <option value="PWP64K">First 64K</option>
                    <option value="PWP128K">First 128K</option>
                    <option value="PWP256K">First 256K</option>
                </select>
            </div>
            
            <div class="config-section">
                <label>Boot Flash Write Protect (BWP)</label>
                <select id="bwp">
                    <option value="OFF">Disable</option>
                    <option value="ON">Enable</option>
                </select>
            </div>
            
            <div class="config-section">
                <label>Code Protect (CP)</label>
                <select id="codeProtect">
                    <option value="OFF" selected>Protection Disabled</option>
                    <option value="ON">Protection Enabled</option>
                </select>
            </div>
        </div>
        
        <div class="config-right">
            <div class="device-panel">
                <h3>MCU and Oscillator</h3>
                
                <div class="device-info">
                    <label>MCU Name</label>
                    <div id="deviceName" class="info-value">Loading...</div>
                </div>
                
                <div class="device-info">
                    <label>MCU Clock Frequency [MHz]</label>
                    <input type="text" id="clockFrequency" readonly>
                </div>
                
                <div class="build-type">
                    <label>Build Type</label>
                    <div>
                        <input type="radio" id="buildTypeRelease" name="buildType" value="Release" checked> Release
                        <input type="radio" id="buildTypeDebug" name="buildType" value="Debug"> ICD Debug
                    </div>
                </div>
                
                <div class="build-settings">
                    <h4>Build Settings</h4>
                    <div class="device-info">
                        <label>Heap Size (bytes)</label>
                        <input type="number" id="heapSize" value="4096" min="0" step="256">
                    </div>
                    <div class="device-info">
                        <label>Stack Size (bytes)</label>
                        <input type="number" id="stackSize" value="4096" min="256" step="256">
                    </div>
                    <div class="device-info">
                        <label>Optimization Level</label>
                        <select id="optLevel">
                            <option value="0">-O0 (None - best for debugging)</option>
                            <option value="1">-O1 (Minimal)</option>
                            <option value="2" selected>-O2 (Recommended)</option>
                            <option value="3">-O3 (Aggressive)</option>
                            <option value="s">-Os (Optimize for size)</option>
                        </select>
                    </div>
                </div>
                
                <div class="config-registers" id="configRegistersSection">
                    <label>Configuration Registers</label>
                    <textarea id="configPreview" readonly></textarea>
                </div>
                
                <!-- Peripheral Library Selector (XC32 only — hidden for MikroC) -->
                <div id="peripheralSection" style="display:none;">
                    <h4 style="margin:4px 0;">Peripheral Libraries
                        <span style="font-weight:normal; font-size:11px; color:var(--vscode-descriptionForeground);">
                            — generates self-contained plib source files in srcs/peripheral/
                        </span>
                    </h4>
                    <div class="lib-category-body" style="display:block;">

                        <!-- CORE TIMER -->
                        <label class="lib-item">
                            <input type="checkbox" name="peripheral" id="ctEnabled" value="coretimer" checked>
                            <span class="lib-item-name" style="font-weight:600;">CORE TIMER</span>
                        </label>
                        <div id="coretimerOptions" style="margin-left:20px; font-size:12px;">
                            <!-- Enable Interrupt mode -->
                            <div style="display:flex; align-items:center; gap:6px; margin:3px 0;">
                                <input type="checkbox" id="ctEnableInterrupt" checked>
                                <label for="ctEnableInterrupt">Enable Interrupt mode</label>
                            </div>
                            <!-- Generate Periodic interrupt (sub-option) -->
                            <div id="ctPeriodicRow" style="margin-left:20px;">
                                <div style="display:flex; align-items:center; gap:6px; margin:3px 0;">
                                    <input type="checkbox" id="ctPeriodic" checked>
                                    <label for="ctPeriodic">Generate Periodic interrupt</label>
                                </div>
                                <!-- Period ms input (sub-sub-option) -->
                                <div id="ctPeriodMsRow" style="margin-left:20px; display:flex; align-items:center; gap:8px; margin:3px 0;">
                                    <label for="ctPeriodMs" style="flex:1;">Timer interrupt period (milliseconds)</label>
                                    <input type="number" id="ctPeriodMs" value="1" min="1" max="10000"
                                           style="width:70px; text-align:right;">
                                </div>
                            </div>
                            <!-- Stop Timer in Debug mode -->
                            <div style="display:flex; align-items:center; gap:6px; margin:3px 0;">
                                <input type="checkbox" id="ctStopDebug">
                                <label for="ctStopDebug">Stop Timer in Debug mode</label>
                            </div>
                            <!-- Frequency info label -->
                            <div style="margin:4px 0; font-style:italic; color:var(--vscode-descriptionForeground);">
                                *** Core Timer Clock Frequency <span id="ctFreqHz">--</span> Hz ***
                            </div>
                        </div>

                    </div>
                </div>

                <!-- Library Browser (MikroC compiler only — populated dynamically by JS) -->
                <div id="librarySection" style="display:none;">
                    <h4 style="margin:0 0 4px 0;">Libraries
                        <span style="font-weight:normal; font-size:11px; color:var(--vscode-descriptionForeground);">
                            — double-click any library to open its documentation
                        </span>
                    </h4>
                    <div id="libraryBrowser"><!-- JS renders categories here --></div>
                </div>
            </div>
            
            <div class="button-panel">
                <button id="loadScheme">Load Scheme</button>
                <button id="saveScheme">Save Scheme</button>
                <button id="default">Default</button>
            </div>
        </div>
    </div>
    
    <div class="footer-buttons">
        <button id="ok" class="primary">OK</button>
        <button id="cancel">Cancel</button>
    </div>
    
    <script src="${scriptUri}"></script>
</body>
</html>`;
    }
}

/**
 * Generate XC32 #pragma config statements from ProjectConfig
 * Uses pre-validated config bits from device JSON files with user's PLL values substituted
 */
export function generateXC32Config(config: ProjectConfig, familyName: string): string[] {
    // Load pre-validated config bits from device family JSON
    // This ensures correct config bit names and values for each device family
    const templateLines = getConfigBits(familyName, config.device);
    
    // Substitute user's actual PLL/clock configuration values
    const lines = templateLines.map(line => {
        // Replace PLL input divider
        if (line.includes('FPLLIDIV = DIV_')) {
            return line.replace(/DIV_\d+/, `DIV_${config.pll.inputDiv}`);
        }
        // Replace PLL multiplier
        if (line.includes('FPLLMULT = MUL_')) {
            return line.replace(/MUL_\d+/, `MUL_${config.pll.multiplier}`);
        }
        // Replace PLL output divider
        if (line.includes('FPLLODIV = DIV_')) {
            return line.replace(/DIV_\d+/, `DIV_${config.pll.outputDiv}`);
        }
        // Replace watchdog enable based on user config
        if (line.includes('FWDTEN =')) {
            return line.replace(/FWDTEN = \w+/, `FWDTEN = ${config.watchdog.enabled ? 'ON' : 'OFF'}`);
        }
        // Replace debug enable based on user config
        if (line.includes('DEBUG =')) {
            return line.replace(/DEBUG = \w+/, `DEBUG = ${config.debug.enabled ? 'ON' : 'OFF'}`);
        }
        // Replace primary oscillator mode based on user config
        if (line.includes('POSCMOD =') && config.oscillator.primary.type) {
            return line.replace(/POSCMOD = \w+/, `POSCMOD = ${config.oscillator.primary.type}`);
        }
        // Replace USB PLL divider for PIC32MX
        if (line.includes('UPLLIDIV = DIV_') && config.pll.usbInputDiv) {
            return line.replace(/DIV_\d+/, `DIV_${config.pll.usbInputDiv}`);
        }
        // Replace USB PLL enable for PIC32MX
        if (line.includes('UPLLEN =') && config.pll.usbEnabled !== undefined) {
            return line.replace(/UPLLEN = \w+/, `UPLLEN = ${config.pll.usbEnabled ? 'ON' : 'OFF'}`);
        }
        // Replace peripheral bus divider for PIC32MX
        if (line.includes('FPBDIV = DIV_') && config.clock.peripheralDiv) {
            return line.replace(/DIV_\d+/, `DIV_${config.clock.peripheralDiv}`);
        }
        
        // Return line unchanged if no substitutions needed
        return line;
    });
    
    return lines;
}

/**
 * Generate PIC32MZ Peripheral Bus Clock configuration startup code
 * PBCLKs are configured at runtime (not config bits)
 */
export function generatePBCLKStartup(config: ProjectConfig): string {
    if (!config.clock.peripheralBuses) {
        return ''; // PIC32MX - no PBCLK runtime config
    }
    
    const buses = config.clock.peripheralBuses;
    const sysclk = config.clock.systemFrequency;
    
    const calculateFreq = (divider: number): number => {
        return Math.round(sysclk / (divider + 1) / 1000000);
    };
    
    return `
/**
 * Configure Peripheral Bus Clocks (PIC32MZ)
 * Called early in startup before main()
 */
void configure_peripheral_clocks(void) {
    // Unlock system
    SYSKEY = 0x00000000;
    SYSKEY = 0xAA996655;
    SYSKEY = 0x556699AA;
    
    // PBCLK1 (System Bus - CPU, Flash, Interrupts, DMA) - Always ON, no ON bit
    PB1DIVbits.PBDIV = ${buses.pb1.divider};  // ${calculateFreq(buses.pb1.divider)} MHz
    while (PB1DIVbits.PBDIVRDY == 0);
    
    // PBCLK2 (Communication Peripherals - UART, SPI, I2C)
    PB2DIVbits.ON = ${buses.pb2.enabled ? '1' : '0'};
    PB2DIVbits.PBDIV = ${buses.pb2.divider};  // ${calculateFreq(buses.pb2.divider)} MHz
    while (PB2DIVbits.PBDIVRDY == 0);
    
    // PBCLK3 (Timers/PWM - Timer2-9, Input Capture, Output Compare)
    PB3DIVbits.ON = ${buses.pb3.enabled ? '1' : '0'};
    PB3DIVbits.PBDIV = ${buses.pb3.divider};  // ${calculateFreq(buses.pb3.divider)} MHz
    while (PB3DIVbits.PBDIVRDY == 0);
    
    // PBCLK4 (Ports - GPIO operations)
    PB4DIVbits.ON = ${buses.pb4.enabled ? '1' : '0'};
    PB4DIVbits.PBDIV = ${buses.pb4.divider};  // ${calculateFreq(buses.pb4.divider)} MHz
    while (PB4DIVbits.PBDIVRDY == 0);
    
    // PBCLK5 (Flash Controller, EBI, SQI)
    PB5DIVbits.ON = ${buses.pb5.enabled ? '1' : '0'};
    PB5DIVbits.PBDIV = ${buses.pb5.divider};  // ${calculateFreq(buses.pb5.divider)} MHz
    while (PB5DIVbits.PBDIVRDY == 0);
    
    // PBCLK7 (ADC / Reference Clock)
    PB7DIVbits.ON = ${buses.pb7.enabled ? '1' : '0'};
    PB7DIVbits.PBDIV = ${buses.pb7.divider};  // ${calculateFreq(buses.pb7.divider)} MHz
    while (PB7DIVbits.PBDIVRDY == 0);
    
    // PBCLK8 (USB, CAN, Ethernet)
    PB8DIVbits.ON = ${buses.pb8.enabled ? '1' : '0'};
    PB8DIVbits.PBDIV = ${buses.pb8.divider};  // ${calculateFreq(buses.pb8.divider)} MHz
    while (PB8DIVbits.PBDIVRDY == 0);
    
    // Lock system
    SYSKEY = 0x33333333;
}
`;
}
