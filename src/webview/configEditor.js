/**
 * Configuration Editor Frontend Logic
 * Clock calculator, validation, and device communication
 */

(function() {
    const vscode = acquireVsCodeApi();

    let currentConfig = null;
    let deviceName = '';
    let currentCompiler = 'XC32';
    let deviceMaxMHz = 200; // overridden from constraints on init
    let deviceCaps = {};   // peripheral capabilities from backend
    let libraryCategories = []; // library catalog from mikroc-libraries.json

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

        // CORETIMER peripheral sub-options show/hide
        const ctEnabled  = document.getElementById('ctEnabled');
        const ctInterrupt = document.getElementById('ctEnableInterrupt');
        const ctPeriodic  = document.getElementById('ctPeriodic');
        if (ctEnabled)   { ctEnabled.addEventListener('change',   updateCoretimerUI); }
        if (ctInterrupt) { ctInterrupt.addEventListener('change', updateCoretimerUI); }
        if (ctPeriodic)  { ctPeriodic.addEventListener('change',  updateCoretimerUI); }

        // Buttons
        document.getElementById('ok').addEventListener('click', handleOK);
        document.getElementById('cancel').addEventListener('click', handleCancel);
        document.getElementById('loadScheme').addEventListener('click', handleLoadScheme);
        document.getElementById('saveScheme').addEventListener('click', handleSaveScheme);
        document.getElementById('default').addEventListener('click', handleDefault);
    }
    
    function handleInit(message) {
        deviceName      = message.deviceName;
        currentConfig   = message.config;
        currentCompiler = message.compiler || 'XC32';

        deviceCaps = message.deviceCaps || {};
        libraryCategories = message.libraryCategories || [];

        document.getElementById('deviceName').textContent = deviceName;

        const pbclkSection = document.getElementById('pbclkSection');
        if (pbclkSection) {
            pbclkSection.style.display = deviceName.startsWith('32MZ') ? 'block' : 'none';
        }

        // Show library section for MikroC; show config registers + peripherals for XC32
        const libSection        = document.getElementById('librarySection');
        const peripheralSection = document.getElementById('peripheralSection');
        const cfgRegs           = document.getElementById('configRegistersSection');
        if (currentCompiler === 'MikroC') {
            if (libSection)        { libSection.style.display        = 'block'; }
            if (peripheralSection) { peripheralSection.style.display = 'none';  }
            if (cfgRegs)           { cfgRegs.style.display           = 'none';  }
            // Render dynamic library browser once caps + catalog are set
            renderLibraryBrowser();
        } else {
            if (libSection)        { libSection.style.display        = 'none';  }
            if (peripheralSection) { peripheralSection.style.display = 'block'; }
            if (cfgRegs)           { cfgRegs.style.display           = 'block'; }
        }

        // Store max clock from constraints (single source of truth from configEditor.ts)
        if (message.constraints.maxSystemClock) {
            deviceMaxMHz = message.constraints.maxSystemClock / 1e6;
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

        // Library checkboxes (MikroC)
        const selectedLibs = Array.isArray(config.libraries) ? config.libraries : [];
        document.querySelectorAll('input[name="lib"]').forEach(cb => {
            cb.checked = selectedLibs.includes(cb.value);
        });

        // Coretimer peripheral sub-options
        const ct = (config.peripheralConfig || {}).coretimer || {};
        const ctEnabledEl   = document.getElementById('ctEnabled');
        const ctIntEl       = document.getElementById('ctEnableInterrupt');
        const ctPeriodicEl  = document.getElementById('ctPeriodic');
        const ctPeriodMsEl  = document.getElementById('ctPeriodMs');
        const ctStopDebugEl = document.getElementById('ctStopDebug');
        if (ctEnabledEl)   { ctEnabledEl.checked   = (config.peripherals || []).includes('coretimer'); }
        if (ctIntEl)       { ctIntEl.checked        = ct.enableInterrupt   ?? true; }
        if (ctPeriodicEl)  { ctPeriodicEl.checked   = ct.periodicInterrupt ?? true; }
        if (ctPeriodMsEl)  { ctPeriodMsEl.value     = ct.periodMs          ?? 1; }
        if (ctStopDebugEl) { ctStopDebugEl.checked  = ct.stopInDebug       ?? false; }
        updateCoretimerUI();

        calculateClock();
    }

    function updateCoretimerUI() {
        const ctEnabled  = document.getElementById('ctEnabled')?.checked;
        const optDiv     = document.getElementById('coretimerOptions');
        if (optDiv) { optDiv.style.display = ctEnabled ? 'block' : 'none'; }

        const intEnabled  = document.getElementById('ctEnableInterrupt')?.checked;
        const periodicRow = document.getElementById('ctPeriodicRow');
        if (periodicRow) { periodicRow.style.display = intEnabled ? 'block' : 'none'; }

        const periodic    = document.getElementById('ctPeriodic')?.checked;
        const periodMsRow = document.getElementById('ctPeriodMsRow');
        if (periodMsRow) { periodMsRow.style.display = periodic ? 'flex' : 'none'; }
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
        // maxMHz comes from constraints sent by configEditor.ts (single source of truth)
        const maxMHz     = deviceMaxMHz;
        const fractional = !Number.isInteger(sysclkMHz);
        const pllInOK    = isPIC32MZ ? (pllIn >= 5 && pllIn <= 10) : (pllIn >= 4 && pllIn <= 5);
        const invalid    = fractional || sysclkMHz > maxMHz || !pllInOK;

        freqEl.value      = sysclkMHz.toFixed(3);
        freqEl.style.color = invalid ? 'red' : '';

        calculatePBCLK();
        calculateCoretimerFreq();
    }

    function calculateCoretimerFreq() {
        const sysclkMHz = parseFloat(document.getElementById('clockFrequency').value);
        const ctFreqEl  = document.getElementById('ctFreqHz');
        if (!ctFreqEl) { return; }
        if (!sysclkMHz || sysclkMHz === 0) { ctFreqEl.textContent = '--'; return; }
        ctFreqEl.textContent = Math.round(sysclkMHz * 1e6 / 2).toLocaleString();
    }
    
    function calculatePBCLK() {
        if (!deviceName.startsWith('32MZ')) { return; }

        // clockFrequency is <input type="text" readonly> — .value works fine
        const sysclkMHz = parseFloat(document.getElementById('clockFrequency').value);
        if (!sysclkMHz || sysclkMHz === 0) { return; }

        // Show SYSCLK in the PBCLK section heading
        const sysclkLabel = document.getElementById('pbclkSysclk');
        if (sysclkLabel) { sysclkLabel.textContent = `SYSCLK: ${sysclkMHz.toFixed(0)} MHz`; }

        // Per-bus max MHz: PB1 (System Bus) and PB8 (USB/CAN/Ethernet) can run at full SYSCLK (200 MHz).
        // PB2-PB5 and PB7 are limited to 100 MHz per DS60001320.
        const busMaxMHz = { 1: 200, 2: 100, 3: 100, 4: 100, 5: 100, 7: 100, 8: 200 };

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
            const maxMHz = busMaxMHz[i] || 100;
            freqSpan.textContent = `${pbMHz.toFixed(0)} MHz`;
            freqSpan.className   = (fractional || pbMHz > maxMHz) ? 'pbclk-freq invalid' : 'pbclk-freq';
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

        // Libraries (MikroC only — collected regardless, backend ignores for XC32)
        config.libraries = [];
        document.querySelectorAll('input[name="lib"]:checked').forEach(cb => {
            config.libraries.push(cb.value);
        });

        // Peripherals (XC32 only — collected regardless, backend ignores for MikroC)
        config.peripherals = [];
        document.querySelectorAll('input[name="peripheral"]:checked').forEach(cb => {
            config.peripherals.push(cb.value);
        });

        // Coretimer peripheral config
        config.peripheralConfig = {
            coretimer: {
                enableInterrupt:   document.getElementById('ctEnableInterrupt')?.checked  ?? true,
                periodicInterrupt: document.getElementById('ctPeriodic')?.checked         ?? true,
                periodMs:          parseInt(document.getElementById('ctPeriodMs')?.value) || 1,
                stopInDebug:       document.getElementById('ctStopDebug')?.checked        ?? false
            }
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

    // ─── Dynamic Library Browser ────────────────────────────────────────────────

    /** Determine if a library's requirements are met by the current device */
    function libMatchesDevice(lib) {
        return lib.requires.every(req => {
            switch (req) {
                case 'usb':               return !!deviceCaps.hasUSB;
                case 'can_internal':      return !!deviceCaps.hasCAN;
                case 'ethernet_internal': return !!deviceCaps.hasEthernet;
                case 'mz':               return !!deviceCaps.isMZ;
                case 'mz_ef':            return !!deviceCaps.isMZ && !!deviceCaps.isEF;
                case 'mx':               return !!deviceCaps.isMX;
                case 'mx12':             return !!deviceCaps.isMX12;
                default:                 return true;
            }
        });
    }

    /** Render the library catalog into #libraryBrowser */
    function renderLibraryBrowser() {
        const container = document.getElementById('libraryBrowser');
        if (!container || !libraryCategories.length) { return; }
        container.innerHTML = '';

        libraryCategories.forEach(cat => {
            const catEl = document.createElement('div');
            catEl.className = 'lib-category';

            // Count how many libraries in this category are applicable
            const applicable = cat.libraries.filter(l => libMatchesDevice(l));
            const total      = cat.libraries.length;

            // Header
            const header = document.createElement('div');
            header.className = 'lib-category-header';
            header.innerHTML =
                `<span class="lib-category-arrow">▶</span>` +
                `<span>${cat.name}</span>` +
                (applicable.length < total
                    ? `<span class="lib-badge">${applicable.length}/${total}</span>`
                    : `<span class="lib-badge" style="background:#4caf50">${total}</span>`);

            const body = document.createElement('div');
            body.className = 'lib-category-body';

            // Toggle expand/collapse
            header.addEventListener('click', () => {
                const expanded = body.classList.toggle('expanded');
                header.querySelector('.lib-category-arrow').classList.toggle('expanded', expanded);
            });

            // Library items
            cat.libraries.forEach(lib => {
                const matches = libMatchesDevice(lib);
                const item = document.createElement('div');
                item.className = 'lib-item' + (matches ? '' : ' not-applicable');
                item.title = matches ? lib.description : `Not available on this device (requires: ${lib.requires.join(', ')})`;

                const cb = document.createElement('input');
                cb.type  = 'checkbox';
                cb.name  = 'lib';
                cb.value = lib.id;
                if (lib.defaultSelected && matches) { cb.checked = true; }

                const nameSpan = document.createElement('span');
                nameSpan.className = 'lib-item-name';
                nameSpan.textContent = lib.displayName;

                item.appendChild(cb);
                item.appendChild(nameSpan);

                // Double-click to open docs
                if (lib.docPage) {
                    item.addEventListener('dblclick', (e) => {
                        e.preventDefault();
                        vscode.postMessage({ type: 'openLibraryDoc', docPage: lib.docPage });
                    });
                    item.title += '\nDouble-click to open documentation';
                }

                body.appendChild(item);
            });

            catEl.appendChild(header);
            catEl.appendChild(body);
            container.appendChild(catEl);
        });
    }

})();
