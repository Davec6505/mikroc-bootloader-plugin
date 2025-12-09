/**
 * XC32 Project Generator
 * Creates complete buildable XC32 project structure
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateInitializationC, generateInitializationH, generatePlibClkC } from './xc32ConfigGen';
import { generateHarmonyGpioHeader, generateHarmonyGpioSource } from './harmonyGpioGen';
import { generateHarmonyPPSCode } from './ppsCodeGen';
import { PinConfiguration } from '../devices/pic32mz/types';
import { 
    TimerConfiguration, 
    generateTimer1Header, 
    generateTimer1Source,
    generateTimerTypeB_Header,
    generateTimerTypeB_Source,
    generateTimerInterruptDeclaration,
    generateTimerIPC,
    generateTmr1CommonHeader,
    generateTmrCommonHeader
} from './harmonyTimerGen';

/**
 * Template variable replacer
 */
function replaceTemplateVars(content: string, vars: { [key: string]: string }): string {
    let result = content;
    for (const [key, value] of Object.entries(vars)) {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        result = result.replace(regex, value);
    }
    return result;
}

/**
 * Load template file
 */
function loadTemplate(templateName: string): string {
    const templatePath = path.join(__dirname, '..', 'templates', 'xc32', templateName);
    return fs.readFileSync(templatePath, 'utf8');
}

/**
 * Create directory if it doesn't exist
 */
function ensureDir(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

/**
 * Write file with content
 */
function writeFile(filePath: string, content: string): void {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, content, 'utf8');
}

/**
 * Calculate system clock frequency from PLL settings
 */
function calculateSystemClock(settings: Map<number, string>): number {
    const pllInputDiv = settings.get(6) || "3x Divider";
    const pllMult = settings.get(9) || "PLL Multiply by 50";
    const pllOutputDiv = settings.get(10) || "2x Divider";
    const oscSelection = settings.get(12) || "Primary Osc w/PLL (XT+PLL, HS+PLL)";

    // Determine input frequency based on oscillator selection
    let inputFreq = 24.0; // Default: 24 MHz crystal
    
    if (oscSelection.includes("FRC") || oscSelection.includes("Fast RC")) {
        inputFreq = 8.0;
    }
    
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
    const clock = (inputFreq / inputDiv) * mult / outputDiv;
    return clock;
}

/**
 * XC32 Project Generator Options
 */
export interface XC32ProjectOptions {
    projectName: string;
    deviceName: string;        // e.g., "P32MZ2048EFH100"
    outputPath: string;
    settings: Map<number, string>;
    heapSize?: number;         // Optional heap size (defaults to 4096)
    xc32Version?: string;      // Optional XC32 version (auto-detect if not specified)
    dfpVersion?: string;       // Optional DFP version (auto-detect if not specified)
    useMikroeBootloader?: boolean;  // Use MikroE bootloader (adds -nostartfiles and startup.S)
    pinConfigurations?: PinConfiguration[];  // Pin Manager configurations
    timerConfigurations?: TimerConfiguration[];  // Timer configurations
}

/**
 * Generate complete XC32 project
 */
