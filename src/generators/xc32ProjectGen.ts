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
 * XC32 Project Generator Options
 */
export interface XC32ProjectOptions {
    projectName: string;
    deviceName: string;        // e.g., "P32MZ2048EFH100"
    outputPath: string;
    settings: Map<number, string>;
}

/**
 * Generate complete XC32 project
 */
export async function generateXC32Project(options: XC32ProjectOptions): Promise<void> {
    const { projectName, deviceName, outputPath, settings } = options;
    
    // Remove 'P' prefix for device part number
    const devicePart = deviceName.replace(/^P/, '');
    
    // Template variables
    const vars = {
        PROJECT_NAME: projectName,
        DEVICE_NAME: deviceName,
        DEVICE_PART: devicePart
    };
    
    // Create project root
    const projectRoot = path.join(outputPath, projectName);
    ensureDir(projectRoot);
    
    // Create directory structure
    const dirs = [
        '.vscode',
        'config/default',
        'srcs',
        'incs',
        'bins',
        'objs',
        'linker'
    ];
    
    dirs.forEach(dir => ensureDir(path.join(projectRoot, dir)));
    
    // Generate configuration code
    const initC = generateInitializationC(settings, deviceName);
    const initH = generateInitializationH();
    
    // Write configuration files
    writeFile(path.join(projectRoot, 'config/default/initialization.c'), initC);
    writeFile(path.join(projectRoot, 'config/default/initialization.h'), initH);
    
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
    
    if (!/^[a-zA-Z0-9_]+$/.test(options.projectName)) {
        errors.push('Project name must contain only alphanumeric characters and underscores');
    }
    
    if (!options.deviceName) {
        errors.push('Device name is required');
    }
    
    if (!options.outputPath) {
        errors.push('Output path is required');
    }
    
    if (!fs.existsSync(options.outputPath)) {
        errors.push(`Output path does not exist: ${options.outputPath}`);
    }
    
    // Check if project already exists
    const projectPath = path.join(options.outputPath, options.projectName);
    if (fs.existsSync(projectPath)) {
        errors.push(`Project already exists at: ${projectPath}`);
    }
    
    return errors;
}
