/**
 * Make Tool Detector - Detects and installs GNU Make for Windows
 */

import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

export class MakeToolDetector {
    private readonly context: vscode.ExtensionContext;
    
    // MSYS2 minimal package with make, bash, coreutils
    private readonly MSYS2_PORTABLE_URL = 'https://repo.msys2.org/distrib/msys2-base-x86_64-latest.sfx.exe';
    
    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    /**
     * Check if make is available in PATH
     */
    public async isMakeAvailable(): Promise<boolean> {
        return new Promise((resolve) => {
            cp.exec('where make', (error) => {
                resolve(!error);
            });
        });
    }

    /**
     * Get the path to make if available
     */
    public async getMakePath(): Promise<string | null> {
        return new Promise((resolve) => {
            cp.exec('where make', (error, stdout) => {
                if (error) {
                    resolve(null);
                } else {
                    const paths = stdout.trim().split('\n');
                    resolve(paths[0].trim());
                }
            });
        });
    }

    /**
     * Ensure make is available, prompt to install if not
     */
    public async ensureMake(): Promise<boolean> {
        if (await this.isMakeAvailable()) {
            return true;
        }

        // Prompt user
        const choice = await vscode.window.showWarningMessage(
            'GNU Make is required to build XC32 projects but was not found in PATH.',
            'Install MSYS2 Make',
            'Manual Setup',
            'Cancel'
        );

        if (choice === 'Install MSYS2 Make') {
            return await this.installMSYS2Tools();
        } else if (choice === 'Manual Setup') {
            this.showManualSetupInstructions();
            return false;
        }

        return false;
    }

    /**
     * Install MSYS2 minimal tools
     */
    private async installMSYS2Tools(): Promise<boolean> {
        return await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Installing MSYS2 Build Tools',
            cancellable: true
        }, async (progress, token) => {
            try {
                progress.report({ message: 'Preparing installation...' });

                // Install to extension storage
                const toolsDir = path.join(this.context.globalStorageUri.fsPath, 'msys2');
                if (!fs.existsSync(toolsDir)) {
                    fs.mkdirSync(toolsDir, { recursive: true });
                }

                // Download MSYS2 portable
                progress.report({ message: 'Downloading MSYS2 (this may take a few minutes)...' });
                const installerPath = path.join(toolsDir, 'msys2-installer.exe');
                
                await this.downloadFile(this.MSYS2_PORTABLE_URL, installerPath, (downloaded, total) => {
                    if (token.isCancellationRequested) {
                        throw new Error('Installation cancelled');
                    }
                    const percent = Math.floor((downloaded / total) * 100);
                    progress.report({ message: `Downloading MSYS2... ${percent}%` });
                });

                // Extract/Install MSYS2
                progress.report({ message: 'Installing MSYS2...' });
                await this.extractMSYS2(installerPath, toolsDir);

                // Add to PATH
                const binPath = path.join(toolsDir, 'usr', 'bin');
                progress.report({ message: 'Adding to PATH...' });
                await this.addToPath(binPath);

                // Verify installation
                if (await this.isMakeAvailable()) {
                    vscode.window.showInformationMessage(
                        'MSYS2 Build Tools installed successfully! You may need to restart VS Code.'
                    );
                    return true;
                } else {
                    throw new Error('Make still not available after installation');
                }

            } catch (error) {
                vscode.window.showErrorMessage(
                    `Failed to install MSYS2: ${error instanceof Error ? error.message : 'Unknown error'}`
                );
                this.showManualSetupInstructions();
                return false;
            }
        });
    }

    /**
     * Download file with progress
     */
    private downloadFile(url: string, dest: string, onProgress?: (downloaded: number, total: number) => void): Promise<void> {
        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(dest);
            
            https.get(url, (response) => {
                if (response.statusCode === 302 || response.statusCode === 301) {
                    // Follow redirect
                    file.close();
                    fs.unlinkSync(dest);
                    return this.downloadFile(response.headers.location!, dest, onProgress).then(resolve).catch(reject);
                }

                const total = parseInt(response.headers['content-length'] || '0', 10);
                let downloaded = 0;

                response.on('data', (chunk) => {
                    downloaded += chunk.length;
                    onProgress?.(downloaded, total);
                });

                response.pipe(file);

                file.on('finish', () => {
                    file.close();
                    resolve();
                });
            }).on('error', (err) => {
                fs.unlinkSync(dest);
                reject(err);
            });
        });
    }

    /**
     * Extract MSYS2 self-extracting archive
     */
    private async extractMSYS2(installerPath: string, destDir: string): Promise<void> {
        return new Promise((resolve, reject) => {
            // MSYS2 sfx.exe can be extracted with 7z or run with -y flag for silent extraction
            // For simplicity, we'll use PowerShell to extract
            const extractCmd = `Start-Process -FilePath "${installerPath}" -ArgumentList "-y","-o${destDir}" -Wait -NoNewWindow`;
            
            cp.exec(`powershell -Command "${extractCmd}"`, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Add directory to user PATH
     */
    private async addToPath(dir: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const psScript = `
                $path = [Environment]::GetEnvironmentVariable('Path', 'User')
                if ($path -notlike '*${dir}*') {
                    [Environment]::SetEnvironmentVariable('Path', "$path;${dir}", 'User')
                    Write-Host 'Added to PATH'
                }
            `;
            
            cp.exec(`powershell -Command "${psScript}"`, (error) => {
                if (error) {
                    reject(error);
                } else {
                    // Update current process PATH
                    process.env.PATH = `${process.env.PATH};${dir}`;
                    resolve();
                }
            });
        });
    }

    /**
     * Show manual setup instructions
     */
    private showManualSetupInstructions(): void {
        const instructions = `
# Manual MSYS2 Setup

To build XC32 projects, you need GNU Make in your PATH.

## Option 1: Install MSYS2 (Recommended)
1. Download MSYS2 from: https://www.msys2.org/
2. Install to C:\\msys64 (or your preferred location)
3. Add C:\\msys64\\usr\\bin to your system PATH
4. Restart VS Code

## Option 2: Use Git for Windows
1. Install Git for Windows: https://git-scm.com/
2. Add C:\\Program Files\\Git\\usr\\bin to PATH
3. Restart VS Code

## Option 3: Standalone MinGW Make
1. Download from: https://sourceforge.net/projects/mingw/
2. Extract and add bin folder to PATH
3. Restart VS Code
        `;

        const panel = vscode.window.createWebviewPanel(
            'makeSetup',
            'Make Setup Instructions',
            vscode.ViewColumn.One,
            {}
        );

        panel.webview.html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: var(--vscode-font-family); padding: 20px; }
                    pre { background: var(--vscode-textBlockQuote-background); padding: 15px; border-radius: 5px; }
                    a { color: var(--vscode-textLink-foreground); }
                </style>
            </head>
            <body>
                <pre>${instructions}</pre>
            </body>
            </html>
        `;
    }
}