export async function generateXC32Project(options: XC32ProjectOptions): Promise<void> {
    const { projectName, deviceName, outputPath, settings, heapSize, xc32Version, dfpVersion, useMikroeBootloader, pinConfigurations, timerConfigurations } = options;
    
    // Remove 'P' prefix for device part number
    const devicePart = deviceName.replace(/^P/, '');
    
    // Calculate system clock and use provided heap size (or default)
    const systemClock = Math.round(calculateSystemClock(settings));
    const heap = Math.round(heapSize || 4096); // Default 4KB heap
    const stack = Math.round(heapSize || 4096); // Default 4KB stack (same as heap)
    
    // Core timer runs at half the CPU clock speed
    const coreTimerFreq = Math.round(systemClock * 1000000 / 2);
    const coreTimerCompare = '0x186a0'; // 100,000 decimal for 1ms interrupts at 100MHz
    
    // Template variables
    const vars = {
        PROJECT_NAME: projectName,
        DEVICE_NAME: deviceName,
        DEVICE_PART: devicePart,
        SYSTEM_CLOCK: systemClock.toString(),
        CPU_CLOCK_FREQUENCY: (systemClock * 1000000).toString(),
        CORETIMER_FREQUENCY: coreTimerFreq.toString(),
        CORETIMER_COMPARE_VALUE: coreTimerCompare,
        HEAP_SIZE: heap.toString(),
        STACK_SIZE: stack.toString(),
        XC32_VERSION: xc32Version || '',    // Empty string = auto-detect in Makefile
        DFP_VERSION: dfpVersion || '',       // Empty string = auto-detect in Makefile
        USE_MIKROE_BOOTLOADER: useMikroeBootloader ? 'yes' : 'no'
    };
    
    // Create project root
    const projectRoot = path.join(outputPath, projectName);
    ensureDir(projectRoot);
    
    // Create directory structure
    const dirs = [
        '.vscode',
        'srcs/config/default',
        'srcs/config/default/peripheral/clk',
        'srcs/config/default/peripheral/coretimer',
        'srcs/config/default/peripheral/evic',
        'srcs/config/default/peripheral/gpio',
        'incs',
        'bins',
        'objs',
        'linker'
    ];
    
    // Add startup directory if using MikroE bootloader
    if (useMikroeBootloader) {
        dirs.push('srcs/startup');
    }
    
    dirs.forEach(dir => ensureDir(path.join(projectRoot, dir)));
    
    // Determine which peripherals are configured
    const hasPPS = pinConfigurations?.some(p => 
        p.mode === 'Peripheral' && 
        p.peripheral && 
        (p.peripheral.ppsInputSignal || p.peripheral.ppsOutputSignal)
    ) || false;
    
    const timerNumbers = timerConfigurations?.map(tc => {
        const is32Bit = tc.timer.length === 2;
        return is32Bit ? parseInt(tc.timer[0]) : parseInt(tc.timer);
    }) || [];
    
    // Generate configuration code
    const initC = generateInitializationC(settings, deviceName, {
        hasPPS,
        timerNumbers
    });
    
    // Write configuration files
    writeFile(path.join(projectRoot, 'srcs/config/default/initialization.c'), initC);
    
    // Copy template header files
    const definitionsH = loadTemplate('config/default/definitions.h.template');
    let definitionsContent = replaceTemplateVars(definitionsH, vars);
    
    // Add timer peripheral includes if configured
    if (timerConfigurations && timerConfigurations.length > 0) {
        const timerIncludes = timerNumbers.map(n => {
            // Timer1 goes in tmr1/, Timer2-9 go in tmr/
            const path = n === 1 ? 'peripheral/tmr1' : 'peripheral/tmr';
            return `#include "${path}/plib_tmr${n}.h"`;
        }).join('\n');
        definitionsContent = definitionsContent.replace(
            '#include "peripheral/evic/plib_evic.h"',
            `#include "peripheral/evic/plib_evic.h"\n${timerIncludes}`
        );
    }
    
    // Add PPS include if configured
    if (hasPPS) {
        definitionsContent = definitionsContent.replace(
            '#include "peripheral/evic/plib_evic.h"',
            `#include "peripheral/evic/plib_evic.h"\n#include "peripheral/pps/plib_pps.h"`
        );
    }
    
    const deviceH = loadTemplate('config/default/device.h.template');
    const deviceContent = replaceTemplateVars(deviceH, vars);
    const toolchainH = loadTemplate('config/default/toolchain_specifics.h.template');
    const toolchainContent = replaceTemplateVars(toolchainH, vars);
    const interruptsH = loadTemplate('config/default/interrupts.h.template');
    let interruptsHContent = replaceTemplateVars(interruptsH, vars);
    
    // Add timer interrupt handler declarations to interrupts.h
    if (timerConfigurations && timerConfigurations.length > 0) {
        console.log(`Adding timer interrupt handlers for ${timerConfigurations.length} timer(s)`);
        const timersWithInterrupts = timerConfigurations.filter(tc => tc.enableInterrupt !== false);
        console.log(`Timers with interrupts enabled: ${timersWithInterrupts.length}`);
        if (timersWithInterrupts.length > 0) {
            const timerHandlerDecls = timersWithInterrupts.map(tc => {
                const { timer } = tc;
                const is32Bit = timer.length === 2;
                const timerNum = is32Bit ? parseInt(timer[0]) : parseInt(timer);
                return `void TIMER_${timerNum}_InterruptHandler( void );`;
            }).join('\n');
            
            console.log(`Timer handler declarations:\n${timerHandlerDecls}`);
            
            interruptsHContent = interruptsHContent.replace(
                '// Section: Handler Routines\n// *****************************************************************************\n// *****************************************************************************',
                `// Section: Handler Routines\n// *****************************************************************************\n// *****************************************************************************\n${timerHandlerDecls}\n\n`
            );
        }
    } else {
        console.log('No timer configurations found');
    }
    
    writeFile(path.join(projectRoot, 'srcs/config/default/definitions.h'), definitionsContent);
    writeFile(path.join(projectRoot, 'srcs/config/default/device.h'), deviceContent);
    writeFile(path.join(projectRoot, 'srcs/config/default/toolchain_specifics.h'), toolchainContent);
    writeFile(path.join(projectRoot, 'srcs/config/default/interrupts.h'), interruptsHContent);
    
    // Generate system files (interrupts.c and exceptions.c)
    const interruptsC = loadTemplate('config/default/interrupts.c.template');
    let interruptsCContent = replaceTemplateVars(interruptsC, vars);
    
    // Add timer interrupt handlers if configured and interrupts enabled
    if (timerConfigurations && timerConfigurations.length > 0) {
        console.log(`Adding timer interrupt handlers for ${timerConfigurations.length} timer(s)`);
        console.log('Timer configurations:', JSON.stringify(timerConfigurations, null, 2));
        const timersWithInterrupts = timerConfigurations.filter(tc => tc.enableInterrupt !== false);
        console.log(`Timers with interrupts enabled: ${timersWithInterrupts.length}`);
        if (timersWithInterrupts.length > 0) {
            // Generate forward declarations
            const timerDeclarations = timersWithInterrupts.map(tc => {
                const { timer } = tc;
                const is32Bit = timer.length === 2;
                const timerNum = is32Bit ? parseInt(timer[0]) : parseInt(timer);
                return `void TIMER_${timerNum}_Handler (void);`;
            }).join('\n');
            
            console.log(`Timer ISR declarations:\n${timerDeclarations}`);
            
            // Generate ISR definitions
            const timerHandlers = timersWithInterrupts.map(tc => generateTimerInterruptDeclaration(tc)).join('\n\n');
            
            console.log(`Timer ISR definitions:\n${timerHandlers}`);
            
            // Insert declarations
            interruptsCContent = interruptsCContent.replace(
                '// Section: System Interrupt Vector declarations\r\n// *****************************************************************************\r\n// *****************************************************************************\r\n\r\n',
                `// Section: System Interrupt Vector declarations\r\n// *****************************************************************************\r\n// *****************************************************************************\r\n\r\n${timerDeclarations}\r\n\r\n`
            );
            
            console.log('After declarations replacement, contains TIMER_1_Handler:', interruptsCContent.includes('TIMER_1_Handler'));
            
            // Insert ISR definitions
            interruptsCContent = interruptsCContent.replace(
                '// Section: System Interrupt Vector definitions\r\n// *****************************************************************************\r\n// *****************************************************************************\r\n\r\n',
                `// Section: System Interrupt Vector definitions\r\n// *****************************************************************************\r\n// *****************************************************************************\r\n\r\n${timerHandlers}\r\n\r\n`
            );
            
            console.log('After definitions replacement, contains __ISR:', interruptsCContent.includes('__ISR'));
        }
    } else {
        console.log('No timer configurations found');
    }
    
    const exceptionsC = loadTemplate('config/default/exceptions.c.template');
    const exceptionsCContent = replaceTemplateVars(exceptionsC, vars);
    
    writeFile(path.join(projectRoot, 'srcs/config/default/interrupts.c'), interruptsCContent);
    writeFile(path.join(projectRoot, 'srcs/config/default/exceptions.c'), exceptionsCContent);
    
    // Generate clock peripheral library files (plib_clk.c and plib_clk.h)
    const settingsObj: { [key: number]: string } = {};
    settings.forEach((value, key) => settingsObj[key] = value);
    const plibClkC = generatePlibClkC(settingsObj);
    const plibClkH = loadTemplate('config/peripheral/clk/plib_clk.h.template');
    writeFile(path.join(projectRoot, 'srcs/config/default/peripheral/clk/plib_clk.c'), plibClkC);
    writeFile(path.join(projectRoot, 'srcs/config/default/peripheral/clk/plib_clk.h'), plibClkH);
    
    // Generate core timer peripheral files
    const plibCoretimerC = loadTemplate('config/peripheral/coretimer/plib_coretimer.c.template');
    const plibCoretimerCContent = replaceTemplateVars(plibCoretimerC, vars);
    const plibCoretimerH = loadTemplate('config/peripheral/coretimer/plib_coretimer.h.template');
    const plibCoretimerHContent = replaceTemplateVars(plibCoretimerH, vars);
    
    writeFile(path.join(projectRoot, 'srcs/config/default/peripheral/coretimer/plib_coretimer.c'), plibCoretimerCContent);
    writeFile(path.join(projectRoot, 'srcs/config/default/peripheral/coretimer/plib_coretimer.h'), plibCoretimerHContent);
    
    // Generate EVIC (interrupt controller) peripheral files
    const plibEvicC = loadTemplate('config/peripheral/evic/plib_evic.c.template');
    let plibEvicCContent = replaceTemplateVars(plibEvicC, vars);
    
    // Add timer IPC settings if timers are configured with interrupts
    if (timerConfigurations && timerConfigurations.length > 0) {
        const timersWithInterrupts = timerConfigurations.filter(tc => tc.enableInterrupt !== false);
        if (timersWithInterrupts.length > 0) {
            const timerIPCs = timersWithInterrupts.map(tc => generateTimerIPC(tc)).join('\n');
            plibEvicCContent = plibEvicCContent.replace(
                '    /* Set up priority and subpriority of enabled interrupts */',
                `    /* Set up priority and subpriority of enabled interrupts */\n${timerIPCs}`
            );
        }
    }
    
    const plibEvicH = loadTemplate('config/peripheral/evic/plib_evic.h.template');
    const plibEvicHContent = replaceTemplateVars(plibEvicH, vars);
    
    writeFile(path.join(projectRoot, 'srcs/config/default/peripheral/evic/plib_evic.c'), plibEvicCContent);
    writeFile(path.join(projectRoot, 'srcs/config/default/peripheral/evic/plib_evic.h'), plibEvicHContent);
    
    // Generate GPIO peripheral files from pin configurations
    let plibGpioCContent: string;
    let plibGpioHContent: string;
    
    if (pinConfigurations && pinConfigurations.length > 0) {
        // Generate GPIO files from pin configurations
        plibGpioHContent = generateHarmonyGpioHeader(pinConfigurations);
        plibGpioCContent = generateHarmonyGpioSource(pinConfigurations);
        console.log(`Generated GPIO code for ${pinConfigurations.length} configured pin(s)`);
    } else {
        // Use template files if no pins configured
        const plibGpioC = loadTemplate('config/peripheral/gpio/plib_gpio.c.template');
        plibGpioCContent = replaceTemplateVars(plibGpioC, vars);
        const plibGpioH = loadTemplate('config/peripheral/gpio/plib_gpio.h.template');
        plibGpioHContent = replaceTemplateVars(plibGpioH, vars);
        console.log('No pin configurations - using template GPIO files');
    }
    
    writeFile(path.join(projectRoot, 'srcs/config/default/peripheral/gpio/plib_gpio.c'), plibGpioCContent);
    writeFile(path.join(projectRoot, 'srcs/config/default/peripheral/gpio/plib_gpio.h'), plibGpioHContent);
    
    // Generate PPS initialization if needed
    if (pinConfigurations && pinConfigurations.length > 0) {
        const hasPPS = pinConfigurations.some(p => 
            p.mode === 'Peripheral' && 
            p.peripheral && 
            (p.peripheral.ppsInputSignal || p.peripheral.ppsOutputSignal)
        );
        
        if (hasPPS) {
            const ppsCode = generateHarmonyPPSCode(pinConfigurations);
            
            // Create PPS header
            const ppsHeader = `/*******************************************************************************
  PPS PLIB

  Company:
    Microchip Technology Inc.

  File Name:
    plib_pps.h

  Summary:
    PPS PLIB Header File

  Description:
    This library provides an interface to configure Peripheral Pin Select (PPS).

*******************************************************************************/

#ifndef PLIB_PPS_H
#define PLIB_PPS_H

#include <device.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

void PPS_Initialize(void);

#ifdef __cplusplus
}
#endif

#endif // PLIB_PPS_H
`;
            
            // Create PPS source
            const ppsSource = `/*******************************************************************************
  PPS PLIB

  Company:
    Microchip Technology Inc.

  File Name:
    plib_pps.c

  Summary:
    PPS PLIB Implementation

*******************************************************************************/

#include "plib_pps.h"

${ppsCode}
`;
            
            writeFile(path.join(projectRoot, 'srcs/config/default/peripheral/pps/plib_pps.h'), ppsHeader);
            writeFile(path.join(projectRoot, 'srcs/config/default/peripheral/pps/plib_pps.c'), ppsSource);
            console.log('Generated PPS initialization code');
        }
    }
    
    // Generate Timer peripheral files from timer configurations
    if (timerConfigurations && timerConfigurations.length > 0) {
        console.log(`Generating timer files for ${timerConfigurations.length} configured timer(s)`);
        
        // Track if we need to generate common headers
        let needTmr1Common = false;
        let needTmrCommon = false;
        
        for (const timerConfig of timerConfigurations) {
            const { timer } = timerConfig;
            const is32Bit = timer.length === 2;
            const timerNum = is32Bit ? parseInt(timer[0]) : parseInt(timer);
            
            let headerContent: string;
            let sourceContent: string;
            let timerPath: string;
            
            if (timerNum === 1) {
                // Timer1 Type A (16-bit only) - goes in peripheral/tmr1/
                headerContent = generateTimer1Header();
                sourceContent = generateTimer1Source(timerConfig);
                timerPath = path.join(projectRoot, 'srcs/config/default/peripheral/tmr1');
                needTmr1Common = true;
            } else {
                // Timer2-9 Type B (16-bit or 32-bit) - goes in peripheral/tmr/
                headerContent = generateTimerTypeB_Header(timerNum);
                sourceContent = generateTimerTypeB_Source(timerConfig);
                timerPath = path.join(projectRoot, 'srcs/config/default/peripheral/tmr');
                needTmrCommon = true;
            }
            
            // Write timer peripheral files (flat structure, no subdirectories)
            writeFile(path.join(timerPath, `plib_tmr${timerNum}.h`), headerContent);
            writeFile(path.join(timerPath, `plib_tmr${timerNum}.c`), sourceContent);
            
            console.log(`Generated Timer${timer} peripheral files (${is32Bit ? '32-bit' : '16-bit'} mode)`);
        }
        
        // Generate common headers if needed
        if (needTmr1Common) {
            const tmr1CommonPath = path.join(projectRoot, 'srcs/config/default/peripheral/tmr1');
            writeFile(path.join(tmr1CommonPath, 'plib_tmr1_common.h'), generateTmr1CommonHeader());
            console.log('Generated plib_tmr1_common.h');
        }
        
        if (needTmrCommon) {
            const tmrCommonPath = path.join(projectRoot, 'srcs/config/default/peripheral/tmr');
            writeFile(path.join(tmrCommonPath, 'plib_tmr_common.h'), generateTmrCommonHeader());
            console.log('Generated plib_tmr_common.h');
        }
    }
    
    // Generate and write main.c
    const mainTemplate = loadTemplate('main.c.template');
    const mainC = replaceTemplateVars(mainTemplate, vars);
    writeFile(path.join(projectRoot, 'srcs/main.c'), mainC);
    
    // Generate and write Makefiles
    const rootMakefileTemplate = loadTemplate('RootMakefile.template');
    const rootMakefile = replaceTemplateVars(rootMakefileTemplate, vars);
    writeFile(path.join(projectRoot, 'Makefile'), rootMakefile);
    
    const srcsMakefileTemplate = loadTemplate('SrcsMakefile.template');
    const srcsMakefile = replaceTemplateVars(srcsMakefileTemplate, vars);
    writeFile(path.join(projectRoot, 'srcs/Makefile'), srcsMakefile);
    
    // Copy startup.S if using MikroE bootloader
    if (useMikroeBootloader) {
        const startupTemplate = loadTemplate('startup.S');
        writeFile(path.join(projectRoot, 'srcs/startup/startup.S'), startupTemplate);
    }
    
    // Generate and write VS Code configuration
    const tasksTemplate = loadTemplate('tasks.json.template');
    const tasks = replaceTemplateVars(tasksTemplate, vars);
    writeFile(path.join(projectRoot, '.vscode/tasks.json'), tasks);
    
    const cppPropsTemplate = loadTemplate('c_cpp_properties.json.template');
    const cppProps = replaceTemplateVars(cppPropsTemplate, vars);
    writeFile(path.join(projectRoot, '.vscode/c_cpp_properties.json'), cppProps);
    
    // Generate and write README
    const readmeTemplate = loadTemplate('README.md.template');
    const readme = replaceTemplateVars(readmeTemplate, vars);
    writeFile(path.join(projectRoot, 'README.md'), readme);
    
    // Copy linker script from XC32 installation
    await copyLinkerScript(devicePart, path.join(projectRoot, 'linker'));
    
    console.log(`XC32 project '${projectName}' created successfully at: ${projectRoot}`);
}

