/**
 * Configuration Editor Frontend Logic
 * Clock calculator, validation, and device communication
 */

(function() {
    const vscode = acquireVsCodeApi();

    let currentConfig = null;
    let deviceName = '';

    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', () => {
        initializeEventListeners();
        vscode.postMessage({ type: 'ready' });
    });

    // Handle messages from extension
    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
            case 'init':       handleInit(message);              break;
            case 'loadedConfig': loadConfigIntoUI(message.config); break;
        }
    });

    function initializeEventListeners() {
        // PLL and oscillator — real HTML IDs from configEditor.ts template
        document.getElementById('pllInputDiv').addEventListener('change', calculateClock);
        document.getElementById('pllMultiplier').addEventListener('change', calculateClock);
        document.getElementById('pllOutputDiv').addEventListener('change', calculateClock);
        document.getElementById('oscFrequency').addEventListener('input',  calculateClock);
        document.getElementById('oscMode').addEventListener('change',      calculateClock);
        
        // PBCLK dividers: PIC32MZ EF buses pb1-pb5, pb7, pb8 (no pb6 on EF family)
        for (const i of [1, 2, 3, 4, 5, 7, 8]) {
            const divSelect = document.getElementById(`pb${i}`);
            if (divSelect) { divSelect.addEventListener('change', calculatePBCLK); }
            const cb = document.getElementById(`pb${i}Enable`);
            if (cb) { cb.addEventListener('change', calculatePBCLK); }
        }

        // Buttons
        document.getElementById('ok').addEventListener('click', handleOK);
        document.getElementById('cancel').addEventListener('click', handleCancel);
        document.getElementById('loadScheme').addEventListener('click', handleLoadScheme);
        document.getElementById('saveScheme').addEventListener('click', handleSaveScheme);
        document.getElementById('default').addEventListener('click', handleDefault);
    }
    
    function handleInit(message) {
        deviceName    = message.deviceName;
        currentConfig = message.config;

        document.getElementById('deviceName').textContent = deviceName;

        const pbclkSection = document.getElementById('pbclkSection');
        if (pbclkSection) {
            pbclkSection.style.display = deviceName.startsWith('32MZ') ? 'block' : 'none';
        }

        // Populate PLL dropdowns from constraints
        populateDropdown('pllInputDiv',  message.constraints.pllInputDiv,  'DIV_');
        populateDropdown('pllMultiplier', message.constraints.pllMultiplier, 'MUL_');
        populateDropdown('pllOutputDiv', message.constraints.pllOutputDiv,  'DIV_');

        loadConfigIntoUI(message.config);
    }
    
    function populateDropdown(id, values, prefix) {
        const sel = document.getElementById(id);
        if (!sel) { return; }
        sel.innerHTML = '';
        values.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v;
            opt.textContent = `${prefix}${v}`;
            sel.appendChild(opt);
        });
    }
    
    function loadConfigIntoUI(config) {
        currentConfig = config;

        // PLL
        document.getElementById('pllInputDiv').value  = config.pll.inputDiv;
        document.getElementById('pllMultiplier').value = config.pll.multiplier;
        document.getElementById('pllOutputDiv').value  = config.pll.outputDiv;

        // Oscillator
        document.getElementById('oscSelection').value = config.oscillator.selection || 'SPLL';
        document.getElementById('oscMode').value      = config.oscillator.primary.type;
        document.getElementById('oscFrequency').value = config.oscillator.primary.frequency / 1000000;

        // Clock
        document.getElementById('pbDiv').value    = config.clock.peripheralDiv;
        document.getElementById('fcksm').value    = config.clock.fcksm    || 'CSDCMD';
        document.getElementById('fsoscen').value  = config.clock.fsoscen  || 'OFF';
        document.getElementById('ieso').value     = config.clock.ieso     || 'OFF';
        document.getElementById('osciofnc').value = config.clock.osciofnc || 'OFF';

        // Watchdog
        document.getElementById('wdtEnable').value    = config.watchdog.enabled ? 'ON' : 'OFF';
        document.getElementById('wdtPostscaler').value = config.watchdog.postscaler || 'PS1048576';
        document.getElementById('windis').value        = config.watchdog.windis    || 'OFF';
        document.getElementById('fwdtwinsz').value     = config.watchdog.fwdtwinsz || 'WINSZ_25';

        // Debug
        document.getElementById('debugEnable').value = config.debug.enabled ? 'ON' : 'OFF';
        document.getElementById('jtagen').value      = config.debug.jtagen  || 'OFF';
        document.getElementById('icesel').value      = config.debug.icesel  || 'ICS_PGx2';

        // Protection
        document.getElementById('pwp').value         = config.protection.pwp || 'OFF';
        document.getElementById('bwp').value         = config.protection.bwp || 'OFF';
        document.getElementById('codeProtect').value = config.protection.codeProtect ? 'ON' : 'OFF';

        // PBCLK (PIC32MZ EF) — buses pb1-pb5, pb7, pb8; option values 0-7 (PBDIV register)
        if (config.clock.peripheralBuses) {
            for (const i of [1, 2, 3, 4, 5, 7, 8]) {
                const bus = config.clock.peripheralBuses[`pb${i}`];
                if (!bus) { continue; }
                const sel = document.getElementById(`pb${i}`);
                if (sel) { sel.value = bus.divider; }
                const cb = document.getElementById(`pb${i}Enable`);
                if (cb) { cb.checked = bus.enabled; }
            }
        }

        // Build settings
        const build = config.build || {};
        const heapEl = document.getElementById('heapSize');
        if (heapEl) { heapEl.value = build.heapSize !== undefined ? build.heapSize : 4096; }
        const stackEl = document.getElementById('stackSize');
        if (stackEl) { stackEl.value = build.stackSize !== undefined ? build.stackSize : 4096; }
        const optEl = document.getElementById('optLevel');
        if (optEl) { optEl.value = build.optLevel !== undefined ? build.optLevel : '2'; }
        const buildTypeRadios = document.querySelectorAll('input[name="buildType"]');
        const buildType = build.buildType || 'Release';
        buildTypeRadios.forEach(r => { r.checked = (r.value === buildType); });

        calculateClock();
    }
    
    function calculateClock() {
        const osc      = parseFloat(document.getElementById('oscFrequency').value);
        const inputDiv = parseInt(document.getElementById('pllInputDiv').value);
        const mult     = parseInt(document.getElementById('pllMultiplier').value);
        const outDiv   = parseInt(document.getElementById('pllOutputDiv').value);
        const freqEl   = document.getElementById('clockFrequency');

        if (isNaN(osc) || isNaN(inputDiv) || isNaN(mult) || isNaN(outDiv) || outDiv === 0) {
            freqEl.value = '0';
            freqEl.style.color = 'red';
            return;
        }

        // (Crystal / inputDiv) * multiplier / outputDiv
        const pllIn    = osc / inputDiv;
        const sysclkMHz = pllIn * mult / outDiv;

        const isPIC32MZ  = deviceName.startsWith('32MZ');
        const maxMHz     = isPIC32MZ ? 200 : (deviceName.match(/32MX[34]/) ? 120 : 80);
        const fractional = !Number.isInteger(sysclkMHz);
        const pllInOK    = isPIC32MZ ? (pllIn >= 5 && pllIn <= 10) : (pllIn >= 4 && pllIn <= 5);
        const invalid    = fractional || sysclkMHz > maxMHz || !pllInOK;

        freqEl.value      = sysclkMHz.toFixed(3);
        freqEl.style.color = invalid ? 'red' : '';

        calculatePBCLK();
    }
    
    function calculatePBCLK() {
        if (!deviceName.startsWith('32MZ')) { return; }

        // clockFrequency is <input type="text" readonly> — .value works fine
        const sysclkMHz = parseFloat(document.getElementById('clockFrequency').value);
        if (!sysclkMHz || sysclkMHz === 0) { return; }

        // PIC32MZ EF buses: pb1-pb5, pb7, pb8 (no pb6)
        for (const i of [1, 2, 3, 4, 5, 7, 8]) {
            const freqSpan = document.getElementById(`pb${i}Freq`);
            if (!freqSpan) { continue; }
            const sel = document.getElementById(`pb${i}`);
            if (!sel) { continue; }
            // Option values are 0-7 (0-indexed PBDIV register): 0=÷1, 1=÷2, ...
            const divisor = parseInt(sel.value);
            if (isNaN(divisor)) { continue; }
            const pbMHz = sysclkMHz / (divisor + 1);
            const fractional = !Number.isInteger(pbMHz);
            freqSpan.textContent = `${pbMHz.toFixed(0)} MHz`;
            freqSpan.className   = (fractional || pbMHz > 100) ? 'pbclk-freq invalid' : 'pbclk-freq';
        }
    }
    
    
    function getCurrentConfig() {
        const oscHz    = parseFloat(document.getElementById('oscFrequency').value) * 1e6;
        // clockFrequency is <input type="text" readonly> so .value works
        const sysclkHz = parseFloat(document.getElementById('clockFrequency').value) * 1e6;

        const config = {
            device:   deviceName,
            compiler: currentConfig ? currentConfig.compiler : 'xc32',
            oscillator: {
                selection: document.getElementById('oscSelection').value,
                primary: {
                    type:      document.getElementById('oscMode').value,
                    frequency: oscHz
                },
                secondary: {
                    enabled: document.getElementById('fsoscen').value === 'ON'
                }
            },
            pll: {
                inputDiv:    parseInt(document.getElementById('pllInputDiv').value),
                multiplier:  parseInt(document.getElementById('pllMultiplier').value),
                outputDiv:   parseInt(document.getElementById('pllOutputDiv').value),
                usbInputDiv: 2,
                usbEnabled:  false
            },
            clock: {
                systemFrequency:  sysclkHz,
                peripheralDiv:    parseInt(document.getElementById('pbDiv').value),
                switchingEnabled: false,
                fcksm:    document.getElementById('fcksm').value,
                fsoscen:  document.getElementById('fsoscen').value,
                ieso:     document.getElementById('ieso').value,
                osciofnc: document.getElementById('osciofnc').value
            },
            watchdog: {
                enabled:    document.getElementById('wdtEnable').value === 'ON',
                postscaler: document.getElementById('wdtPostscaler').value,
                windis:     document.getElementById('windis').value,
                fwdtwinsz:  document.getElementById('fwdtwinsz').value
            },
            debug: {
                enabled: document.getElementById('debugEnable').value === 'ON',
                jtagen:  document.getElementById('jtagen').value,
                icesel:  document.getElementById('icesel').value
            },
            protection: {
                codeProtect:  document.getElementById('codeProtect').value === 'ON',
                writeProtect: false,
                pwp: document.getElementById('pwp').value,
                bwp: document.getElementById('bwp').value
            },
            interrupts: deviceName.startsWith('32MX') ? {
                mode: 'multi', shadowRegisters: true, srsCount: 7,
                vectorSpacing: 32, ebase: '0x9FC01000'
            } : undefined
        };

        // PBCLK for PIC32MZ EF — buses pb1-pb5, pb7, pb8; option values 0-7 (PBDIV register)
        if (deviceName.startsWith('32MZ')) {
            config.clock.peripheralBuses = {};
            for (const i of [1, 2, 3, 4, 5, 7, 8]) {
                const cbEl  = document.getElementById(`pb${i}Enable`);
                const selEl = document.getElementById(`pb${i}`);
                config.clock.peripheralBuses[`pb${i}`] = {
                    // pb1 has no ON bit (always on), all others have enable checkbox
                    enabled: (i === 1) ? true : (cbEl ? cbEl.checked : true),
                    divider: selEl ? parseInt(selEl.value) : 0
                };
            }
        }

        // Build settings
        const heapEl  = document.getElementById('heapSize');
        const stackEl = document.getElementById('stackSize');
        const optEl   = document.getElementById('optLevel');
        const buildTypeEl = document.querySelector('input[name="buildType"]:checked');
        config.build = {
            heapSize:  heapEl  ? parseInt(heapEl.value)  : 4096,
            stackSize: stackEl ? parseInt(stackEl.value) : 4096,
            optLevel:  optEl   ? optEl.value             : '2',
            buildType: buildTypeEl ? buildTypeEl.value   : 'Release'
        };

        return config;
    }
    
    function handleOK() {
        const config = getCurrentConfig();
        if (isNaN(config.clock.systemFrequency) || config.clock.systemFrequency === 0) {
            alert('Invalid clock configuration. Please check your PLL settings.');
            return;
        }
        vscode.postMessage({ type: 'saveConfig', config });
    }

    function handleCancel()    { vscode.postMessage({ type: 'cancel' }); }
    function handleLoadScheme() { vscode.postMessage({ type: 'loadScheme' }); }
    function handleSaveScheme() { vscode.postMessage({ type: 'saveScheme', config: getCurrentConfig() }); }
    function handleDefault()    { vscode.postMessage({ type: 'resetDefault' }); }

})();
