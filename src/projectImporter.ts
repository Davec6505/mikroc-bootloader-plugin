/**
 * Project Importer - Parse MPLABX and MikroC projects
 * Extracts toolchain paths, device info, and project structure
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface ProjectInfo {
    projectType: 'mplabx' | 'mikroc';
    projectName: string;
    deviceName: string;
    
    // Toolchain paths (from MPLABX Makefiles)
    compilerBinDir?: string;        // MP_CC_DIR
    dfpPath?: string;               // DFP_DIR
    compiler: string;               // 'XC32', 'XC16', 'XC8', or 'mikroC'
    
    // Project files
    sourceFiles: string[];
    headerFiles: string[];
    includePaths: string[];
    defines: Map<string, string>;
    linkerScript?: string;
    
    // Memory configuration
    heapSize?: string;              // Extracted from linker flags
    stackSize?: string;
    
    // Startup configuration
    usesCrt0?: boolean;             // true = using crt0.o, false = using startup.S (-no-startup-files)
    
    // Build flags from MPLABX
    cflags?: string[];              // Parsed compiler flags
    ldflags?: string[];             // Parsed linker flags
    
    // Project paths
    xFolderPath?: string;           // Path to .X folder (for re-import)
    sourceRoot?: string;            // Parent directory with src/
}

export interface ProjectMetadata {
    projectType: 'mplabx' | 'mikroc';
    sourceProject: string;          // Original MPLABX .X folder path
    device: string;
    imported: string;               // ISO date
    lastSync: string;               // ISO date
    toolchain: {
        compiler: string;
        compilerPath: string;
        dfpPath?: string;
    };
    folders: {
        mccGenerated: string;       // e.g., "srcs/config/default"
        userCode: string[];         // e.g., ["srcs/app", "srcs/drivers"]
    };
}

// ========================
// Metadata Management Functions
// ========================

/**
 * Save project metadata to .vscode/pic32-project.json
 */
