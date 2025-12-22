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
        if (sections['Useses']) {
            const libCount = parseInt(sections['Useses'].Count || '0', 10);
            for (let i = 0; i < libCount; i++) {
                const libName = sections['Useses'][`File${i}`];
                if (libName) {
                    // Convert library name to .emcl file format
                    const emclName = this.convertLibraryToEmcl(libName, compilerType, deviceName);
                    libraries.push(emclName);
                }
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
                    const pinMatch = deviceName.match(/(\\d+)$/);
                    if (pinMatch) {
                        baseName += `_P32MZ_${pinMatch[1]}CAN`;
                    }
                }
            }
        }
        
        return `${baseName}.emcl`;
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
        
        // Build source file list with quotes (Windows format)
        const sources = projectInfo.sourceFiles
            .map(f => `"${path.relative(projectInfo.projectPath, f)}"`)
            .join(' ');
        
        // Build library list (.emcl files - already converted)
        const libs = projectInfo.libraries.map(lib => `"${lib}"`).join(' ');
        
        // Build PLD file list
        const plds = projectInfo.pldFiles.map(pld => `"${pld}"`).join(' ');
        
        // Build search path flags with Windows backslashes and trailing backslashes
        // Filter out paths that don't exist to avoid compiler warnings
        const validSearchPaths = projectInfo.searchPaths
            .map(p => path.resolve(projectInfo.projectPath, p))
            .filter(p => {
                try {
                    return fs.existsSync(p);
                } catch {
                    return false;
                }
            });
        
        const validIncludePaths = projectInfo.includePaths
            .map(p => path.resolve(projectInfo.projectPath, p))
            .filter(p => {
                try {
                    return fs.existsSync(p);
                } catch {
                    return false;
                }
            });
        
        // Format paths with Windows backslashes and trailing backslashes (MikroC requires this)
        const searchPathFlags = validSearchPaths
            .map(p => `-SP"${p}\\\\"`)
            .join(' ');
        
        const includePathFlags = validIncludePaths
            .map(p => `-IP"${p}\\\\"`)
            .join(' ');
        
        // Always include standard paths with Windows backslashes  
        const projectPathWin = projectInfo.projectPath.replace(/\//g, '\\\\');
        const stdPaths = `-SP"\$(MIKROC_PATH)\\\\Defs\\\\" -SP"\$(MIKROC_PATH)\\\\Uses\\\\" -SP"${projectPathWin}\\\\" -IP"\$(MIKROC_PATH)\\\\Uses\\\\" -IP"${projectPathWin}\\\\"`;
        
        // Build flags (NOTE: -Y flag must come AFTER -HEAP and BEFORE -DL for proper parsing)
        let flags = `-MSF -DBG -p${projectInfo.deviceName}`;
        
        if (projectInfo.heapSize) {
            flags += ` -HEAP ${projectInfo.heapSize}`;
        }
        
        // Add -Y flag here (after HEAP, before DL)
        flags += ` -Y`;
        
        flags += ` -DL -SSA`;
        
        if (projectInfo.ebase) {
            // Add 0x prefix if not present
            const ebaseValue = projectInfo.ebase.startsWith('0x') || projectInfo.ebase.startsWith('0X') 
                ? projectInfo.ebase 
                : `0x${projectInfo.ebase}`;
            flags += ` -EBASE ${ebaseValue}`;
        }
        
        if (projectInfo.interruptDef) {
            flags += ` -INTDEF ${projectInfo.interruptDef}`;
        }
        
        flags += ` -O11111113 -fo${Math.floor(projectInfo.clockFrequency / 1000000)}`;
        
        // Add -N flag with project file
        flags += ` -N"${projectInfo.projectFile}"`;
        
        // Add search/include paths
        flags += ` ${stdPaths}`;
        if (searchPathFlags) {
            flags += ` ${searchPathFlags}`;
        }
        if (includePathFlags) {
            flags += ` ${includePathFlags}`;
        }
        
        const makefileContent = `# MikroC Project Makefile
# Generated by XC Project Importer
# Project: ${projectInfo.projectName}
# Device: ${projectInfo.deviceName}
# Compiler: MikroC PRO for ${projectInfo.compilerType}

# Compiler path (can be overridden with: make MIKROC_PATH="/custom/path")
MIKROC_PATH ?= ${compilerPaths.installPath}
MIKROC = "\$(MIKROC_PATH)/mikroC${projectInfo.compilerType}.exe"

# Project settings
DEVICE = ${projectInfo.deviceName}
CLOCK = ${projectInfo.clockFrequency}
PROJECT_NAME = ${projectInfo.projectName}

# Source files
SRCS = ${sources}

# Library files (MikroC compiled libraries)
LIBS = ${libs}

# Project definition files
PLDS = ${plds}

# Compiler flags
FLAGS = ${flags}

# Build target
all:
\t@echo Building \$(PROJECT_NAME) for \$(DEVICE)...
\t\$(MIKROC) \$(FLAGS) \$(SRCS) \$(LIBS) \$(PLDS)
# Build target
all:
\t@echo Building \$(PROJECT_NAME) for \$(DEVICE)...
\t\$(MIKROC) \$(FLAGS) \$(SRCS) \$(LIBS) \$(PLDS)
\t@echo Build complete! Output: \$(PROJECT_NAME).hex

# Clean build artifacts
clean:
\t@echo Cleaning build artifacts...
\t@rm -f *.emcl *.asm *.lst *.log *.mcl *.user.dic 2>nul || true
\t@echo Clean complete!

# Flash using MikroC bootloader
flash: all
\t@echo Flashing $(PROJECT_NAME).hex...
\t@"bin/mikro_hb.exe" "$(PROJECT_NAME).hex"

.PHONY: all clean flash
`;
        
        fs.writeFileSync(makefilePath, makefileContent, 'utf-8');
        vscode.window.showInformationMessage(`Generated Makefile at ${makefilePath}`);
    }
}
