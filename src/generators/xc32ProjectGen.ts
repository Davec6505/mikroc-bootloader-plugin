/**
 * XC32 Project Generator
 * Creates complete buildable XC32 project structure
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateInitializationC, generateInitializationH } from './xc32ConfigGen';

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
}

/**
 * Generate complete XC32 project
 */
export async function generateXC32Project(options: XC32ProjectOptions): Promise<void> {
    const { projectName, deviceName, outputPath, settings, heapSize, xc32Version, dfpVersion, useMikroeBootloader } = options;
    
    // Remove 'P' prefix for device part number
    const devicePart = deviceName.replace(/^P/, '');
    
    // Calculate system clock and use provided heap size (or default)
    const systemClock = Math.round(calculateSystemClock(settings));
    const heap = Math.round(heapSize || 4096); // Default 4KB heap
    
    // Template variables
    const vars = {
        PROJECT_NAME: projectName,
        DEVICE_NAME: deviceName,
        DEVICE_PART: devicePart,
        SYSTEM_CLOCK: systemClock.toString(),
        HEAP_SIZE: heap.toString(),
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
    
    // Generate configuration code
    const initC = generateInitializationC(settings, deviceName);
    
    // Write configuration files
    writeFile(path.join(projectRoot, 'srcs/config/default/initialization.c'), initC);
    
    // Copy template header files (definitions.h and device.h)
    const definitionsH = loadTemplate('config/default/definitions.h.template');
    const definitionsContent = replaceTemplateVars(definitionsH, vars);
    const deviceH = loadTemplate('config/default/device.h.template');
    const deviceContent = replaceTemplateVars(deviceH, vars);
    writeFile(path.join(projectRoot, 'srcs/config/default/definitions.h'), definitionsContent);
    writeFile(path.join(projectRoot, 'srcs/config/default/device.h'), deviceContent);
    
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
