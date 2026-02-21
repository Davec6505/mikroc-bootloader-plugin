/**
 * MikroC Project Importer
 * Parses MikroC project files and generates Makefiles for in-place builds
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface MikroCProjectInfo {
    projectPath: string;
    projectFile: string;        // .mcp32, .mcppi, .mcpdsp, etc.
    projectName: string;
    compilerType: 'PIC32' | 'PIC' | 'dsPIC' | 'AVR' | 'ARM' | 'Unknown';
    
    // Device info
    deviceName: string;
    clockFrequency: number;
    
    // Memory configuration
    heapSize?: number;
    
    // Source files
    sourceFiles: string[];
    headerFiles: string[];
    
    // Build settings from .mcp32
    searchPaths: string[];
    includePaths: string[];
    libraries: string[];        // Library names (converted to .emcl files)
    pldFiles: string[];         // Project level define files
    
    // Interrupt settings
    ebase?: string;
    interruptDef?: string;
    
    // Compiler flags from .log (if available)
    compilerFlags: string[];
}

export interface MikroCCompilerPaths {
    compilerExe: string;
    installPath: string;
    defsPath: string;
    usesPath: string;
}

export class MikroCImporter {
    
    /**
     * Detect MikroC project type and parse accordingly
     */
    async parseProject(projectPath: string): Promise<MikroCProjectInfo | null> {
        // Find project file - search for any .mcp* file
        const projectFiles = fs.readdirSync(projectPath);
        
        // Find any file matching .mcp* pattern
        const projectFile = projectFiles.find(f => f.match(/\.mcp[a-z0-9]+$/i));
        
        if (!projectFile) {
            vscode.window.showErrorMessage('No MikroC project file found (expected .mcp* file)');
            return null;
        }
        
        // Determine compiler type from extension
        let compilerType: 'PIC32' | 'PIC' | 'dsPIC' | 'AVR' | 'ARM' | 'Unknown' = 'Unknown';
        const ext = path.extname(projectFile).toLowerCase();
        
        if (ext === '.mcp32') {
            compilerType = 'PIC32';
        } else if (ext === '.mcppi' || ext === '.mcp16' || ext === '.mcp18') {
            compilerType = 'PIC';
        } else if (ext === '.mcpdsp') {
            compilerType = 'dsPIC';
        } else if (ext === '.mcpav') {
            compilerType = 'AVR';
        } else if (ext === '.mcpar') {
            compilerType = 'ARM';
        }
        
        const projectFilePath = path.join(projectPath, projectFile);
        const projectName = path.basename(projectFile, path.extname(projectFile));
        
        // Parse project file (INI format)
        const content = fs.readFileSync(projectFilePath, 'utf-8');
        const sections = this.parseINI(content);
        
        // Extract device info
        const deviceName = sections['DEVICE']?.Name || 'Unknown';
        const clockFrequency = parseInt(sections['DEVICE']?.Clock || '0', 10);
        
        // Extract heap size
        const heapSize = parseInt(sections['HEAP_SIZE']?.Value || '0', 10);
        
        // Extract source files
        const sourceFiles: string[] = [];
        if (sections['FILES']) {
            const fileCount = parseInt(sections['FILES'].Count || '0', 10);
            for (let i = 0; i < fileCount; i++) {
                const fileName = sections['FILES'][`File${i}`];
                if (fileName) {
                    sourceFiles.push(path.join(projectPath, fileName));
                }
            }
        }
        
        // Extract header files
        const headerFiles: string[] = [];
        if (sections['HEADERS']) {
            const headerCount = parseInt(sections['HEADERS'].Count || '0', 10);
            for (let i = 0; i < headerCount; i++) {
                const headerName = sections['HEADERS'][`File${i}`];
                if (headerName) {
                    headerFiles.push(path.join(projectPath, headerName));
                }
            }
        }
        
        // Extract search paths
        const searchPaths: string[] = [];
        if (sections['SEARCH_PATH']) {
            const pathCount = parseInt(sections['SEARCH_PATH'].Count || '0', 10);
            for (let i = 0; i < pathCount; i++) {
                const searchPath = sections['SEARCH_PATH'][`Path${i}`];
                if (searchPath) {
                    searchPaths.push(searchPath);
                }
            }
        }
        
        // Extract include paths
        const includePaths: string[] = [];
        if (sections['HEADER_PATH']) {
            const pathCount = parseInt(sections['HEADER_PATH'].Count || '0', 10);
            for (let i = 0; i < pathCount; i++) {
                const includePath = sections['HEADER_PATH'][`Path${i}`];
                if (includePath) {
                    includePaths.push(includePath);
                }
            }
        }
        
        // Extract libraries (Uses) and convert to .emcl format
        const libraries: string[] = [];
        
        // First, add libraries explicitly listed in project file
        if (sections['Useses']) {
            const libCount = parseInt(sections['Useses'].Count || '0', 10);
            for (let i = 0; i < libCount; i++) {
                const libName = sections['Useses'][`File${i}`];
                if (libName) {
                    // Convert library name to .emcl file format
                    const emclName = this.convertLibraryToEmcl(libName, compilerType, deviceName);
                    if (!libraries.includes(emclName)) {
                        libraries.push(emclName);
                    }
                }
            }
        }
        
        // Detect additional required libraries by analyzing source code
        const detectedLibs = await this.detectRequiredLibraries(
            projectPath, 
            sourceFiles, 
            headerFiles, 
            compilerType, 
            deviceName
        );
        for (const lib of detectedLibs) {
            if (!libraries.includes(lib)) {
                libraries.push(lib);
            }
        }
        
        // Extract PLD files (Project Level Defines)
        const pldFiles: string[] = [];
        if (sections['PLDS']) {
            const pldCount = parseInt(sections['PLDS'].Count || '0', 10);
            for (let i = 0; i < pldCount; i++) {
                const pldName = sections['PLDS'][`File${i}`];
                if (pldName) {
                    pldFiles.push(pldName);
                }
            }
        }
        
        // Extract interrupt settings (PIC32 only)
        let ebase: string | undefined;
        let interruptDef: string | undefined;
        if (sections['INTERRUPT_DEFS']) {
            ebase = sections['INTERRUPT_DEFS'].EBASE;
            const spacing = sections['INTERRUPT_DEFS'].VECTOR_SPACEING;
            const mode = sections['INTERRUPT_DEFS'].VECTOR_MODE;
            const srs = sections['INTERRUPT_DEFS'].USE_SRS;
            
            if (mode === '1' && spacing && srs) {
                // Multi-vector mode with shadow register sets
                interruptDef = `MV_SRS${srs}_IS${spacing}`;
            }
        }
        
        // Try to extract flags from .log file
        const compilerFlags = this.parseLogFile(projectPath, projectName);
        
        return {
            projectPath,
            projectFile,
            projectName,
            compilerType,
            deviceName,
            clockFrequency,
            heapSize,
            sourceFiles,
            headerFiles,
            searchPaths,
            includePaths,
            libraries,
            pldFiles,
            ebase,
            interruptDef,
            compilerFlags
        };
    }
    
    /**
     * Convert library name to .emcl file format with device-specific suffix
     */
    private convertLibraryToEmcl(libName: string, compilerType: string, deviceName: string): string {
        // Map library names to their .emcl equivalents
        // Format: __Lib_LibraryName[_DeviceSuffix].emcl
        
        const libMap: Record<string, string> = {
            'C_Stdlib': '__Lib_CStdlib',
            'C_Type': '__Lib_CType',
            'C_String': '__Lib_CString',
            'C_Math': '__Lib_CMath',
            'Peripheral_Pin_Select': '__Lib_PPS',
            'UART': '__Lib_UART',
            'Sprintf': '__Lib_Sprintf',
            'Sprinti': '__Lib_Sprinti',
            'Sprintl': '__Lib_Sprintl',
            'Conversions': '__Lib_Conversions',
            'MemManager': '__Lib_MemManager',
            'Math': '__Lib_Math',
            'MathDouble': '__Lib_MathDouble',
            'System': '__Lib_System',
            'SoftReset': '__Lib_SoftResetDma',
            'Delays': '__Lib_Delays',
            'CP0': '__Lib_CP0'
        };
        
        let baseName = libMap[libName] || `__Lib_${libName}`;
        
        // Add device-specific suffix for PIC32
        if (compilerType === 'PIC32') {
            // Determine device family suffix
            if (deviceName.startsWith('P32MZ') && deviceName.includes('EF')) {
                // PIC32MZ EF family
                if (baseName === '__Lib_CStdlib' || baseName === '__Lib_CMath' || 
                    baseName === '__Lib_Conversions' || baseName === '__Lib_Sprintf') {
                    baseName += '_EF';
                } else if (baseName === '__Lib_MathDouble') {
                    baseName += '_MZ_EF';
                } else if (baseName === '__Lib_System') {
                    baseName += '_MZ_EF';
                } else if (baseName === '__Lib_UART') {
                    baseName += '_123456_MZ';
                } else if (baseName === '__Lib_PPS') {
                    // PPS library has pin count suffix
                    const pinMatch = deviceName.match(/(\d+)$/);
                    if (pinMatch) {
                        baseName += `_P32MZ_${pinMatch[1]}CAN`;
                    }
                }
            }
        }
        
        return `${baseName}.emcl`;
    }
    
    /**
     * Detect required libraries by analyzing source code
     */
    private async detectRequiredLibraries(
        projectPath: string,
        sourceFiles: string[],
        headerFiles: string[],
        compilerType: string,
        deviceName: string
    ): Promise<string[]> {
        const requiredLibs: string[] = [];
        
        // Combine all files to analyze
        const allFiles = [...sourceFiles, ...headerFiles];
        
        // Read all source/header files
        let allCode = '';
        for (const filePath of allFiles) {
            try {
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    allCode += '\n' + content;
                }
            } catch (err) {
                // Skip files that can't be read
            }
        }
        
        // Library detection patterns based on function usage
        const detectionRules = [
            // Core system libraries for PIC32
            { pattern: /(CP0_GET|CP0_SET|_mtc0|_mfc0|DisableInterrupts|EnableInterrupts)/i, libs: ['__Lib_CP0.emcl'] },
            { pattern: /(delay_ms|delay_us|delay_cyc|Delay_ms|Delay_us|Delay_Cyc)/i, libs: ['__Lib_Delays.emcl'] },
            
            // Math libraries
            { pattern: /(sqrt|sin|cos|tan|exp|log|pow|fabs|ceil|floor|asin|acos|atan)/i, libs: ['__Lib_Math.emcl'] },
            { pattern: /(double\s+|float\s+.*=.*\d+\.\d+)/i, libs: ['__Lib_MathDouble_MZ_EF.emcl'] },
            
            // System libraries
            { pattern: /(Reset|EnableSoftReset|SoftReset|DMA_|Dma_)/i, libs: ['__Lib_SoftResetDma.emcl'] },
            { pattern: /(Get_Fosc_kHz|Clock_|System_Clock)/i, libs: ['__Lib_System_MZ_EF.emcl'] },
            
            // String and conversion libraries
            { pattern: /(sprintf|snprintf|vsprintf)/i, libs: ['__Lib_Sprintf_EF.emcl'] },
            { pattern: /(sprinti|IntToStr)/i, libs: ['__Lib_Sprinti.emcl'] },
            { pattern: /(sprintl|LongToStr)/i, libs: ['__Lib_Sprintl.emcl'] },
            { pattern: /(atoi|atol|atof|itoa|ltoa|strtol|strtoul)/i, libs: ['__Lib_Conversions_EF.emcl'] },
            { pattern: /(malloc|calloc|free|realloc|MemManager_)/i, libs: ['__Lib_MemManager.emcl'] },
            
            // Standard C libraries
            { pattern: /(strcpy|strcmp|strcat|strlen|strchr|strstr|memcpy|memset|memmove|memcmp)/i, libs: ['__Lib_CString.emcl'] },
            { pattern: /(isalpha|isdigit|isspace|toupper|tolower|isalnum)/i, libs: ['__Lib_CType.emcl'] },
            { pattern: /(abs|labs|div|ldiv|rand|srand)/i, libs: ['__Lib_CStdlib_EF.emcl'] },
            { pattern: /(fabs|fabsf|ceil|ceilf|floor|floorf)/i, libs: ['__Lib_CMath_EF.emcl'] },
        ];
        
        // Apply detection rules
        for (const rule of detectionRules) {
            if (rule.pattern.test(allCode)) {
                for (const lib of rule.libs) {
                    // Adjust library name for device type if needed
                    let adjustedLib = lib;
                    
                    // For PIC32MZ EF devices, use device-specific variants
                    if (compilerType === 'PIC32' && deviceName.startsWith('P32MZ') && deviceName.includes('EF')) {
                        if (lib === '__Lib_MathDouble_MZ_EF.emcl' || 
                            lib === '__Lib_System_MZ_EF.emcl' ||
                            lib === '__Lib_CStdlib_EF.emcl' ||
                            lib === '__Lib_CMath_EF.emcl' ||
                            lib === '__Lib_Conversions_EF.emcl' ||
                            lib === '__Lib_Sprintf_EF.emcl') {
                            // Already has correct suffix
                            adjustedLib = lib;
                        }
                    }
                    
                    if (!requiredLibs.includes(adjustedLib)) {
                        requiredLibs.push(adjustedLib);
                    }
                }
            }
        }
        
        return requiredLibs;
    }
    
    /**
     * Convert Windows path to forward slashes (MikroC compiler compatible)
     */
    private normalizePath(pathStr: string): string {
        return pathStr.replace(/\\/g, '/');
    }
    
    /**
     * Resolve relative path to absolute (for MikroC search paths)
     */
    private resolveAbsolutePath(basePath: string, relativePath: string): string {
        // If already absolute, return as-is
        if (path.isAbsolute(relativePath)) {
            return this.normalizePath(relativePath);
        }
        // Resolve relative to project path
        const resolved = path.resolve(basePath, relativePath);
        return this.normalizePath(resolved);
    }
    
    /**
     * Parse INI-style file into sections
     */
    private parseINI(content: string): Record<string, Record<string, string>> {
        const sections: Record<string, Record<string, string>> = {};
        let currentSection: string | null = null;
        
        const lines = content.split(/\r?\n/);
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            // Skip empty lines and comments
            if (!trimmed || trimmed.startsWith(';')) {
                continue;
            }
            
            // Section header
            if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                currentSection = trimmed.slice(1, -1);
                sections[currentSection] = {};
                continue;
            }
            
            // Key-value pair
            if (currentSection) {
                const eqIndex = trimmed.indexOf('=');
                if (eqIndex > 0) {
                    const key = trimmed.substring(0, eqIndex).trim();
                    const value = trimmed.substring(eqIndex + 1).trim();
                    sections[currentSection][key] = value;
                }
            }
        }
        
        return sections;
    }
    
    /**
     * Parse .log file to extract actual compiler flags
     */
    private parseLogFile(projectPath: string, projectName: string): string[] {
        const logFile = path.join(projectPath, `${projectName}.log`);
        
        if (!fs.existsSync(logFile)) {
            return [];
        }
        
        try {
            const logContent = fs.readFileSync(logFile, 'utf-8');
            const lines = logContent.split(/\r?\n/);
            
            // Find the compiler command line (first line with mikroC*.exe)
            for (const line of lines) {
                if (line.includes('mikroC') && line.includes('.exe')) {
                    // Extract flags from command line
                    const flags: string[] = [];
                    const parts = line.split(/\s+/);
                    
                    for (let i = 1; i < parts.length; i++) {
                        const part = parts[i];
                        // Keep flags but skip file names
                        if (part.startsWith('-') && !part.endsWith('.c') && !part.endsWith('.emcl') && !part.endsWith('.pld')) {
                            flags.push(part);
                        }
                    }
                    
                    return flags;
                }
            }
        } catch (err) {
            console.warn('Failed to parse log file:', err);
        }
        
        return [];
    }
    
    /**
     * Validate user-provided compiler path
     */
    async validateCompilerPath(basePath: string, compilerType: string): Promise<MikroCCompilerPaths | null> {
        const compilerNames: Record<string, string> = {
            'PIC32': 'mikroCPIC32.exe',
            'PIC': 'mikroCPIC.exe',
            'dsPIC': 'mikroCdsPIC.exe',
            'AVR': 'mikroCAVR.exe',
            'ARM': 'mikroCARM.exe'
        };
        
        const compilerExeName = compilerNames[compilerType];
        if (!compilerExeName) {
            return null;
        }
        
        const compilerPath = path.join(basePath, compilerExeName);
        if (fs.existsSync(compilerPath)) {
            vscode.window.showInformationMessage(`Found compiler: ${compilerPath}`);
            return {
                compilerExe: compilerPath,
                installPath: basePath,
                defsPath: path.join(basePath, 'Defs'),
                usesPath: path.join(basePath, 'Uses')
            };
        } else {
            vscode.window.showErrorMessage(
                `Compiler not found at: ${compilerPath}\n\nExpected file: ${compilerExeName}`
            );
            return null;
        }
    }
    
    /**
     * Detect MikroC compiler installation path
     */
    async detectCompilerPath(compilerType: string): Promise<MikroCCompilerPaths | null> {
        const compilerNames: Record<string, string> = {
            'PIC32': 'mikroCPIC32.exe',
            'PIC': 'mikroCPIC.exe',
            'dsPIC': 'mikroCdsPIC.exe',
            'AVR': 'mikroCAVR.exe',
            'ARM': 'mikroCARM.exe'
        };
        
        const compilerExeName = compilerNames[compilerType];
        if (!compilerExeName) {
            return null;
        }
        
        // Try common installation paths (MikroElektronika default: C:\Users\Public\Documents\)
        const commonPaths = [
            `C:\\Users\\Public\\Documents\\Mikroelektronika\\mikroC PRO for ${compilerType}`,
            `C:\\Users\\Public\\MikroElektronika\\mikroC PRO for ${compilerType}`,
            `C:\\Program Files\\Mikroelektronika\\mikroC PRO for ${compilerType}`,
            `C:\\Program Files (x86)\\Mikroelektronika\\mikroC PRO for ${compilerType}`,
            `C:\\Mikroelektronika\\mikroC PRO for ${compilerType}`
        ];
        
        for (const basePath of commonPaths) {
            const compilerPath = path.join(basePath, compilerExeName);
            if (fs.existsSync(compilerPath)) {
                return {
                    compilerExe: compilerPath,
                    installPath: basePath,
                    defsPath: path.join(basePath, 'Defs'),
                    usesPath: path.join(basePath, 'Uses')
                };
            }
        }
        
        // Not found in standard locations
        return null;
    }
    
    /**
     * Generate Makefile for MikroC project
     */
    async generateMakefile(projectInfo: MikroCProjectInfo, compilerPaths: MikroCCompilerPaths): Promise<void> {
        const makefilePath = path.join(projectInfo.projectPath, 'Makefile');

        const installWin = compilerPaths.installPath.replace(/\//g, '\\');
        const projWin    = projectInfo.projectPath.replace(/\//g, '\\');
        const clockMHz   = Math.floor(projectInfo.clockFrequency / 1_000_000);
        const heapSize   = projectInfo.heapSize || 4096;

        // Base runtime libs required by MikroC linker (prepended before user libs)
        const isMZ = projectInfo.deviceName.toUpperCase().includes('MZ');
        const baseLibs = isMZ
            ? ['"__Lib_CP0.emcl"', '"__Lib_System_MZ_EF.emcl"']
            : ['"__Lib_CP0.emcl"', '"__Lib_System.emcl"'];

        // User libs — each individually quoted (deduplicate base libs)
        const baseLibNames = baseLibs.map(l => l.replace(/"/g, ''));
        const userLibs = projectInfo.libraries
            .filter(l => !baseLibNames.includes(l))
            .map(l => `"${l}"`);
        // PLD files individually quoted
        const plds = projectInfo.pldFiles.map(p => `"${p}"`);
        const allLibs = [...baseLibs, ...userLibs, ...plds].join(' ');

        let ebaseFlag = '';
        if (projectInfo.ebase) {
            const ebaseValue = projectInfo.ebase.startsWith('0x') || projectInfo.ebase.startsWith('0X')
                ? projectInfo.ebase : `0x${projectInfo.ebase}`;
            ebaseFlag = ` -EBASE ${ebaseValue}`;
        }
        const intdefFlag = projectInfo.interruptDef ? ` -INTDEF ${projectInfo.interruptDef}` : '';

        const cflags = `-MSF -DBG -p$(DEVICE) -HEAP ${heapSize} -Y -DL -SSA${ebaseFlag}${intdefFlag} -O11111113 -fo$(CLOCK)`;

        const makefileContent = `# MikroC Project Makefile
# Generated by XC Project Importer
# Project: ${projectInfo.projectName}
# Device: ${projectInfo.deviceName}
# Compiler: MikroC PRO for ${projectInfo.compilerType}

SHELL := powershell.exe
.SHELLFLAGS := -NoProfile -Command

# Compiler and paths (override: make COMPILER="your\\path\\mikroC${projectInfo.compilerType}.exe")
COMPILER := ${installWin}\\mikroC${projectInfo.compilerType}.exe
DEFS_DIR  := ${installWin}\\Defs
USES_DIR  := ${installWin}\\Uses
SRC_DIR   := ${projWin}

# Project settings
MODULE = ${projectInfo.projectName}
DEVICE = ${projectInfo.deviceName}
CLOCK  = ${clockMHz}

# Auto-discover all .c files in this folder and quote each one
SOURCES_RAW := $(wildcard *.c)
SOURCES     := $(foreach src,$(SOURCES_RAW),"$(src)")

# Library files - each individually quoted (base runtime libs first)
LIBS := ${allLibs}

# Compiler flags
CFLAGS := ${cflags}

.PHONY: all rebuild clean

all:
\t& "$(COMPILER)" $(CFLAGS) -N"$(SRC_DIR)\\$(MODULE).mcp32" -SP"$(DEFS_DIR)\\" -SP"$(USES_DIR)\\" -SP"$(SRC_DIR)\\" -IP"$(USES_DIR)\\" -IP"$(SRC_DIR)" $(SOURCES) $(LIBS)
	if (Test-Path "$(MODULE).hex") { New-Item -ItemType Directory -Force bins | Out-Null; Move-Item -Force "$(MODULE).hex" "bins\\$(MODULE).hex"; Write-Host "Build complete! bins\\$(MODULE).hex" } else { Write-Error "Build FAILED - no hex file generated"; exit 1 }

rebuild:
	& "$(COMPILER)" $(CFLAGS) -RA -N"$(SRC_DIR)\\$(MODULE).mcp32" -SP"$(DEFS_DIR)\\" -SP"$(USES_DIR)\\" -SP"$(SRC_DIR)\\" -IP"$(USES_DIR)\\" -IP"$(SRC_DIR)" $(SOURCES) $(LIBS)
	if (Test-Path "$(MODULE).hex") { New-Item -ItemType Directory -Force bins | Out-Null; Move-Item -Force "$(MODULE).hex" "bins\\$(MODULE).hex"; Write-Host "Build complete! bins\\$(MODULE).hex" } else { Write-Error "Build FAILED - no hex file generated"; exit 1 }

clean:
	Get-ChildItem . -Include *.emcl,*.asm,*.lst,*.log,*.mcl,*.user.dic -ErrorAction SilentlyContinue | Remove-Item -Force
	if (Test-Path bins) { Remove-Item -Force bins\\*.hex -ErrorAction SilentlyContinue }
\tWrite-Host "Clean complete."
`;
        
        fs.writeFileSync(makefilePath, makefileContent, 'utf-8');
        vscode.window.showInformationMessage(`Generated Makefile at ${makefilePath}`);
    }
}