export function saveMetadata(projectRoot: string, metadata: ProjectMetadata): void {
    const vscodePath = path.join(projectRoot, '.vscode');
    if (!fs.existsSync(vscodePath)) {
        fs.mkdirSync(vscodePath, { recursive: true });
    }

    const metadataPath = path.join(vscodePath, 'pic32-project.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 4), 'utf-8');
}

/**
 * Read project metadata from .vscode/pic32-project.json
 */
export function readMetadata(projectRoot: string): ProjectMetadata | null {
    const metadataPath = path.join(projectRoot, '.vscode', 'pic32-project.json');
    
    if (!fs.existsSync(metadataPath)) {
        return null;
    }

    try {
        const content = fs.readFileSync(metadataPath, 'utf-8');
        return JSON.parse(content) as ProjectMetadata;
    } catch (error) {
        console.error('Failed to parse metadata:', error);
        return null;
    }
}

/**
 * Update project metadata (typically for re-sync operations)
 */
export function updateMetadata(projectRoot: string, updates: Partial<ProjectMetadata>): void {
    const existing = readMetadata(projectRoot);
    
    if (!existing) {
        throw new Error('No metadata found to update');
    }

    const updated: ProjectMetadata = {
        ...existing,
        ...updates,
        lastSync: new Date().toISOString(),
    };

    saveMetadata(projectRoot, updated);
}

// ========================
// Project Importers
// ========================

export class MPLABXImporter {
    /**
     * Parse an MPLABX project (.X folder)
     * Extracts toolchain paths, device info, source files, and memory config
     */
    async parseProject(projectPath: string): Promise<ProjectInfo | null> {
        // Ensure we have the .X folder
        if (!projectPath.endsWith('.X')) {
            const xFolders = fs.readdirSync(projectPath).filter(f => f.endsWith('.X'));
            if (xFolders.length === 0) {
                vscode.window.showErrorMessage('No MPLABX .X folder found');
                return null;
            }
            projectPath = path.join(projectPath, xFolders[0]);
        }

        const projectName = path.basename(projectPath, '.X');
        const nbprojectPath = path.join(projectPath, 'nbproject');

        // Parse Makefile-local-default.mk for toolchain paths
        const toolchainPaths = this.parseToolchainPaths(nbprojectPath);
        if (!toolchainPaths.compilerBinDir) {
            vscode.window.showErrorMessage('Could not find compiler paths in MPLABX Makefiles');
            return null;
        }

        // Parse Makefile-default.mk for device and build configuration
        const buildConfig = this.parseBuildConfig(nbprojectPath);
        if (!buildConfig.device) {
            vscode.window.showErrorMessage('Could not find device configuration in MPLABX Makefiles');
            return null;
        }

        // Determine compiler family from path
        const compiler = this.detectCompilerFamily(toolchainPaths.compilerBinDir);

        // Find all source files in parent directory
        const parentDir = path.dirname(projectPath);
        const sourceFiles = this.findSourceFiles(parentDir, ['.c', '.cpp', '.S']);
        const headerFiles = this.findSourceFiles(parentDir, ['.h', '.hpp']);

        // Extract include paths from configurations.xml (optional enhancement)
        const includePaths: string[] = [
            path.join(parentDir, 'src'),
            path.join(parentDir, 'src', 'config', 'default')
        ];

        // Find linker script
        const linkerScript = this.findLinkerScript(parentDir);

        return {
            projectType: 'mplabx',
            projectName,
            deviceName: buildConfig.device,
            compilerBinDir: toolchainPaths.compilerBinDir,
            dfpPath: toolchainPaths.dfpPath,
            compiler,
            sourceFiles,
            headerFiles,
            includePaths,
            defines: new Map<string, string>(),
            linkerScript,
            heapSize: buildConfig.heapSize,
            stackSize: '4096',  // Default, can be extracted if needed
            usesCrt0: buildConfig.usesCrt0,
            cflags: buildConfig.cflags,
            ldflags: buildConfig.ldflags,
            xFolderPath: projectPath,
            sourceRoot: parentDir,
        };
    }

    /**
     * Parse Makefile-local-default.mk for toolchain paths
     */
    private parseToolchainPaths(nbprojectPath: string): {
        compilerBinDir: string;
        dfpPath: string;
    } {
        const makefileLocal = path.join(nbprojectPath, 'Makefile-local-default.mk');
        
        if (!fs.existsSync(makefileLocal)) {
            return { compilerBinDir: '', dfpPath: '' };
        }

        const content = fs.readFileSync(makefileLocal, 'utf-8');
        
        // Extract MP_CC_DIR="C:\Program Files\Microchip\xc32\v4.60\bin"
        const ccDirMatch = content.match(/MP_CC_DIR="(.+?)"/);
        let compilerBinDir = ccDirMatch ? ccDirMatch[1] : '';
        
        // Convert Windows backslashes to forward slashes for consistency
        compilerBinDir = compilerBinDir.replace(/\\/g, '/');
        
        // Extract DFP_DIR=C:/Program Files/Microchip/MPLABX/.../PIC32MZ-EF_DFP/1.4.168
        const dfpMatch = content.match(/DFP_DIR=(.+)/);
        let dfpPath = dfpMatch ? dfpMatch[1].trim() : '';
        
        // Normalize path separators
        dfpPath = dfpPath.replace(/\\/g, '/');
        
        return { compilerBinDir, dfpPath };
    }

    /**
     * Parse Makefile-default.mk for device and build configuration
     */
    private parseBuildConfig(nbprojectPath: string): {
        device: string;
        heapSize: string;
        usesCrt0: boolean;
        cflags: string[];
        ldflags: string[];
    } {
        const makefileDefault = path.join(nbprojectPath, 'Makefile-default.mk');
        
        if (!fs.existsSync(makefileDefault)) {
            return { device: '', heapSize: '50000', usesCrt0: true, cflags: [], ldflags: [] };
        }

        const content = fs.readFileSync(makefileDefault, 'utf-8');
        
        // Extract MP_PROCESSOR_OPTION=32MZ2048EFH100
        const processorMatch = content.match(/MP_PROCESSOR_OPTION=(\w+)/);
        const device = processorMatch ? processorMatch[1] : '';
        
        // Extract heap size from linker flags: --defsym=_min_heap_size=50000
        const heapMatch = content.match(/--defsym=_min_heap_size=(\d+)/);
        const heapSize = heapMatch ? heapMatch[1] : '50000';
        
        // Check if using CRT0 or custom startup.S
        // XC32 uses -nostartfiles flag (not -no-startup-files)
        // If -nostartfiles is present, project uses custom startup.S
        const usesCrt0 = !content.includes('-nostartfiles');
        
        // Parse CFLAGS from compile command (look for ${MP_CC} ... -c ...)
        const cflags = this.parseCFlags(content);
        
        // Parse LDFLAGS from linker command (look for ${MP_CC} ... -o ${DISTDIR}...)
        const ldflags = this.parseLDFlags(content);
        
        return { device, heapSize, usesCrt0, cflags, ldflags };
    }
    
    /**
     * Parse CFLAGS from MPLABX compile commands
     */
    private parseCFlags(makefileContent: string): string[] {
        const flags: string[] = [];
        
        // Find a compile command: ${MP_CC} ... -c -mprocessor=...
        const compileMatch = makefileContent.match(/\$\{MP_CC\}[^\n]+?-c[^\n]+?-mprocessor=\$\(MP_PROCESSOR_OPTION\)([^\n]+?)(?:-o|\$\{OBJECTDIR\})/s);
        if (compileMatch) {
            console.log('[CFLAGS Parser] Found compile command');
            const flagsStr = compileMatch[1];
            console.log('[CFLAGS Parser] Raw flags string:', flagsStr.substring(0, 200));
            
            // Extract relevant flags, skip -MP -MMD -MF (dependency flags), skip -I includes (handled separately)
            const matches = flagsStr.match(/-[A-Za-z0-9_-]+(?:=\S+)?/g);
            if (matches) {
                console.log('[CFLAGS Parser] All matches:', matches);
                flags.push(...matches.filter(f => 
                    !f.startsWith('-I') &&          // Skip includes
                    !f.startsWith('-D') &&          // Skip defines  
                    f !== '-MP' &&                  // Skip dependency flags
                    f !== '-MMD' &&
                    f !== '-MF' &&
                    f !== '-c' &&                   // Skip compile flag
                    f !== '-x' &&                   // Skip language spec
                    f !== '-o'                      // Skip output flag
                ));
                console.log('[CFLAGS Parser] Filtered flags:', flags);
            }
        } else {
            console.log('[CFLAGS Parser] No compile command found');
        }
        
        return flags;
    }
    
    /**
     * Parse LDFLAGS from MPLABX linker commands
     */
    private parseLDFlags(makefileContent: string): string[] {
        const flags: string[] = [];
        
        // Find linker command: ${MP_CC} ... -o ${DISTDIR}...
        const linkerMatch = makefileContent.match(/\$\{MP_CC\}[^\n]+?-o \$\{DISTDIR\}[^\n]+/s);
        if (linkerMatch) {
            console.log('[LDFLAGS Parser] Found linker command');
            const linkerCmd = linkerMatch[0];
            console.log('[LDFLAGS Parser] Linker command length:', linkerCmd.length);
            
            // Extract -nostartfiles if present
            if (linkerCmd.includes('-nostartfiles')) {
                flags.push('-nostartfiles');
                console.log('[LDFLAGS Parser] Found -nostartfiles flag');
            }
            
            // Extract -Wl,... flags
            const wlMatches = linkerCmd.match(/-Wl,[^\s"]+/g);
            if (wlMatches) {
                console.log('[LDFLAGS Parser] All -Wl flags:', wlMatches);
                wlMatches.forEach(wl => {
                    // Skip map file, defsym (handled separately), and build markers
                    if (!wl.includes('-Map=') && 
                        !wl.includes('--defsym=_min_heap_size') &&
                        !wl.includes('--defsym=_min_stack_size') &&
                        !wl.includes('--defsym=__MPLAB') &&
                        !wl.includes('--memorysummary') &&
                        !wl.includes(',--script=')) {
                        flags.push(wl);
                    }
                });
                console.log('[LDFLAGS Parser] Filtered LDFLAGS:', flags);
            }
        } else {
            console.log('[LDFLAGS Parser] No linker command found');
        }
        
        return flags;
    }

    /**
     * Detect compiler family from bin directory path
     */
    private detectCompilerFamily(compilerBinDir: string): string {
        const lowerPath = compilerBinDir.toLowerCase();
        
        if (lowerPath.includes('xc32')) {
            return 'XC32';
        } else if (lowerPath.includes('xc16')) {
            return 'XC16';
        } else if (lowerPath.includes('xc8')) {
            return 'XC8';
        }
        
        return 'XC32';  // Default assumption
    }

    /**
     * Copy MPLABX project files to VS Code workspace with header organization
     * @param projectInfo Parsed project information
     * @param targetRoot Target directory for VS Code project
     */
    async copyAndOrganizeFiles(projectInfo: ProjectInfo, targetRoot: string): Promise<void> {
        // Create directory structure
        const dirs = ['srcs', 'incs', 'objs', 'bins', 'other', 'docs'];
        for (const dir of dirs) {
            const dirPath = path.join(targetRoot, dir);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
        }

        // Copy MCC-generated files (preserve structure under config/default)
        const mccConfigPath = path.join(projectInfo.sourceRoot!, 'src', 'config', 'default');
        if (fs.existsSync(mccConfigPath)) {
            await this.copyDirectoryStructure(
                mccConfigPath,
                path.join(targetRoot, 'srcs', 'config', 'default')
            );
        }

        // Copy user source files from .X parent directory (src/ folder)
        const userFiles = projectInfo.sourceFiles.filter(f => 
            !f.includes('config') && 
            !f.includes('nbproject') &&
            !f.includes('.X')
        );

        for (const srcFile of userFiles) {
            const relativePath = path.relative(projectInfo.sourceRoot!, srcFile);
            const targetPath = path.join(targetRoot, 'srcs', relativePath);
            
            // Ensure target directory exists
            const targetDir = path.dirname(targetPath);
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }
            
            fs.copyFileSync(srcFile, targetPath);
        }

        // Copy user files from .X folder (excluding nbproject, build, dist)
        if (projectInfo.xFolderPath) {
            const xFolderFiles = fs.readdirSync(projectInfo.xFolderPath, { withFileTypes: true });
            
            for (const entry of xFolderFiles) {
                // Skip directories and non-source files
                if (entry.isDirectory() || 
                    entry.name === 'nbproject' || 
                    entry.name === 'build' || 
                    entry.name === 'dist' ||
                    entry.name.endsWith('.X') ||
                    entry.name === 'startup.S') {  // Skip startup.S - we'll generate it if needed
                    continue;
                }
                
                const srcPath = path.join(projectInfo.xFolderPath, entry.name);
                const ext = path.extname(entry.name).toLowerCase();
                
                // Copy user .c/.h/.S files to srcs/
                if (ext === '.c' || ext === '.h' || ext === '.s' || ext === '.cpp' || ext === '.hpp') {
                    const targetPath = path.join(targetRoot, 'srcs', entry.name);
                    fs.copyFileSync(srcPath, targetPath);
                }
            }
        }

        // Generate startup.S from template if using custom startup (not CRT0)
        if (projectInfo.usesCrt0 === false) {
            const startupDir = path.join(targetRoot, 'srcs', 'startup');
            if (!fs.existsSync(startupDir)) {
                fs.mkdirSync(startupDir, { recursive: true });
            }
            
            console.log('[Startup] Generating startup.S from template');
            // Read template - no device substitution needed, template is complete
            const templatePath = path.join(__dirname, 'templates', 'xc32', 'startup.S');
            const startupContent = fs.readFileSync(templatePath, 'utf-8');
            
            fs.writeFileSync(path.join(startupDir, 'startup.S'), startupContent);
        }

        // Organize headers: move all .h files from srcs/ to incs/ (preserving folder structure)
        await this.organizeHeaders(
            path.join(targetRoot, 'srcs'),
            path.join(targetRoot, 'incs')
        );

        // Copy linker script to other/
        if (projectInfo.linkerScript) {
            const ldTarget = path.join(targetRoot, 'other', path.basename(projectInfo.linkerScript));
            fs.copyFileSync(projectInfo.linkerScript, ldTarget);
        }
    }

    /**
     * Copy directory structure recursively, preserving folder hierarchy
     */
    private async copyDirectoryStructure(src: string, dest: string): Promise<void> {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }

        const entries = fs.readdirSync(src, { withFileTypes: true });

        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);

            if (entry.isDirectory()) {
                await this.copyDirectoryStructure(srcPath, destPath);
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }

    /**
     * Move all .h files from srcs/ to incs/, preserving folder structure
     */
    private async organizeHeaders(srcsDir: string, incsDir: string): Promise<void> {
        const walk = (currentDir: string) => {
            if (!fs.existsSync(currentDir)) {
                return;
            }

            const entries = fs.readdirSync(currentDir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);

                if (entry.isDirectory()) {
                    walk(fullPath);
                } else if (entry.isFile() && entry.name.endsWith('.h')) {
                    // Calculate relative path from srcsDir
                    const relativePath = path.relative(srcsDir, fullPath);
                    const targetPath = path.join(incsDir, relativePath);

                    // Ensure target directory exists
                    const targetDir = path.dirname(targetPath);
                    if (!fs.existsSync(targetDir)) {
                        fs.mkdirSync(targetDir, { recursive: true });
                    }

                    // Move the header file
                    fs.renameSync(fullPath, targetPath);
                }
            }
        };

        walk(srcsDir);
    }

    /**
     * Recursively find source files with specified extensions
     */
    private findSourceFiles(dir: string, extensions: string[]): string[] {
        const files: string[] = [];
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory()) {
                // Skip certain directories
                if (entry.name === 'node_modules' || entry.name === '.git' || 
                    entry.name === 'build' || entry.name.endsWith('.X')) {
                    continue;
                }
                files.push(...this.findSourceFiles(fullPath, extensions));
            } else if (entry.isFile()) {
                const ext = path.extname(entry.name).toLowerCase();
                if (extensions.includes(ext)) {
                    files.push(fullPath);
                }
            }
        }

        return files;
    }

    private findLinkerScript(dir: string): string | undefined {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            if (entry.isFile() && entry.name.endsWith('.ld')) {
                return path.join(dir, entry.name);
            } else if (entry.isDirectory() && entry.name !== '.X' && entry.name !== 'node_modules') {
                const result = this.findLinkerScript(path.join(dir, entry.name));
                if (result) {
                    return result;
                }
            }
        }
        
        return undefined;
    }
}

