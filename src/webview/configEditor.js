/**
 * Configuration Editor Frontend Logic
 * Clock calculator, validation, and device communication
 */

(function() {
    const vscode = acquireVsCodeApi();
    
    let currentConfig = null;
    let constraints = null;
    let deviceName = '';
    let deviceFamily = '';
    
    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', () => {
        initializeEventListeners();
        vscode.postMessage({ type: 'ready' });
    });
    
    // Handle messages from extension
    window.addEventListener('message', event => {
        const message = event.data;
        
        switch (message.type) {
            case 'init':
                handleInit(message);
                break;
            case 'loadedConfig':
                loadConfigIntoUI(message.config);
                break;
        }
    });
    
    function initializeEventListeners() {
        // PLL and clock settings - recalculate on change
        document.getElementById('pllInputDiv').addEventListener('change', calculateClock);
        document.getElementById('pllMultiplier').addEventListener('change', calculateClock);
        document.getElementById('pllOutputDiv').addEventListener('change', calculateClock);
        document.getElementById('oscFrequency').addEventListener('input', calculateClock);
        document.getElementById('oscMode').addEventListener('change', calculateClock);
        document.getElementById('pbDiv').addEventListener('change', calculateClock);
        
        // PBCLK dividers (PIC32MZ only)
        for (let i = 1; i <= 8; i++) {
            const divSelect = document.getElementById(`pb${i}Div`);
            if (divSelect && i !== 7) { // PB7 has no divider
                divSelect.addEventListener('change', calculatePBCLK);
            }
            
            const enableCheckbox = document.getElementById(`pb${i}Enable`);
            if (enableCheckbox) {
                enableCheckbox.addEventListener('change', calculatePBCLK);
            }
        }
        
        // Update config preview on any change
        document.querySelectorAll('select, input').forEach(el => {
            el.addEventListener('change', updateConfigPreview);
        });
        
        // Buttons
        document.getElementById('ok').addEventListener('click', handleOK);
        document.getElementById('cancel').addEventListener('click', handleCancel);
        document.getElementById('loadScheme').addEventListener('click', handleLoadScheme);
        document.getElementById('saveScheme').addEventListener('click', handleSaveScheme);
        document.getElementById('default').addEventListener('click', handleDefault);
    }
    
    function handleInit(message) {
        deviceName = message.deviceName;
        deviceFamily = message.deviceFamily;
        constraints = message.constraints;
        currentConfig = message.config;
        
        // Set device name
        document.getElementById('deviceName').textContent = deviceName;
        
        // Show/hide PBCLK section based on device family
        const isPIC32MZ = deviceName.startsWith('32MZ');
        console.log('[ConfigEditor] Device:', deviceName, 'isPIC32MZ:', isPIC32MZ);
        
        const pbclkSection = document.getElementById('pbclkSection');
        console.log('[ConfigEditor] PBCLK section element:', pbclkSection);
        
        if (pbclkSection) {
            pbclkSection.style.display = isPIC32MZ ? 'block' : 'none';
            console.log('[ConfigEditor] Set PBCLK display to:', pbclkSection.style.display);
        } else {
            console.error('[ConfigEditor] PBCLK section not found in DOM!');
        }
        
        // Populate dropdown options based on constraints
        populateDropdown('pllInputDiv', constraints.pllInputDiv, 'DIV_');
        populateDropdown('pllMultiplier', constraints.pllMultiplier, 'MUL_');
        populateDropdown('pllOutputDiv', constraints.pllOutputDiv, 'DIV_');
        
        // Load config into UI
        loadConfigIntoUI(currentConfig);
    }
    
    function populateDropdown(elementId, values, prefix) {
        const select = document.getElementById(elementId);
        select.innerHTML = '';
        
        values.forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = `${prefix}${value}`;
            select.appendChild(option);
        });
    }
    
    function loadConfigIntoUI(config) {
        currentConfig = config;
        
        // PLL settings
        document.getElementById('pllInputDiv').value = config.pll.inputDiv;
        document.getElementById('pllMultiplier').value = config.pll.multiplier;
        document.getElementById('pllOutputDiv').value = config.pll.outputDiv;
        
        // Oscillator settings
        document.getElementById('oscSelection').value = config.oscillator.selection || 'SPLL';
        document.getElementById('oscMode').value = config.oscillator.primary.type;
        document.getElementById('oscFrequency').value = config.oscillator.primary.frequency / 1000000;
        
        // Clock settings
        document.getElementById('pbDiv').value = config.clock.peripheralDiv;
        document.getElementById('fcksm').value = config.clock.fcksm || 'CSDCMD';
        document.getElementById('fsoscen').value = config.clock.fsoscen || 'OFF';
        document.getElementById('ieso').value = config.clock.ieso || 'OFF';
        document.getElementById('osciofnc').value = config.clock.osciofnc || 'OFF';
        
        // Watchdog
        document.getElementById('wdtEnable').value = config.watchdog.enabled ? 'ON' : 'OFF';
        document.getElementById('wdtPostscaler').value = config.watchdog.postscaler;
        document.getElementById('windis').value = config.watchdog.windis || 'OFF';
        document.getElementById('fwdtwinsz').value = config.watchdog.fwdtwinsz || 'WINSZ_25';
        
        // Debug
        document.getElementById('debugEnable').value = config.debug.enabled ? 'ON' : 'OFF';
        document.getElementById('jtagen').value = config.debug.jtagen || 'OFF';
        document.getElementById('icesel').value = config.debug.icesel;
        
        // Protection
        document.getElementById('pwp').value = config.protection.pwp || 'OFF';
        document.getElementById('bwp').value = config.protection.bwp || 'OFF';
        document.getElementById('codeProtect').value = config.protection.codeProtect ? 'ON' : 'OFF';
        
        // PBCLK settings (PIC32MZ only)
        if (config.clock.peripheralBuses) {
            for (let i = 1; i <= 8; i++) {
                const bus = config.clock.peripheralBuses[`pb${i}`];
                if (bus) {
                    const divSelect = document.getElementById(`pb${i}Div`);
                    if (divSelect && i !== 7) { // PB7 has no divider
                        divSelect.value = bus.divider;
                    }
                    
                    const enableCheckbox = document.getElementById(`pb${i}Enable`);
                    if (enableCheckbox) {
                        enableCheckbox.checked = bus.enabled;
                    }
                }
            }
        }
        
        // Calculate and display clock
        calculateClock();
        calculatePBCLK();
    }
    
    function calculateClock() {
        const oscFreqMHz = parseFloat(document.getElementById('oscFrequency').value);
        const inputDiv = parseInt(document.getElementById('pllInputDiv').value);
        const multiplier = parseInt(document.getElementById('pllMultiplier').value);
        const outputDiv = parseInt(document.getElementById('pllOutputDiv').value);
        
        if (isNaN(oscFreqMHz) || isNaN(inputDiv) || isNaN(multiplier) || isNaN(outputDiv)) {
            document.getElementById('clockFrequency').value = '0.000000';
            return;
        }
        
        // PLL Calculation: (Crystal ÷ InputDiv) × Multiplier ÷ OutputDiv
        const inputFreqMHz = oscFreqMHz / inputDiv;
        const vcoFreqMHz = inputFreqMHz * multiplier;
        const systemFreqMHz = vcoFreqMHz / outputDiv;
        
        // Check if result is a whole number (no fractional MHz)
        const hasRemainder = !Number.isInteger(systemFreqMHz);
        
        // Validate against max clock
        const isPIC32MZ = deviceName.startsWith('32MZ');
        const maxClockMHz = isPIC32MZ ? 200 : (deviceName.match(/32MX[34]/) ? 120 : 80);
        
        // Always display the calculated value
        document.getElementById('clockFrequency').value = systemFreqMHz.toFixed(6);
        
        // Show in red if invalid (has remainder or exceeds max)
        if (systemFreqMHz > maxClockMHz || hasRemainder) {
            document.getElementById('clockFrequency').style.color = 'red';
        } else {
            document.getElementById('clockFrequency').style.color = '#000';
        }
        
        // Validate PLL input frequency (4-5 MHz for MX, 5-10 MHz for MZ)
        if (isPIC32MZ) {
            if (inputFreqMHz < 5 || inputFreqMHz > 10) {
                document.getElementById('clockFrequency').style.color = 'red';
            }
        } else {
            if (inputFreqMHz < 4 || inputFreqMHz > 5) {
                document.getElementById('clockFrequency').style.color = 'red';
            }
        }
        
        // Update PBCLK labels and config preview
        calculatePBCLK();
        updateConfigPreview();
    }
    
    function calculatePBCLK() {
        // Only for PIC32MZ devices
        if (!deviceName.startsWith('32MZ')) {
            return;
        }
        
        // Get system clock frequency
        const systemFreqMHz = parseFloat(document.getElementById('clockFrequency').value);
        
        if (isNaN(systemFreqMHz) || systemFreqMHz === 0) {
            return;
        }
        
        // Calculate each PBCLK frequency (PB1-PB7 only)
        for (let i = 1; i <= 7; i++) {
            const freqSpan = document.getElementById(`pb${i}Freq`);
            if (!freqSpan) {
                continue;
            }
            
            let pbclkMHz;
            
            if (i === 7) {
                // PBCLK7 has no divider - always equals SYSCLK
                pbclkMHz = systemFreqMHz;
            } else {
                // Get divider value
                const divSelect = document.getElementById(`pb${i}Div`);
                if (!divSelect) {
                    continue;
                }
                
                const divider = parseInt(divSelect.value);
                if (isNaN(divider)) {
                    continue;
                }
                
                // Formula: PBCLK = SYSCLK / (divider + 1)
                pbclkMHz = systemFreqMHz / (divider + 1);
            }
            
            // Check if result is a whole number
            const hasRemainder = !Number.isInteger(pbclkMHz);
            
            // Display frequency
            freqSpan.textContent = `${pbclkMHz.toFixed(0)} MHz`;
            
            // Validate: show red if fractional or exceeds 100MHz
            if (hasRemainder || pbclkMHz > 100) {
                freqSpan.className = 'pbclk-freq invalid';
            } else {
                freqSpan.className = 'pbclk-freq';
            }
        }
    }
    
    function updateConfigPreview() {
        const clockFreq = parseFloat(document.getElementById('clockFrequency').value);
        
        if (isNaN(clockFreq) || clockFreq === 0) {
            document.getElementById('configPreview').value = 'Invalid configuration';
            return;
        }
        
        // Generate preview text (simplified - actual values calculated by backend)
        const isPIC32MZ = deviceName.startsWith('32MZ');
        
        let preview = 'DEVCFG3 : #1FC02FF0 : 0xC7070000\n';
        preview += 'DEVCFG2 : #1FC02FF4 : 0x00000151\n';
        preview += 'DEVCFG1 : #1FC02FF9 : 0x0014C503\n';
        preview += 'DEVCFG0 : #1FC02FFC : 0x110FF00F';
        
        document.getElementById('configPreview').value = preview;
    }
    
    function getCurrentConfig() {
        const oscFreqHz = parseFloat(document.getElementById('oscFrequency').value) * 1000000;
        const systemFreqHz = parseFloat(document.getElementById('clockFrequency').value) * 1000000;
        
        const config = {
            device: deviceName,
            compiler: currentConfig.compiler,
            oscillator: {
                selection: document.getElementById('oscSelection').value,
                primary: {
                    type: document.getElementById('oscMode').value,
                    frequency: oscFreqHz
                },
                secondary: {
                    enabled: document.getElementById('fsoscen').value === 'ON'
                }
            },
            pll: {
                inputDiv: parseInt(document.getElementById('pllInputDiv').value),
                multiplier: parseInt(document.getElementById('pllMultiplier').value),
                outputDiv: parseInt(document.getElementById('pllOutputDiv').value),
                usbInputDiv: 2,
                usbEnabled: false
            },
            clock: {
                systemFrequency: systemFreqHz,
                peripheralDiv: parseInt(document.getElementById('pbDiv').value),
                switchingEnabled: false,
                fcksm: document.getElementById('fcksm').value,
                fsoscen: document.getElementById('fsoscen').value,
                ieso: document.getElementById('ieso').value,
                osciofnc: document.getElementById('osciofnc').value
            },
            watchdog: {
                enabled: document.getElementById('wdtEnable').value === 'ON',
                postscaler: document.getElementById('wdtPostscaler').value,
                windis: document.getElementById('windis').value,
                fwdtwinsz: document.getElementById('fwdtwinsz').value
            },
            debug: {
                enabled: document.getElementById('debugEnable').value === 'ON',
                jtagen: document.getElementById('jtagen').value,
                icesel: document.getElementById('icesel').value
            },
            protection: {
                codeProtect: document.getElementById('codeProtect').value === 'ON',
                writeProtect: false,
                pwp: document.getElementById('pwp').value,
                bwp: document.getElementById('bwp').value
            },
            interrupts: deviceName.startsWith('32MX') ? {
                mode: 'multi',
                shadowRegisters: true,
                srsCount: 7,
                vectorSpacing: 32,
                ebase: '0x9FC01000'
            } : undefined
        };
        
        // Add PBCLK settings for PIC32MZ
        if (deviceName.startsWith('32MZ')) {
            config.clock.peripheralBuses = {
                pb1: {
                    enabled: true, // PB1 always enabled
                    divider: parseInt(document.getElementById('pb1Div').value)
                },
                pb2: {
                    enabled: document.getElementById('pb2Enable').checked,
                    divider: parseInt(document.getElementById('pb2Div').value)
                },
                pb3: {
                    enabled: document.getElementById('pb3Enable').checked,
                    divider: parseInt(document.getElementById('pb3Div').value)
                },
                pb4: {
                    enabled: document.getElementById('pb4Enable').checked,
                    divider: parseInt(document.getElementById('pb4Div').value)
                },
                pb5: {
                    enabled: document.getElementById('pb5Enable').checked,
                    divider: parseInt(document.getElementById('pb5Div').value)
                },
                pb6: {
                    enabled: document.getElementById('pb6Enable').checked,
                    divider: parseInt(document.getElementById('pb6Div').value)
                },
                pb7: {
                    enabled: true, // PB7 always enabled
                    divider: 0 // PB7 has no divider
                },
                pb8: {
                    enabled: document.getElementById('pb8Enable').checked,
                    divider: parseInt(document.getElementById('pb8Div').value)
                }
            };
        }
        
        return config;
    }
    
    function handleOK() {
        console.log('[ConfigEditor] OK button clicked');
        const config = getCurrentConfig();
        console.log('[ConfigEditor] Config object:', JSON.stringify(config, null, 2));
        
        // Validate before saving
        if (isNaN(config.clock.systemFrequency) || config.clock.systemFrequency === 0) {
            console.error('[ConfigEditor] Invalid clock frequency:', config.clock.systemFrequency);
            alert('Invalid clock configuration. Please check your PLL settings.');
            return;
        }
        
        console.log('[ConfigEditor] Sending saveConfig message');
        vscode.postMessage({
            type: 'saveConfig',
            config: config
        });
        console.log('[ConfigEditor] Message sent');
    }
    
    function handleCancel() {
        vscode.postMessage({ type: 'cancel' });
    }
    
    function handleLoadScheme() {
        vscode.postMessage({ type: 'loadScheme' });
    }
    
    function handleSaveScheme() {
        const config = getCurrentConfig();
        vscode.postMessage({
            type: 'saveScheme',
            config: config
        });
    }
    
    function handleDefault() {
        vscode.postMessage({ type: 'resetDefault' });
    }
})();