/**
 * Copy linker script from XC32 installation
 */
async function copyLinkerScript(devicePart: string, outputDir: string): Promise<void> {
    const xc32BasePath = 'C:/Program Files/Microchip/xc32/v4.35';
    const linkerScriptName = `p${devicePart}.ld`;
    
    // Try multiple possible locations
    const possiblePaths = [
        path.join(xc32BasePath, 'pic32mx/lib/proc', linkerScriptName),
        path.join(xc32BasePath, 'pic32-libs/proc', linkerScriptName),
        path.join(xc32BasePath, 'pic32-libs/libpic32', linkerScriptName)
    ];
    
    for (const srcPath of possiblePaths) {
        if (fs.existsSync(srcPath)) {
            const destPath = path.join(outputDir, linkerScriptName);
            fs.copyFileSync(srcPath, destPath);
            console.log(`Copied linker script: ${linkerScriptName}`);
            return;
        }
    }
    
    // If not found, create a minimal linker script reference
    const destPath = path.join(outputDir, linkerScriptName);
    const minimalLinkerScript = `/* 
 * Linker script for ${devicePart}
 * 
 * NOTE: Linker script not found in XC32 installation.
 * Using XC32 default linker script via -mprocessor flag.
 * 
 * To use custom linker script, copy from:
 * C:/Program Files/Microchip/xc32/v4.35/pic32mx/lib/proc/${linkerScriptName}
 */

/* Include default linker script */
INCLUDE "p${devicePart}.ld"
`;
    
    writeFile(destPath, minimalLinkerScript);
    console.log(`Created linker script reference: ${linkerScriptName}`);
}

/**
 * Validate project options
 */
export function validateProjectOptions(options: XC32ProjectOptions): string[] {
    const errors: string[] = [];
    
    if (!options.projectName || options.projectName.trim() === '') {
        errors.push('Project name is required');
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(options.projectName)) {
        errors.push('Project name must contain only alphanumeric characters, underscores, and hyphens');
    }
    
    if (!options.deviceName) {
        errors.push('Device name is required');
    }
    
    if (!options.outputPath) {
        errors.push('Output path is required');
    }
    
    // Create output path if it doesn't exist
    if (!fs.existsSync(options.outputPath)) {
        try {
            fs.mkdirSync(options.outputPath, { recursive: true });
        } catch (error) {
            errors.push(`Cannot create output path: ${options.outputPath}`);
        }
    }
    
    // Check if project already exists
    const projectPath = path.join(options.outputPath, options.projectName);
    if (fs.existsSync(projectPath)) {
        errors.push(`Project already exists at: ${projectPath}`);
    }
    
    return errors;
}
