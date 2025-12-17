        // Variables declared in inline script in HTML:
        // - vscode (from acquireVsCodeApi())
        // - currentConfig
        // - uiSchema
        // - deviceInfo
        // - pinTableData
        
        // Current timer being configured (temporary, before adding to list)
        let timerConfig = {
            frequency: 200,
            pbclk3Div: 2,
            timer: '1',
            period: 1,
            unit: 'ms',
            prescaler: 8,
            prValue: 0,  // Start at 0 - only set when user clicks Calculate
            actualPeriod: 1.0,
            error: 0,
            priority: 7,
            subPriority: 0,
            enableInterrupt: true,
            shadowSet: 'auto'
        };

        // Array of all configured timers (will be passed to backend)
        let configuredTimers = [];

        // System Tab - PBCLK Management
        function updateAllPBCLKFrequencies() {
            const sysclk = parseFloat(document.getElementById('sysclkFreq').value);
            
            // Update all PBCLK frequencies
            for (let i of [1, 2, 3, 4, 5, 7, 8]) {
                const divider = parseInt(document.getElementById(`pbclk${i}Div`).value);
                const freq = sysclk / divider;
                document.getElementById(`pbclk${i}Freq`).textContent = `${freq.toFixed(3)} MHz`;
            }
        }

        // PBCLK button switching
        document.querySelectorAll('.pbclk-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const pbclkNum = btn.dataset.pbclk;
                
                // Update button states
                document.querySelectorAll('.pbclk-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Update panel visibility
                document.querySelectorAll('.pbclk-panel').forEach(p => p.classList.remove('active'));
                document.getElementById(`pbclk${pbclkNum}Panel`).classList.add('active');
            });
        });

        // Add event listeners for SYSCLK and all PBCLK dividers
        document.getElementById('sysclkFreq')?.addEventListener('input', updateAllPBCLKFrequencies);
        for (let i of [1, 2, 3, 4, 5, 7, 8]) {
            document.getElementById(`pbclk${i}Div`)?.addEventListener('input', updateAllPBCLKFrequencies);
        }

        // Initialize PBCLK displays
        setTimeout(updateAllPBCLKFrequencies, 100);

        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                
                // Update tab buttons
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Update tab content
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                document.getElementById(targetTab + 'Tab').classList.add('active');
            });
        });

        // Timer Calculator Functions
        function calculateTimer() {
            // Get PBCLK3 from System tab
            const sysclk = parseFloat(document.getElementById('sysclkFreq')?.value || 200) * 1000000; // Convert MHz to Hz
            const pbclk3Div = parseInt(document.getElementById('pbclk3Div')?.value || 4);
            const frequency = sysclk / pbclk3Div; // PBCLK3 frequency in Hz
            
            const timerNum = document.getElementById('timerNumber').value;
            const period = parseFloat(document.getElementById('timerPeriod').value);
            const unit = document.getElementById('timerPeriodUnit').value;
            const priority = parseInt(document.getElementById('timerPriority').value);
            const subPriority = parseInt(document.getElementById('timerSubPriority').value);
            const prescalerSelection = document.getElementById('timerPrescaler').value;
            
            // Convert period to seconds
            let periodSeconds = period;
            if (unit === 'us') periodSeconds = period / 1000000;
            else if (unit === 'ms') periodSeconds = period / 1000;
            
            // Timer runs at PBCLK3 (SYSCLK / pbclk3Div)
            const timerClock = frequency / pbclk3Div;
            
            // Calculate required ticks
            const requiredTicks = timerClock * periodSeconds;
            
            // Determine if 16-bit or 32-bit timer
            const is16Bit = timerNum.length === 1; // Single digit = 16-bit
            const is32Bit = timerNum.length === 2; // Two digits = 32-bit paired
            
            let bestPrescaler = 1;
            let bestPR = 0;
            let bestError = Infinity;
            
            // Check if manual prescaler is selected
            if (prescalerSelection !== 'auto') {
                // Use manually selected prescaler
                const manualPrescaler = parseInt(prescalerSelection);
                
                // Validate prescaler for timer type
                const validPrescalers = timerNum === '1' ? [1, 8, 64, 256] : [1, 2, 4, 8, 16, 32, 64, 256];
                if (!validPrescalers.includes(manualPrescaler)) {
                    alert(`Prescaler ${manualPrescaler} is not valid for Timer${timerNum}. Valid values: ${validPrescalers.join(', ')}`);
                    return;
                }
                
                const pr = Math.round(requiredTicks / manualPrescaler);
                const maxPR = is16Bit ? 65536 : 4294967296;
                
                if (pr > 0 && pr <= maxPR) {
                    bestPrescaler = manualPrescaler;
                    bestPR = pr;
                    const actualTicks = pr * manualPrescaler;
                    const actualPeriod = actualTicks / timerClock;
                    bestError = Math.abs((actualPeriod - periodSeconds) / periodSeconds) * 100;
                } else {
                    alert(`Period value ${pr} exceeds maximum for ${is16Bit ? '16-bit' : '32-bit'} timer (max: ${maxPR})`);
                    return;
                }
            } else {
                // Auto-calculate best prescaler
                // Timer1 Type A: 1, 8, 64, 256
                // Timer2-9 Type B: 1, 2, 4, 8, 16, 32, 64, 256
                const prescalers = timerNum === '1' ? [1, 8, 64, 256] : [1, 2, 4, 8, 16, 32, 64, 256];
                
                for (const presc of prescalers) {
                    const pr = Math.round(requiredTicks / presc);
                    const maxPR = is16Bit ? 65536 : 4294967296; // 16-bit: 65536, 32-bit: 4294967296
                    
                    if (pr > 0 && pr <= maxPR) {
                        const actualTicks = pr * presc;
                        const actualPeriod = actualTicks / timerClock;
                        const error = Math.abs((actualPeriod - periodSeconds) / periodSeconds) * 100;
                    
                    if (error < bestError) {
                        bestError = error;
                        bestPrescaler = presc;
                        bestPR = pr;
                    }
                }
            }
            } // End of auto-calculation
            
            // Calculate actual period
            const actualTicks = bestPR * bestPrescaler;
            const actualPeriodSeconds = actualTicks / timerClock;
            let actualPeriodDisplay, actualUnit;
            
            if (actualPeriodSeconds < 0.001) {
                actualPeriodDisplay = (actualPeriodSeconds * 1000000).toFixed(3);
                actualUnit = 'μs';
            } else if (actualPeriodSeconds < 1) {
                actualPeriodDisplay = (actualPeriodSeconds * 1000).toFixed(6);
                actualUnit = 'ms';
            } else {
                actualPeriodDisplay = actualPeriodSeconds.toFixed(6);
                actualUnit = 's';
            }
            
            // Update timer config
            timerConfig.frequency = frequency;
            timerConfig.pbclk3Div = pbclk3Div;
            timerConfig.timer = timerNum;
            timerConfig.period = periodSeconds;
            timerConfig.prescaler = bestPrescaler;
            timerConfig.prValue = bestPR;
            timerConfig.actualPeriod = actualPeriodSeconds;
            timerConfig.error = bestError;
            timerConfig.priority = priority;
            timerConfig.subPriority = subPriority;
            timerConfig.enableInterrupt = document.getElementById('timerEnableInterrupt').checked;
            timerConfig.shadowSet = document.getElementById('timerShadowSet').value;
            
            // Update info box
            document.getElementById('timerInfo').style.display = 'block';
            document.getElementById('infoPrescaler').textContent = `1:${bestPrescaler}`;
            document.getElementById('infoPR').textContent = bestPR;
            document.getElementById('infoActual').textContent = `${actualPeriodDisplay} ${actualUnit}`;
            document.getElementById('infoError').textContent = `${bestError.toFixed(4)}%`;
            
            // Show Add Timer button after successful calculation
            document.getElementById('addTimerBtn').style.display = 'block';
            
            // Generate code
            generateTimerCode();
        }

        function generateTimerCode() {
            const { timer, prescaler, prValue, actualPeriod, priority, subPriority, pbclk3Div } = timerConfig;
            const codeFormat = document.getElementById('codeFormat').value;
            let code = '';
            
            // Format actual period display
            let actualDisplay;
            if (actualPeriod < 0.001) {
                actualDisplay = `${(actualPeriod * 1000000).toFixed(3)} us`;
            } else if (actualPeriod < 1) {
                actualDisplay = `${(actualPeriod * 1000).toFixed(3)} ms`;
            } else {
                actualDisplay = `${actualPeriod.toFixed(6)} s`;
            }
            
            // Determine prescaler value for TCKPS bits
            const prescalerMap = {
                1: 0,    // 000
                2: 1,    // 001
                4: 2,    // 010
                8: 3,    // 011
                16: 4,   // 100
                32: 5,   // 101
                64: 6,   // 110
                256: 7   // 111
            };
            const tckps = prescalerMap[prescaler];
            
            if (codeFormat === 'mikroc') {
                code = generateMikroCCode(timer, prescaler, prValue, actualDisplay, tckps, priority);
            } else {
                code = generateHarmonyCode(timer, prescaler, prValue, actualDisplay, tckps, priority, subPriority, pbclk3Div);
            }
            
            document.getElementById('timerCodeOutput').innerHTML = code;
        }

        function generateMikroCCode(timer, prescaler, prValue, actualDisplay, tckps, priority) {
            let code = '';
            
            if (timer === '1') {
                // Timer1 Type A (16-bit only)
                const tckpsHex = (tckps << 4).toString(16).padStart(2, '0');
                const tconValue = `0x80${tckpsHex}`;
                
                code = `<span class="timer-comment">//Timer1</span>
<span class="timer-comment">//Prescaler 1:${prescaler}; PR1 Preload = ${prValue}; Actual Interrupt Time = ${actualDisplay}</span>
 
<span class="timer-comment">//Place/Copy this part in declaration section</span>
void InitTimer1(){
  T1CON\t\t = ${tconValue};
  T1IP0_bit\t = ${(priority & 1) ? 1 : 0};
  T1IP1_bit\t = ${(priority & 2) ? 1 : 0};
  T1IP2_bit\t = ${(priority & 4) ? 1 : 0};
  T1IF_bit\t = 0;
  T1IE_bit\t = 1;
  PR1\t\t = ${prValue};
  TMR1\t\t = 0;
}
 
void Timer1Interrupt() iv IVT_TIMER_1 ilevel ${priority} ics ICS_SRS {
  T1IF_bit\t = 0;
  <span class="timer-comment">//Enter your code here</span> 
}`;
            } else if (timer.length === 2) {
                // 32-bit paired timer
                const evenTimer = timer[0];
                const timerName = `Timer${timer[0]}_${timer[1]}`;
                const tckpsHex = (tckps << 4).toString(16).padStart(2, '0');
                const tconValue = `0x${(0x80 | (tckps << 4) | 0x08).toString(16)}`; // ON + TCKPS + T32
                
                code = `<span class="timer-comment">//${timerName} (32-bit mode)</span>
<span class="timer-comment">//Prescaler 1:${prescaler}; PR${evenTimer} Preload = ${prValue}; Actual Interrupt Time = ${actualDisplay}</span>
 
<span class="timer-comment">//Place/Copy this part in declaration section</span>
void Init${timerName}(){
  T${evenTimer}CON\t\t = ${tconValue};
  T${evenTimer}IP0_bit\t = ${(priority & 1) ? 1 : 0};
  T${evenTimer}IP1_bit\t = ${(priority & 2) ? 1 : 0};
  T${evenTimer}IP2_bit\t = ${(priority & 4) ? 1 : 0};
  T${evenTimer}IF_bit\t = 0;
  T${evenTimer}IE_bit\t = 1;
  PR${evenTimer}\t\t = ${prValue};
  TMR${evenTimer}\t\t = 0;
}
 
void ${timerName}Interrupt() iv IVT_TIMER_${evenTimer} ilevel ${priority} ics ICS_SRS {
  T${evenTimer}IF_bit\t = 0;
  <span class="timer-comment">//Enter your code here</span> 
}`;
            } else {
                // 16-bit Type B timer
                const tckpsHex = (tckps << 4).toString(16).padStart(2, '0');
                const tconValue = `0x80${tckpsHex}`;
                
                code = `<span class="timer-comment">//Timer${timer} (16-bit mode)</span>
<span class="timer-comment">//Prescaler 1:${prescaler}; PR${timer} Preload = ${prValue}; Actual Interrupt Time = ${actualDisplay}</span>
 
<span class="timer-comment">//Place/Copy this part in declaration section</span>
void InitTimer${timer}(){
  T${timer}CON\t\t = ${tconValue};
  T${timer}IP0_bit\t = ${(priority & 1) ? 1 : 0};
  T${timer}IP1_bit\t = ${(priority & 2) ? 1 : 0};
  T${timer}IP2_bit\t = ${(priority & 4) ? 1 : 0};
  T${timer}IF_bit\t = 0;
  T${timer}IE_bit\t = 1;
  PR${timer}\t\t = ${prValue};
  TMR${timer}\t\t = 0;
}
 
void Timer${timer}Interrupt() iv IVT_TIMER_${timer} ilevel ${priority} ics ICS_SRS {
  T${timer}IF_bit\t = 0;
  <span class="timer-comment">//Enter your code here</span> 
}`;
            }
            
            return code;
        }

        function generateHarmonyCode(timer, prescaler, prValue, actualDisplay, tckps, priority, subPriority, pbclk3Div) {
            let code = '';
            const is32Bit = timer.length === 2;
            const timerNum = is32Bit ? timer[0] : timer;
            const timerName = is32Bit ? `${timer[0]}_${timer[1]}` : timer;
            
            // Calculate IPC register and bit positions
            const ipcNum = Math.floor((parseInt(timerNum) - 1) / 4) + 1;
            const ipcShift = ((parseInt(timerNum) - 1) % 4) * 8;
            const priorityBits = (priority << 2) | subPriority;
            const ipcValue = `0x${(priorityBits << ipcShift).toString(16)}`;
            
            // Generate TCON value
            let tconValue;
            if (timer === '1') {
                tconValue = `0x${((tckps << 4)).toString(16)}`;
            } else if (is32Bit) {
                tconValue = `0x${((tckps << 4) | 0x08).toString(16)}`; // T32 bit set
            } else {
                tconValue = `0x${((tckps << 4)).toString(16)}`;
            }
            
            code = `<span class="timer-comment">/* ========= plib_clk.c - Add to CLK_Initialize() ========= */</span>
<span class="timer-comment">/* Peripheral Bus 3 divisor (for timers) */</span>
PB3DIVbits.PBDIV = ${pbclk3Div - 1};

<span class="timer-comment">/* ========= plib_tmr${timerNum}.c ========= */</span>
<span class="timer-comment">// Timer${timerName} Configuration</span>
<span class="timer-comment">// Prescaler 1:${prescaler}; PR${timerNum} = ${prValue}; Period = ${actualDisplay}</span>

void TMR${timer === '1' ? '1' : timerNum}_Initialize(void)
{
    <span class="timer-comment">/* Disable Timer */</span>
    T${timerNum}CONCLR = _T${timerNum}CON_ON_MASK;

    <span class="timer-comment">/* TCKPS = ${tckps}${is32Bit ? ', T32 = 1' : ''} */</span>
    T${timerNum}CONSET = ${tconValue};

    <span class="timer-comment">/* Clear counter */</span>
    TMR${timerNum} = 0x0;

    <span class="timer-comment">/* Set period */</span>
    PR${timerNum} = ${prValue}U;

    <span class="timer-comment">/* Enable TMR Interrupt */</span>
    IEC0SET = _IEC0_T${timerNum}IE_MASK;
}

<span class="timer-comment">/* ========= plib_evic.c - Add to EVIC_Initialize() ========= */</span>
IPC${ipcNum}SET = ${ipcValue}U;  <span class="timer-comment">/* TIMER_${timerNum}: Priority ${priority} / Subpriority ${subPriority} */</span>

<span class="timer-comment">/* ========= interrupts.c ========= */</span>
void __attribute__((used)) TIMER_${timerNum}_InterruptHandler(void)
{
    uint32_t status = IFS0bits.T${timerNum}IF;
    IFS0CLR = _IFS0_T${timerNum}IF_MASK;

    <span class="timer-comment">/* Your code here */</span>
}

<span class="timer-comment">/* Handler declaration */</span>
void __attribute__((used)) __ISR(_TIMER_${timerNum}_VECTOR, ipl${priority}SRS) TIMER_${timerNum}_Handler(void)
{
    TIMER_${timerNum}_InterruptHandler();
}`;
            
            return code;
        }

        function copyTimerCode() {
            const codeElement = document.getElementById('timerCodeOutput');
            const codeText = codeElement.innerText;
            
            navigator.clipboard.writeText(codeText).then(() => {
                const btn = document.getElementById('copyTimerCodeBtn');
                const originalText = btn.textContent;
                btn.textContent = '✓ Copied!';
                setTimeout(() => {
                    btn.textContent = originalText;
                }, 2000);
            });
        }

        // Timer button event listeners
        document.getElementById('calculateTimerBtn')?.addEventListener('click', calculateTimer);
        document.getElementById('addTimerBtn')?.addEventListener('click', addTimerToProject);
        document.getElementById('copyTimerCodeBtn')?.addEventListener('click', copyTimerCode);
        document.getElementById('codeFormat')?.addEventListener('change', generateTimerCode);
        
        // Add timer to configured timers list
        function addTimerToProject() {
            if (timerConfig.prValue === 0) {
                alert('Please calculate timer settings first');
                return;
            }
            
            // Check if timer already exists
            const timerExists = configuredTimers.some(t => t.timer === timerConfig.timer);
            if (timerExists) {
                if (!confirm(`Timer${timerConfig.timer} is already configured. Replace it?`)) {
                    return;
                }
                // Remove existing timer
                configuredTimers = configuredTimers.filter(t => t.timer !== timerConfig.timer);
            }
            
            // Get PBCLK3 frequency
            const sysclk = parseFloat(document.getElementById('sysclkFreq')?.value || 200) * 1000000;
            const pbclk3Div = parseInt(document.getElementById('pbclk3Div')?.value || 4);
            const pbclk3Freq = sysclk / pbclk3Div;
            
            const is32Bit = timerConfig.timer.length === 2;
            
            // Add to configured timers array
            configuredTimers.push({
                timer: timerConfig.timer,
                prescaler: timerConfig.prescaler,
                prValue: timerConfig.prValue,
                priority: timerConfig.priority,
                subPriority: timerConfig.subPriority,
                period: timerConfig.actualPeriod,
                pbclk3Freq: pbclk3Freq,
                mode32Bit: is32Bit,
                enableInterrupt: timerConfig.enableInterrupt,
                shadowSet: timerConfig.shadowSet
            });
            
            // Update UI
            renderConfiguredTimers();
            
            // Reset form and hide Add button
            document.getElementById('addTimerBtn').style.display = 'none';
            document.getElementById('timerInfo').style.display = 'none';
            timerConfig.prValue = 0;
        }
        
        // Render list of configured timers
        function renderConfiguredTimers() {
            const listElement = document.getElementById('configuredTimersList');
            const sectionElement = document.getElementById('configuredTimersSection');
            
            if (configuredTimers.length === 0) {
                sectionElement.style.display = 'none';
                return;
            }
            
            sectionElement.style.display = 'block';
            
            listElement.innerHTML = configuredTimers.map((timer, index) => {
                const timerName = timer.timer.length === 1 ? `Timer${timer.timer}` : `Timer${timer.timer[0]}/${timer.timer[1]}`;
                const periodMs = (timer.period * 1000).toFixed(3);
                const mode = timer.mode32Bit ? '32-bit' : '16-bit';
                
                return `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px; background: #2d2d30; border-radius: 4px;">
                        <div style="flex: 1;">
                            <div style="font-weight: bold; color: #4ec9b0;">${timerName} (${mode})</div>
                            <div style="font-size: 11px; color: #888; margin-top: 2px;">
                                Period: ${periodMs} ms | Prescaler: 1:${timer.prescaler} | PR: ${timer.prValue} | Priority: ${timer.priority}/${timer.subPriority}
                            </div>
                        </div>
                        <button onclick="removeTimer(${index})" style="padding: 4px 8px; background: #c74545; border: none; border-radius: 3px; color: white; cursor: pointer; font-size: 12px;">
                            Remove
                        </button>
                    </div>
                `;
            }).join('');
        }
        
        // Remove timer from configured list
        window.removeTimer = function(index) {
            configuredTimers.splice(index, 1);
            renderConfiguredTimers();
        };
        
        // Toggle interrupt settings visibility
        document.getElementById('timerEnableInterrupt')?.addEventListener('change', function() {
            const interruptSettings = document.getElementById('timerInterruptSettings');
            if (this.checked) {
                interruptSettings.style.display = 'block';
            } else {
                interruptSettings.style.display = 'none';
            }
        });
        
        // Auto-update system SYSCLK when frequency changes (from main config)
        function updateTimerFrequency() {
            const clockFreq = document.getElementById('clockFreq')?.textContent;
            if (clockFreq) {
                const freq = parseFloat(clockFreq);
                document.getElementById('sysclkFreq').value = freq;
                updateAllPBCLKFrequencies();
            }
        }

        // Listen for messages from extension
        // Populate XC32 compiler versions dropdown
        function populateXC32Dropdown(versions) {
            const select = document.getElementById('xc32Version');
            select.innerHTML = '';
            
            // Add versions (already sorted latest first)
            versions.forEach((version, index) => {
                const option = document.createElement('option');
                option.value = version;
                option.textContent = version + (index === 0 ? ' (Latest)' : '');
                if (index === 0) {
                    option.selected = true; // Select latest by default
                }
                select.appendChild(option);
            });
        }

        // Populate DFP versions dropdown
        function populateDFPDropdown(versions) {
            const select = document.getElementById('dfpVersion');
            select.innerHTML = '';
            
            // Add versions (already sorted latest first)
            versions.forEach((version, index) => {
                const option = document.createElement('option');
                option.value = version;
                option.textContent = version + (index === 0 ? ' (Latest)' : '');
                if (index === 0) {
                    option.selected = true; // Select latest by default
                }
                select.appendChild(option);
            });
        }

        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.type) {
                case 'init':
                    deviceInfo = message.deviceInfo;
                    uiSchema = message.uiSchema;
                    currentConfig = message.config || {};
                    ppsInputSignals = message.ppsInputSignals || [];
                    ppsOutputPins = message.ppsOutputPins || [];
                    initializeUI();
                    break;
                case 'updateRegisters':
                    updateRegisterPreview(message.registers);
                    break;
                case 'populateXC32Versions':
                    console.log('Received XC32 versions:', message.versions);
                    populateXC32Dropdown(message.versions);
                    break;
                case 'populateDFPVersions':
                    console.log('Received DFP versions:', message.versions);
                    populateDFPDropdown(message.versions);
                    break;
                case 'pinTableData':
                    // Update pin table with real data from backend
                    console.log('Received pin table data:', message.data);
                    pinTableData = message.data;
                    renderPinTable();
                    break;
                case 'generatedPinCode':
                    // Handle generated code display (could show in a new tab/panel)
                    console.log('Generated code:', message.code);
                    break;
            }
        });

        function initializeUI() {
            // Update header info
            document.getElementById('deviceName').textContent = deviceInfo.name;
            document.getElementById('flashSize').textContent = `${deviceInfo.flashKB} KB`;
            document.getElementById('pinCount').textContent = deviceInfo.pins;
            
            // Request XC32 and DFP versions from extension
            console.log('Requesting XC32 versions...');
            vscode.postMessage({ type: 'getXC32Versions' });
            console.log('Requesting DFP versions for family:', deviceInfo.family);
            vscode.postMessage({ type: 'getDFPVersions', deviceFamily: deviceInfo.family });
            
            // Initialize UART modules dropdown
            populateUartModules();
            
            // Generate settings by category
            const categories = [...new Set(uiSchema.map(s => s.category))];
            const settingsPanel = document.getElementById('settingsPanel');
            settingsPanel.innerHTML = '';

            categories.forEach(category => {
                const section = document.createElement('div');
                section.className = 'category-section';
                
                const title = document.createElement('div');
                title.className = 'category-title';
                title.textContent = category;
                section.appendChild(title);

                const settings = uiSchema.filter(s => s.category === category);
                settings.forEach(setting => {
                    const group = document.createElement('div');
                    group.className = 'setting-group';

                    const label = document.createElement('label');
                    label.className = 'setting-label';
                    label.textContent = setting.name;
                    label.htmlFor = `setting${setting.index}`;
                    group.appendChild(label);

                    const select = document.createElement('select');
                    select.className = 'setting-select';
                    select.id = `setting${setting.index}`;
                    select.dataset.index = setting.index;

                    setting.options.forEach(option => {
                        const opt = document.createElement('option');
                        opt.value = option;
                        opt.textContent = option;
                        if (option === (currentConfig[setting.index] || setting.defaultValue)) {
                            opt.selected = true;
                        }
                        select.appendChild(opt);
                    });

                    select.addEventListener('change', handleSettingChange);
                    group.appendChild(select);
                    section.appendChild(group);
                });

                settingsPanel.appendChild(section);
            });

            // Request initial register calculation
            calculateRegisters();
        }

        function handleSettingChange(event) {
            const index = parseInt(event.target.dataset.index);
            const value = event.target.value;
            currentConfig[index] = value;
            calculateRegisters();
        }

        function calculateRegisters() {
            // Send current config to extension for register calculation
            vscode.postMessage({
                type: 'calculateRegisters',
                config: currentConfig
            });
        }

        function updateRegisterPreview(registers) {
            const registerList = document.getElementById('registerList');
            registerList.innerHTML = Object.entries(registers)
                .map(([name, data]) => `
                    <div class="register-line">
                        <span class="register-name">${name}</span>
                        <span class="register-address">: ${data.address} :</span>
                        <span class="register-value">${data.value}</span>
                    </div>
                `).join('');

            // Update clock frequency if calculated
            if (registers.calculatedClock) {
                document.getElementById('clockFreq').textContent = 
                    registers.calculatedClock.toFixed(6);
                // Update system tab SYSCLK frequency
                document.getElementById('sysclkFreq').value = registers.calculatedClock;
                updateAllPBCLKFrequencies();
            }
        }

        // Button handlers
        document.getElementById('okBtn').addEventListener('click', () => {
            const heapSize = parseInt(document.getElementById('heapSize').value) || 4096;
            const xc32Version = document.getElementById('xc32Version').value;
            const dfpVersion = document.getElementById('dfpVersion').value;
            const useMikroeBootloader = document.getElementById('useMikroeBootloader').checked;
            
            // Pass all configured timers (not the current timerConfig)
            let timerConfigurations = undefined;
            if (configuredTimers.length > 0) {
                timerConfigurations = configuredTimers;
            }
            
            // Include UART configuration if it has been calculated
            let uartConfigurations = undefined;
            if (uartConfig.brgValue > 0) {
                // Get PBCLK2 frequency from System tab
                const sysclk = parseFloat(document.getElementById('sysclkFreq')?.value || 200) * 1000000;
                const pbclk2Div = parseInt(document.getElementById('pbclk2Div')?.value || 2);
                const pbclk2Freq = sysclk / pbclk2Div;
                
                // Map parity/data to UartConfig format
                let parityAndData = '8N';  // Default: 8-bit no parity
                if (uartConfig.dataBits === 9) {
                    parityAndData = '9N';
                } else if (uartConfig.parity === 'even') {
                    parityAndData = '8E';
                } else if (uartConfig.parity === 'odd') {
                    parityAndData = '8O';
                }
                
                uartConfigurations = [{
                    instanceName: `UART${uartConfig.module}`,
                    instanceNum: uartConfig.module,
                    operatingMode: uartConfig.operatingMode,
                    baudRate: uartConfig.baudRate,
                    stopBits: uartConfig.stopBits,
                    parityAndData: parityAndData,
                    highBaudRate: true,  // Always use high-speed mode (BRGH=1, 4x)
                    uenSelect: 0,  // Standard configuration
                    clockFreq: pbclk2Freq,
                    rxRingBufferSize: uartConfig.rxBufferSize,
                    txRingBufferSize: uartConfig.txBufferSize
                }];
            }
            
            vscode.postMessage({
                type: 'ok',
                config: currentConfig,
                heapSize: heapSize,
                xc32Version: xc32Version,
                dfpVersion: dfpVersion,
                useMikroeBootloader: useMikroeBootloader,
                timerConfigurations: timerConfigurations,
                uartConfigurations: uartConfigurations
            });
        });

        document.getElementById('cancelBtn').addEventListener('click', () => {
            vscode.postMessage({ type: 'cancel' });
        });

        document.getElementById('saveSchemeBtn').addEventListener('click', () => {
            vscode.postMessage({
                type: 'saveScheme',
                config: currentConfig
            });
        });

        document.getElementById('loadSchemeBtn').addEventListener('click', () => {
            vscode.postMessage({ type: 'loadScheme' });
        });

        document.getElementById('defaultBtn').addEventListener('click', () => {
            vscode.postMessage({ type: 'loadDefaults' });
        });

        // ===========================
        // PIN MANAGER
        // ===========================

        // pinTableData declared in HTML inline script
        let currentPackage = '100-pin';
        let currentEditingPin = null;

        function renderPinTable() {
            const tbody = document.getElementById('pinTableBody');
            if (!tbody) {
                console.error('Pin table body not found');
                return;
            }

            const filterGPIO = document.getElementById('filterGPIO')?.checked ?? true;
            const filterAnalog = document.getElementById('filterAnalog')?.checked ?? true;
            const filterPPS = document.getElementById('filterPPS')?.checked ?? true;
            const filterConfigured = document.getElementById('filterConfigured')?.checked ?? false;

            tbody.innerHTML = '';

            if (!pinTableData || pinTableData.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">No pin data available. Waiting for backend...</td></tr>';
                return;
            }

            pinTableData.forEach(pin => {
                // Apply "Configured Only" filter
                if (filterConfigured && pin.mode === 'Not Configured') {
                    return;
                }

                // Apply type filters - if filter is unchecked, skip that type
                let showPin = false;
                
                // Show if GPIO filter is checked and pin is GPIO-capable
                if (filterGPIO && !pin.analogChannel && pin.rpNumber === undefined) {
                    showPin = true;
                }
                
                // Show if Analog filter is checked and pin has analog capability
                if (filterAnalog && pin.analogChannel) {
                    showPin = true;
                }
                
                // Show if PPS filter is checked and pin has PPS capability
                if (filterPPS && pin.rpNumber !== undefined) {
                    showPin = true;
                }

                if (!showPin) {
                    return;
                }

                const row = document.createElement('tr');
                if (pin.mode !== 'Not Configured') {
                    row.classList.add('configured');
                }

                row.innerHTML = `
                    <td class="pin-number">${pin.pinNum}</td>
                    <td class="pin-id">${pin.pinId}</td>
                    <td class="pin-custom-name">${pin.customName || '-'}</td>
                    <td class="pin-function">${pin.function}</td>
                    <td><span class="pin-direction">${pin.direction || '-'}</span></td>
                    <td class="pin-state">${pin.state || '-'}</td>
                    <td>${pin.mode}</td>
                    <td>
                        <button class="config-btn" onclick="openPinConfig('${pin.pinId}')">⚙</button>
                        ${pin.mode !== 'Not Configured' ? `<button class="config-btn" onclick="removePinConfig('${pin.pinId}')" title="Clear Configuration">✖</button>` : ''}
                    </td>
                `;
                tbody.appendChild(row);
            });

            if (tbody.children.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">No pins match the current filters</td></tr>';
            }
        }

        function removePinConfig(pinId) {
            if (confirm(`Clear configuration for pin ${pinId}?`)) {
                vscode.postMessage({
                    type: 'removePinConfiguration',
                    pinName: pinId
                });
            }
        }

        function openPinConfig(pinId) {
            currentEditingPin = pinId;
            const pin = pinTableData.find(p => p.pinId === pinId);
            if (!pin) return;

            document.getElementById('dialogPinName').textContent = `Configure Pin: ${pinId}`;
            document.getElementById('pinCustomName').value = pin.customName || '';
            
            // Populate analog channel if available
            const analogChannelSelect = document.getElementById('analogChannel');
            analogChannelSelect.innerHTML = '<option value="">Select channel...</option>';
            if (pin.analog) {
                analogChannelSelect.innerHTML += `<option value="${pin.analog}">${pin.analog}</option>`;
            }

            // Populate PPS peripherals if available
            const ppsPeripheralSelect = document.getElementById('ppsPeripheral');
            ppsPeripheralSelect.innerHTML = '<option value="">Select peripheral...</option>';
            
            console.log('Pin data:', pin);
            console.log('Pin alternateFunctions:', pin.alternateFunctions);
            console.log('PPS Input Signals count:', ppsInputSignals.length);
            console.log('PPS Output Pins count:', ppsOutputPins.length);
            
            // Find the RP designation (RPxx) from pin's alternateFunctions list (not functions!)
            const rpDesignation = pin.alternateFunctions?.find(f => f.startsWith('RP') && f.length > 2);
            console.log('RP Designation found:', rpDesignation);
            console.log('Pin rpNumber:', pin.rpNumber);
            
            if (rpDesignation && pin.rpNumber !== undefined && ppsInputSignals.length > 0) {
                console.log('Processing PPS options for', rpDesignation, 'with rpNumber', pin.rpNumber);
                
                // Find valid input signals for this RP pin number
                const validInputs = ppsInputSignals.filter(sig => 
                    sig.validRPValues && sig.validRPValues.includes(pin.rpNumber)
                );
                console.log('Valid input signals:', validInputs.length);
                
                if (validInputs.length > 0) {
                    ppsPeripheralSelect.innerHTML += '<optgroup label="Input Functions">';
                    validInputs.forEach(sig => {
                        ppsPeripheralSelect.innerHTML += `<option value="${sig.signalName}">${sig.description} (${sig.signalName})</option>`;
                    });
                    ppsPeripheralSelect.innerHTML += '</optgroup>';
                }
                
                // Find the output pin info using RP designation
                const outputPin = ppsOutputPins.find(p => p.rpPin === rpDesignation);
                console.log('Output pin found:', outputPin);
                
                if (outputPin && outputPin.validPeripherals) {
                    console.log('Output peripherals count:', outputPin.validPeripherals.length);
                    ppsPeripheralSelect.innerHTML += '<optgroup label="Output Functions">';
                    outputPin.validPeripherals.forEach(out => {
                        ppsPeripheralSelect.innerHTML += `<option value="${out.signalName}">${out.description} (${out.signalName})</option>`;
                    });
                    ppsPeripheralSelect.innerHTML += '</optgroup>';
                }
            } else {
                console.log('PPS condition not met:', {
                    hasRpDesignation: !!rpDesignation,
                    hasRpNumber: pin.rpNumber !== undefined,
                    hasPpsInputSignals: ppsInputSignals.length > 0
                });
            }

            document.getElementById('pinConfigDialog').classList.add('active');
        }

        // Pin mode radio buttons
        document.querySelectorAll('input[name="pinMode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const mode = e.target.value;
                document.getElementById('gpioConfigSection').style.display = mode === 'GPIO' ? 'block' : 'none';
                document.getElementById('analogConfigSection').style.display = mode === 'Analog' ? 'block' : 'none';
                document.getElementById('ppsConfigSection').style.display = mode === 'Peripheral' ? 'block' : 'none';
            });
        });

        // Direction radio buttons - show/hide initial state
        document.querySelectorAll('input[name="pinDirection"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const isOutput = e.target.value === 'Output';
                document.getElementById('initialStateGroup').style.display = isOutput ? 'block' : 'none';
            });
        });

        // Dialog buttons
        document.getElementById('dialogCancelBtn').addEventListener('click', () => {
            document.getElementById('pinConfigDialog').classList.remove('active');
        });

        document.getElementById('dialogOkBtn').addEventListener('click', () => {
            if (!currentEditingPin) {
                console.error('No pin selected for editing');
                return;
            }

            const pin = pinTableData.find(p => p.pinId === currentEditingPin);
            if (!pin) {
                console.error('Pin not found:', currentEditingPin);
                return;
            }

            const modeRadio = document.querySelector('input[name="pinMode"]:checked');
            if (!modeRadio) {
                console.error('No pin mode selected');
                return;
            }

            const mode = modeRadio.value;
            const customName = document.getElementById('pinCustomName').value;

            // Build configuration object matching backend PinConfiguration interface
            const config = {
                pinName: currentEditingPin,
                mode: mode
            };

            if (mode === 'GPIO') {
                const directionRadio = document.querySelector('input[name="pinDirection"]:checked');
                if (!directionRadio) {
                    console.error('No direction selected');
                    return;
                }
                const direction = directionRadio.value;
                const initialStateRadio = direction === 'Output' 
                    ? document.querySelector('input[name="pinInitState"]:checked')
                    : null;
                const initialState = initialStateRadio ? initialStateRadio.value : undefined;
                
                // Get checkbox states
                const pullUp = document.getElementById('pinPullUp')?.checked || false;
                const pullDown = document.getElementById('pinPullDown')?.checked || false;
                const openDrain = document.getElementById('pinOpenDrain')?.checked || false;

                config.gpio = {
                    direction: direction,
                    customName: customName,
                    initialState: initialState,
                    pullUp: pullUp,
                    pullDown: pullDown,
                    openDrain: openDrain
                };

                console.log('GPIO config:', config);
            } else if (mode === 'Analog') {
                const channelName = document.getElementById('analogChannel').value;
                if (!channelName) {
                    console.error('No analog channel selected');
                    return;
                }
                config.analog = {
                    channelName: channelName
                };

                console.log('Analog config:', config);
            } else if (mode === 'Peripheral') {
                const peripheral = document.getElementById('ppsPeripheral').value;
                if (!peripheral) {
                    console.error('No peripheral selected');
                    return;
                }
                const isInput = peripheral.includes('RX') || peripheral.includes('SDI') || peripheral.includes('IC');
                
                config.peripheral = {
                    function: peripheral,
                    ppsInputSignal: isInput ? peripheral : undefined,
                    ppsOutputSignal: !isInput ? peripheral : undefined
                };

                console.log('Peripheral config:', config);
            }

            // Send configuration to backend
            console.log('Sending setPinConfiguration:', config);
            vscode.postMessage({
                type: 'setPinConfiguration',
                config: config
            });

            document.getElementById('pinConfigDialog').classList.remove('active');
        });

        // Package selection
        const packageSelect = document.getElementById('pinPackageSelect');
        if (packageSelect) {
            packageSelect.addEventListener('change', (e) => {
                currentPackage = e.target.value;
                console.log('Package changed to:', currentPackage);
                // Send package change to backend
                vscode.postMessage({
                    type: 'changePackage',
                    packageType: currentPackage
                });
            });
        } else {
            console.error('Package select element not found');
        }

        // Filter checkboxes
        ['filterGPIO', 'filterAnalog', 'filterPPS', 'filterConfigured'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => {
                    console.log(`Filter ${id} changed to:`, element.checked);
                    renderPinTable();
                });
            } else {
                console.error(`Filter element ${id} not found`);
            }
        });

        // Close dialog when clicking overlay
        document.getElementById('pinConfigDialog').addEventListener('click', (e) => {
            if (e.target.id === 'pinConfigDialog') {
                document.getElementById('pinConfigDialog').classList.remove('active');
            }
        });

        // Initialize pin table
        renderPinTable();

        // ===========================
        // UART CONFIGURATION
        // ===========================

        let uartConfig = {
            module: '1',
            operatingMode: 'non-blocking',
            baudRate: 115200,
            dataBits: 8,
            parity: 'none',
            stopBits: 1,
            enableRxInterrupt: true,
            enableTxInterrupt: false,
            priority: 3,
            subPriority: 0,
            rxBufferSize: 256,
            txBufferSize: 256,
            brgValue: 0,
            actualBaud: 0,
            error: 0
        };

        // Populate UART modules dropdown based on device
        function populateUartModules() {
            const uartSelect = document.getElementById('uartModule');
            if (!uartSelect) return;

            // Get number of UARTs from device info (this will come from DFP)
            const numUarts = deviceInfo.uartCount || 6; // Default to 6 for PIC32MZ
            
            uartSelect.innerHTML = '';
            for (let i = 1; i <= numUarts; i++) {
                const option = document.createElement('option');
                option.value = i.toString();
                option.textContent = `UART${i}`;
                uartSelect.appendChild(option);
            }
        }

        // Check if UART pins are configured
        function checkUartPinsConfigured() {
            const warning = document.getElementById('uartPinWarning');
            if (!warning) return true;

            // Check if any pins are configured as UART (peripheral mode with U*RX or U*TX)
            const hasUartPins = pinTableData.some(pin => 
                pin.mode === 'Peripheral' && 
                (pin.function.includes('RX') || pin.function.includes('TX'))
            );

            if (!hasUartPins) {
                warning.style.display = 'block';
                return false;
            } else {
                warning.style.display = 'none';
                return true;
            }
        }

        // Calculate BRG value for UART
        function calculateUartBRG() {
            // Get PBCLK2 frequency (UART uses PBCLK2)
            const sysclk = parseFloat(document.getElementById('sysclkFreq')?.value || 200) * 1000000;
            const pbclk2Div = parseInt(document.getElementById('pbclk2Div')?.value || 4);
            const pbclk2Freq = sysclk / pbclk2Div;

            const baudRateSelect = document.getElementById('uartBaudRate').value;
            let baudRate;
            
            if (baudRateSelect === 'custom') {
                baudRate = parseInt(document.getElementById('uartCustomBaud').value);
            } else {
                baudRate = parseInt(baudRateSelect);
            }

            // BRG = (PBCLK2 / (4 * BaudRate)) - 1 (for high-speed mode, BRGH=1)
            const brg = Math.round((pbclk2Freq / (4 * baudRate)) - 1);
            
            // Calculate actual baud rate
            const actualBaud = pbclk2Freq / (4 * (brg + 1));
            const error = Math.abs((actualBaud - baudRate) / baudRate) * 100;

            return {
                pbclk2Freq: pbclk2Freq,
                brg: brg,
                actualBaud: actualBaud,
                error: error
            };
        }

        // Configure UART
        function configureUart() {
            // Check if UART pins are configured
            if (!checkUartPinsConfigured()) {
                alert('⚠ Please configure UART RX and/or TX pins in the Pin Manager tab first!');
                return;
            }

            const module = document.getElementById('uartModule').value;
            const operatingMode = document.getElementById('uartOperatingMode').value;
            const baudRateSelect = document.getElementById('uartBaudRate').value;
            let baudRate;
            
            if (baudRateSelect === 'custom') {
                baudRate = parseInt(document.getElementById('uartCustomBaud').value);
            } else {
                baudRate = parseInt(baudRateSelect);
            }

            const dataBits = parseInt(document.getElementById('uartDataBits').value);
            const parity = document.getElementById('uartParity').value;
            const stopBits = parseInt(document.getElementById('uartStopBits').value);
            const enableRxInterrupt = document.getElementById('uartEnableRxInterrupt').checked;
            const enableTxInterrupt = document.getElementById('uartEnableTxInterrupt').checked;
            const priority = parseInt(document.getElementById('uartPriority').value);
            const subPriority = parseInt(document.getElementById('uartSubPriority').value);
            
            // Ring buffer settings (only for ring-buffer mode)
            const rxBufferSize = parseInt(document.getElementById('uartRxBufferSize')?.value || 256);
            const txBufferSize = parseInt(document.getElementById('uartTxBufferSize')?.value || 256);

            // Calculate BRG
            const calc = calculateUartBRG();

            // Update config
            uartConfig = {
                module: module,
                operatingMode: operatingMode,
                baudRate: baudRate,
                dataBits: dataBits,
                parity: parity,
                stopBits: stopBits,
                enableRxInterrupt: enableRxInterrupt,
                enableTxInterrupt: enableTxInterrupt,
                priority: priority,
                subPriority: subPriority,
                rxBufferSize: rxBufferSize,
                txBufferSize: txBufferSize,
                brgValue: calc.brg,
                actualBaud: calc.actualBaud,
                error: calc.error
            };

            // Update info box
            document.getElementById('uartInfo').style.display = 'block';
            document.getElementById('infoUartPBCLK').textContent = `${(calc.pbclk2Freq / 1000000).toFixed(3)} MHz`;
            document.getElementById('infoUartBRG').textContent = calc.brg;
            document.getElementById('infoUartActualBaud').textContent = `${Math.round(calc.actualBaud)} bps`;
            document.getElementById('infoUartError').textContent = `${calc.error.toFixed(4)}%`;

            // Generate code
            generateUartCode();
        }

        // Generate UART code
        function generateUartCode() {
            const { module, baudRate, dataBits, parity, stopBits, brgValue, actualBaud, priority, subPriority, enableRxInterrupt, enableTxInterrupt } = uartConfig;
            const codeFormat = document.getElementById('uartCodeFormat').value;
            let code = '';

            if (codeFormat === 'mikroc') {
                code = generateMikroCUartCode(module, baudRate, dataBits, parity, stopBits, brgValue, actualBaud, priority, enableRxInterrupt, enableTxInterrupt);
            } else {
                code = generateHarmonyUartCode(module, baudRate, dataBits, parity, stopBits, brgValue, actualBaud, priority, subPriority, enableRxInterrupt, enableTxInterrupt);
            }

            document.getElementById('uartCodeOutput').innerHTML = code;
        }

        // Generate mikroC UART code
        function generateMikroCUartCode(module, baudRate, dataBits, parity, stopBits, brgValue, actualBaud, priority, enableRxInterrupt, enableTxInterrupt) {
            const uMode = (parity === 'none' ? 0 : (parity === 'even' ? 0x02 : 0x04)) | 
                          (stopBits === 2 ? 0x01 : 0) |
                          (dataBits === 9 ? 0x06 : 0);
            const uSta = 0x1400; // UTXEN + URXEN
            
            let code = `<span class="timer-comment">// UART${module} Configuration</span>
<span class="timer-comment">// Baud Rate: ${baudRate} bps (Actual: ${Math.round(actualBaud)} bps)</span>
<span class="timer-comment">// Data: ${dataBits} bits, Parity: ${parity}, Stop: ${stopBits}</span>

<span class="timer-comment">// Initialization function</span>
void InitUART${module}() {
    U${module}BRG\t= ${brgValue};
    U${module}MODE\t= 0x${(0x8000 | uMode).toString(16).toUpperCase()}; <span class="timer-comment">// ON + settings</span>
    U${module}STA\t= 0x${uSta.toString(16).toUpperCase()}; <span class="timer-comment">// Enable TX and RX</span>
`;

            if (enableRxInterrupt || enableTxInterrupt) {
                code += `\n    <span class="timer-comment">// Configure interrupts</span>\n`;
                if (enableRxInterrupt) {
                    code += `    U${module}RXIP0_bit = ${(priority & 1) ? 1 : 0};
    U${module}RXIP1_bit = ${(priority & 2) ? 1 : 0};
    U${module}RXIP2_bit = ${(priority & 4) ? 1 : 0};
    U${module}RXIF_bit = 0;
    U${module}RXIE_bit = 1;\n`;
                }
                if (enableTxInterrupt) {
                    code += `    U${module}TXIP0_bit = ${(priority & 1) ? 1 : 0};
    U${module}TXIP1_bit = ${(priority & 2) ? 1 : 0};
    U${module}TXIP2_bit = ${(priority & 4) ? 1 : 0};
    U${module}TXIF_bit = 0;
    U${module}TXIE_bit = 1;\n`;
                }
            }

            code += `}\n\n`;

            if (enableRxInterrupt) {
                code += `<span class="timer-comment">// RX Interrupt handler</span>
void UART${module}_RX_Interrupt() iv IVT_UART_${module}_RX ilevel ${priority} ics ICS_SRS {
    U${module}RXIF_bit = 0;
    <span class="timer-comment">// Read data: char data = U${module}RXREG;</span>
    <span class="timer-comment">// Your code here</span>
}\n\n`;
            }

            if (enableTxInterrupt) {
                code += `<span class="timer-comment">// TX Interrupt handler</span>
void UART${module}_TX_Interrupt() iv IVT_UART_${module}_TX ilevel ${priority} ics ICS_SRS {
    U${module}TXIF_bit = 0;
    <span class="timer-comment">// Your code here</span>
}\n`;
            }

            return code;
        }

        // Generate Harmony UART code
        function generateHarmonyUartCode(module, baudRate, dataBits, parity, stopBits, brgValue, actualBaud, priority, subPriority, enableRxInterrupt, enableTxInterrupt) {
            // Calculate UMODE register value
            let pdsel = 0; // 8-bit, no parity
            if (dataBits === 9) {
                pdsel = 0x03; // 9-bit, no parity
            } else if (parity === 'even') {
                pdsel = 0x01; // 8-bit, even parity
            } else if (parity === 'odd') {
                pdsel = 0x02; // 8-bit, odd parity
            }
            
            const stsel = (stopBits === 2) ? 1 : 0; // Stop bit select
            const brgh = 1; // High-speed mode
            
            // UMODE = BRGH | PDSEL | STSEL
            const uModeValue = ((brgh << 3) | (pdsel << 1) | stsel).toString(16).toUpperCase();
            
            // USTA = UTXEN | URXEN | UTXISEL1 (TX interrupt when TX buffer empty)
            const uStaValue = 0x1400;
            
            let code = `<span class="timer-comment">/* ========= plib_uart${module}.h ========= */</span>
#ifndef PLIB_UART${module}_H
#define PLIB_UART${module}_H

#include "plib_uart_common.h"

<span class="timer-comment">// *****************************************************************************</span>
<span class="timer-comment">// Section: Interface Routines</span>
<span class="timer-comment">// *****************************************************************************</span>

void UART${module}_Initialize(void);
bool UART${module}_SerialSetup(UART_SERIAL_SETUP *setup, uint32_t srcClkFreq);
size_t UART${module}_Read(uint8_t *pRdBuffer, const size_t size);
size_t UART${module}_Write(uint8_t *pWrBuffer, const size_t size);
UART_ERROR UART${module}_ErrorGet(void);

#endif <span class="timer-comment">// PLIB_UART${module}_H</span>

<span class="timer-comment">/* ========= plib_uart${module}.c ========= */</span>
#include "device.h"
#include "plib_uart${module}.h"
#include "interrupts.h"

<span class="timer-comment">// *****************************************************************************</span>
<span class="timer-comment">// Section: UART${module} Implementation</span>
<span class="timer-comment">// *****************************************************************************</span>
<span class="timer-comment">// Baud Rate: ${baudRate} bps (Actual: ${Math.round(actualBaud)} bps)</span>
<span class="timer-comment">// Data: ${dataBits} bits, Parity: ${parity}, Stop: ${stopBits}</span>

`;

            if (enableRxInterrupt || enableTxInterrupt) {
                code += `static volatile UART_OBJECT uart${module}Obj;

`;
            }

            code += `static void UART${module}_ErrorClear(void)
{
    UART_ERROR errors = UART_ERROR_NONE;
    uint8_t dummyData = 0u;

    errors = (UART_ERROR)(U${module}STA & (_U${module}STA_OERR_MASK | _U${module}STA_FERR_MASK | _U${module}STA_PERR_MASK));

    if(errors != UART_ERROR_NONE)
    {
        <span class="timer-comment">/* If it's an overrun error then clear it to flush FIFO */</span>
        if((U${module}STA & _U${module}STA_OERR_MASK) != 0U)
        {
            U${module}STACLR = _U${module}STA_OERR_MASK;
        }

        <span class="timer-comment">/* Read existing error bytes from FIFO to clear parity and framing error flags */</span>
        while((U${module}STA & _U${module}STA_URXDA_MASK) != 0U)
        {
            dummyData = (uint8_t)U${module}RXREG;
        }
`;

            if (enableRxInterrupt) {
                code += `
        <span class="timer-comment">/* Clear error interrupt flag */</span>
        IFS${Math.floor((module - 1) * 3 / 32)}CLR = _IFS${Math.floor((module - 1) * 3 / 32)}_U${module}EIF_MASK;
        IFS${Math.floor((module - 1) * 3 / 32)}CLR = _IFS${Math.floor((module - 1) * 3 / 32)}_U${module}RXIF_MASK;
`;
            }

            code += `    }
    (void)dummyData;
}

void UART${module}_Initialize(void)
{
    <span class="timer-comment">/* Set up U${module}MODE bits */</span>
    <span class="timer-comment">/* STSEL  = ${stopBits - 1} */</span>
    <span class="timer-comment">/* PDSEL = ${pdsel} */</span>
    <span class="timer-comment">/* BRGH = 1 (High-Speed mode) */</span>

    U${module}MODE = 0x${uModeValue.padStart(4, '0')};

    <span class="timer-comment">/* Enable UART${module} Receiver and Transmitter */</span>
    U${module}STASET = (_U${module}STA_UTXEN_MASK | _U${module}STA_URXEN_MASK | _U${module}STA_UTXISEL1_MASK);

    <span class="timer-comment">/* BAUD Rate register Setup */</span>
    U${module}BRG = ${brgValue}U;

`;

            if (enableRxInterrupt || enableTxInterrupt) {
                code += `    <span class="timer-comment">/* Disable Interrupts */</span>
    IEC${Math.floor((module - 1) * 3 / 32)}CLR = _IEC${Math.floor((module - 1) * 3 / 32)}_U${module}EIE_MASK;
    IEC${Math.floor((module - 1) * 3 / 32)}CLR = _IEC${Math.floor((module - 1) * 3 / 32)}_U${module}RXIE_MASK;
    IEC${Math.floor((module - 1) * 3 / 32)}CLR = _IEC${Math.floor((module - 1) * 3 / 32)}_U${module}TXIE_MASK;

    <span class="timer-comment">/* Initialize instance object */</span>
    uart${module}Obj.rxBuffer = NULL;
    uart${module}Obj.rxSize = 0;
    uart${module}Obj.rxProcessedSize = 0;
    uart${module}Obj.rxBusyStatus = false;
    uart${module}Obj.rxCallback = NULL;
    uart${module}Obj.txBuffer = NULL;
    uart${module}Obj.txSize = 0;
    uart${module}Obj.txProcessedSize = 0;
    uart${module}Obj.txBusyStatus = false;
    uart${module}Obj.txCallback = NULL;
    uart${module}Obj.errors = UART_ERROR_NONE;

`;
            }

            code += `    <span class="timer-comment">/* Turn ON UART${module} */</span>
    U${module}MODESET = _U${module}MODE_ON_MASK;
}

UART_ERROR UART${module}_ErrorGet(void)
{
    UART_ERROR errors = UART_ERROR_NONE;
    errors = (UART_ERROR)(U${module}STA & (_U${module}STA_OERR_MASK | _U${module}STA_FERR_MASK | _U${module}STA_PERR_MASK));
    
    if(errors != UART_ERROR_NONE)
    {
        UART${module}_ErrorClear();
    }
    return errors;
}

`;

            // Add interrupt handlers if enabled
            if (enableRxInterrupt) {
                const rxIpcNum = 28 + (parseInt(module) - 1) * 3; // IPC7 for UART1 RX
                const rxIpcReg = Math.floor(rxIpcNum / 4);
                const rxIpcShift = (rxIpcNum % 4) * 8;
                const priorityBits = (priority << 2) | subPriority;

                code += `<span class="timer-comment">/* ========= plib_evic.c - Add to EVIC_Initialize() ========= */</span>
<span class="timer-comment">/* UART${module} RX Priority */</span>
IPC${rxIpcReg}SET = 0x${(priorityBits << rxIpcShift).toString(16).toUpperCase()}U;

<span class="timer-comment">/* ========= interrupts.c ========= */</span>
void __attribute__((used)) UART${module}_RX_InterruptHandler(void)
{
    if(uart${module}Obj.rxBusyStatus == true)
    {
        size_t rxSize = uart${module}Obj.rxSize;
        size_t rxProcessedSize = uart${module}Obj.rxProcessedSize;

        while((rxProcessedSize < rxSize) && ((U${module}STA & _U${module}STA_URXDA_MASK) != 0U))
        {
            uart${module}Obj.rxBuffer[rxProcessedSize] = (uint8_t)(U${module}RXREG);
            rxProcessedSize++;
        }

        uart${module}Obj.rxProcessedSize = rxProcessedSize;

        <span class="timer-comment">/* Check if the buffer is done */</span>
        if(rxProcessedSize >= rxSize)
        {
            uart${module}Obj.rxBusyStatus = false;

            <span class="timer-comment">/* Disable RX interrupt */</span>
            IEC${Math.floor((module - 1) * 3 / 32)}CLR = _IEC${Math.floor((module - 1) * 3 / 32)}_U${module}RXIE_MASK;

            if(uart${module}Obj.rxCallback != NULL)
            {
                uintptr_t rxContext = uart${module}Obj.rxContext;
                uart${module}Obj.rxCallback(rxContext);
            }
        }
    }
    else
    {
        <span class="timer-comment">/* Nothing to process */</span>
    }

    <span class="timer-comment">/* Clear UART${module} RX Interrupt flag */</span>
    IFS${Math.floor((module - 1) * 3 / 32)}CLR = _IFS${Math.floor((module - 1) * 3 / 32)}_U${module}RXIF_MASK;
}

void __attribute__((used)) __ISR(_UART_${module}_RX_VECTOR, ipl${priority}SRS) UART_${module}_RX_InterruptSvcRoutine(void)
{
    UART${module}_RX_InterruptHandler();
}

`;
            }

            if (enableTxInterrupt) {
                const txIpcNum = 29 + (parseInt(module) - 1) * 3; // IPC7 for UART1 TX
                const txIpcReg = Math.floor(txIpcNum / 4);
                const txIpcShift = (txIpcNum % 4) * 8;
                const priorityBits = (priority << 2) | subPriority;

                code += `<span class="timer-comment">/* UART${module} TX Priority */</span>
IPC${txIpcReg}SET = 0x${(priorityBits << txIpcShift).toString(16).toUpperCase()}U;

void __attribute__((used)) UART${module}_TX_InterruptHandler(void)
{
    if(uart${module}Obj.txBusyStatus == true)
    {
        size_t txSize = uart${module}Obj.txSize;
        size_t txProcessedSize = uart${module}Obj.txProcessedSize;

        while((txProcessedSize < txSize) && ((U${module}STA & _U${module}STA_UTXBF_MASK) == 0U))
        {
            U${module}TXREG = uart${module}Obj.txBuffer[txProcessedSize];
            txProcessedSize++;
        }

        uart${module}Obj.txProcessedSize = txProcessedSize;

        <span class="timer-comment">/* Check if the buffer is done */</span>
        if(txProcessedSize >= txSize)
        {
            uart${module}Obj.txBusyStatus = false;

            <span class="timer-comment">/* Disable TX interrupt */</span>
            IEC${Math.floor((module - 1) * 3 / 32)}CLR = _IEC${Math.floor((module - 1) * 3 / 32)}_U${module}TXIE_MASK;

            if(uart${module}Obj.txCallback != NULL)
            {
                uintptr_t txContext = uart${module}Obj.txContext;
                uart${module}Obj.txCallback(txContext);
            }
        }
    }
    else
    {
        <span class="timer-comment">/* Nothing to process */</span>
    }

    <span class="timer-comment">/* Clear UART${module} TX Interrupt flag */</span>
    IFS${Math.floor((module - 1) * 3 / 32)}CLR = _IFS${Math.floor((module - 1) * 3 / 32)}_U${module}TXIF_MASK;
}

void __attribute__((used)) __ISR(_UART_${module}_TX_VECTOR, ipl${priority}SRS) UART_${module}_TX_InterruptSvcRoutine(void)
{
    UART${module}_TX_InterruptHandler();
}
`;
            }

            return code;
        }

        // Copy UART code
        function copyUartCode() {
            const codeElement = document.getElementById('uartCodeOutput');
            const codeText = codeElement.innerText;
            
            navigator.clipboard.writeText(codeText).then(() => {
                const btn = document.getElementById('copyUartCodeBtn');
                const originalText = btn.textContent;
                btn.textContent = '✓ Copied!';
                setTimeout(() => {
                    btn.textContent = originalText;
                }, 2000);
            });
        }

        // UART event listeners
        document.getElementById('uartOperatingMode')?.addEventListener('change', function() {
            const mode = this.value;
            const ringBufferSettings = document.getElementById('uartRingBufferSettings');
            const interruptSettings = document.getElementById('uartInterruptSettings');
            const rxInterruptCheck = document.getElementById('uartEnableRxInterrupt');
            const txInterruptCheck = document.getElementById('uartEnableTxInterrupt');
            
            if (mode === 'blocking') {
                // Blocking mode: no interrupts needed
                ringBufferSettings.style.display = 'none';
                interruptSettings.style.display = 'none';
                rxInterruptCheck.checked = false;
                txInterruptCheck.checked = false;
                rxInterruptCheck.disabled = true;
                txInterruptCheck.disabled = true;
            } else if (mode === 'non-blocking') {
                // Non-blocking: show interrupt settings, hide ring buffer
                ringBufferSettings.style.display = 'none';
                interruptSettings.style.display = 'block';
                rxInterruptCheck.disabled = false;
                txInterruptCheck.disabled = false;
                rxInterruptCheck.checked = true; // Default enable RX
            } else if (mode === 'ring-buffer') {
                // Ring buffer: show both ring buffer settings and interrupt settings
                ringBufferSettings.style.display = 'block';
                interruptSettings.style.display = 'block';
                rxInterruptCheck.disabled = false;
                txInterruptCheck.disabled = false;
                rxInterruptCheck.checked = true; // Ring buffer requires interrupts
                txInterruptCheck.checked = true;
            }
        });

        document.getElementById('uartBaudRate')?.addEventListener('change', function() {
            const customGroup = document.getElementById('uartCustomBaudGroup');
            if (this.value === 'custom') {
                customGroup.style.display = 'block';
            } else {
                customGroup.style.display = 'none';
            }
        });

        document.getElementById('configureUartBtn')?.addEventListener('click', configureUart);
        document.getElementById('copyUartCodeBtn')?.addEventListener('click', copyUartCode);
        document.getElementById('uartCodeFormat')?.addEventListener('change', generateUartCode);

        // Initialize UART modules on device info load
        if (deviceInfo.name) {
            populateUartModules();
        }

        // Signal ready
        vscode.postMessage({ type: 'ready' });
