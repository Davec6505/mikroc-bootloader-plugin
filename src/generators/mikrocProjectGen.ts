/**
 * MikroC Project Generator
 * Creates complete buildable MikroC PRO for PIC32 project structure
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateMikroCConfig, generateMikroCIni } from './mikrocConfigGen';

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
    const templatePath = path.join(__dirname, '..', 'templates', 'mikroc', templateName);
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
 * MikroC Project Generator Options
 */
export interface MikroCProjectOptions {
    projectName: string;
    deviceName: string;        // e.g., "P32MZ2048EFH100"
    outputPath: string;
    settings: Map<number, string>;
}

/**
 * Generate .mcp32 project file (MikroC project descriptor)
 */
function generateMCP32File(projectName: string, deviceName: string): string {
    return `[DEVICE]
Name=${deviceName}
Clock=200000000

[FILES]
File0=${projectName}.c

[BINARIES]
Count=0

[IMAGES]
Count=0

ActiveImageIndex=-1

[OPENED_FILES]
File0=${projectName}.c

[OTHER_FILES]
Count=0

[SEARCH_PATH]
Count=0

[HEADER_PATH]
Count=0

[HEADERS]
Count=0

[PLDS]
Count=0

[Useses]
Count=0

[EXPANDED_NODES]
Count=0

[LIB_EXPANDED_NODES]
Count=0

[PROGRAMMER_TYPE]
Value=mikroE mikroBootloader

[CODEGRIP_OPTIONS]
CODEGRIP_SPEED=4
CODEGRIP_VERIFY_AFTER=1
SwdFrequency=4000000
`;
}

/**
 * Generate complete MikroC project
 */
export async function generateMikroCProject(options: MikroCProjectOptions): Promise<void> {
    const { projectName, deviceName, outputPath, settings } = options;
    
    // Remove 'P' prefix for some uses
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
        'srcs',
        'bins',
        'objs',
        'other'
    ];
    
    dirs.forEach(dir => ensureDir(path.join(projectRoot, dir)));
    
    // Generate configuration files
    const cfgXml = generateMikroCConfig(settings, deviceName);
    const cIni = generateMikroCIni();
    const mcp32 = generateMCP32File(projectName, deviceName);
    
    // Write configuration files in srcs/
    writeFile(path.join(projectRoot, `srcs/${projectName}.cfg`), cfgXml);
    writeFile(path.join(projectRoot, `srcs/${projectName}.c.ini`), cIni);
    writeFile(path.join(projectRoot, `srcs/${projectName}.mcp32`), mcp32);
    
    // Generate and write main.c
    const mainTemplate = loadTemplate('main.c.template');
    const mainC = replaceTemplateVars(mainTemplate, vars);
    writeFile(path.join(projectRoot, `srcs/${projectName}.c`), mainC);
    
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
    
    console.log(`MikroC project '${projectName}' created successfully at: ${projectRoot}`);
}

/**
 * Validate project options
 */
export function validateMikroCProjectOptions(options: MikroCProjectOptions): string[] {
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