export class MikroCImporter {
    /**
     * Parse a MikroC project (.mcppi file)
     */
    async parseProject(projectPath: string): Promise<ProjectInfo | null> {
        // Look for .mcppi file
        let mcppiFile: string | undefined;
        
        if (projectPath.endsWith('.mcppi')) {
            mcppiFile = projectPath;
            projectPath = path.dirname(projectPath);
        } else {
            const mcppiFiles = fs.readdirSync(projectPath).filter(f => f.endsWith('.mcppi'));
            if (mcppiFiles.length === 0) {
                vscode.window.showErrorMessage('No MikroC .mcppi file found');
                return null;
            }
            mcppiFile = path.join(projectPath, mcppiFiles[0]);
        }

        const projectName = path.basename(mcppiFile, '.mcppi');
        
        // Parse .mcppi (it's an INI-style file)
        const mcppiContent = fs.readFileSync(mcppiFile, 'utf-8');
        
        // Extract device name
        const deviceMatch = mcppiContent.match(/Device=(.+)/);
        const deviceName = deviceMatch ? deviceMatch[1].trim() : 'Unknown';

        // Find source files
        const sourceFiles = this.findSourceFiles(projectPath, ['.c', '.cpp']);
        const headerFiles = this.findSourceFiles(projectPath, ['.h', '.hpp']);

        // MikroC has simpler structure
        const includePaths: string[] = [projectPath];
        const defines = new Map<string, string>();

        return {
            projectType: 'mikroc',
            projectName,
            deviceName,
            sourceFiles,
            headerFiles,
            includePaths,
            defines,
            compiler: 'mikroC',
        };
    }

    private findSourceFiles(dir: string, extensions: string[]): string[] {
        const files: string[] = [];
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isFile()) {
                const ext = path.extname(entry.name).toLowerCase();
                if (extensions.includes(ext)) {
                    files.push(fullPath);
                }
            } else if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
                files.push(...this.findSourceFiles(fullPath, extensions));
            }
        }

        return files;
    }
}
