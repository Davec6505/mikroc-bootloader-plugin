/**
 * Tool Downloader - Downloads and installs build tools on demand
 * Future enhancement for multi-platform support
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as vscode from 'vscode';
// import * as AdmZip from 'adm-zip'; // TODO: Add adm-zip dependency when implementing

export interface ToolsManifest {
    version: string;
    platform: {
        [key: string]: {
            url: string;
            size: number;
            sha256: string;
        };
    };
}

export class ToolDownloader {
    private readonly toolsBaseUrl = 'https://github.com/Davec6505/mikroc-bootloader-plugin/releases/download';
    private readonly storageUri: vscode.Uri;

    constructor(context: vscode.ExtensionContext) {
        this.storageUri = context.globalStorageUri;
    }

    /**
     * Ensure tools are available (download if needed)
     */
    public async ensureTools(progress?: vscode.Progress<{ message?: string; increment?: number }>): Promise<string> {
        const platform = this.getPlatform();
        const toolsDir = path.join(this.storageUri.fsPath, 'tools', platform);

        // Check if tools already exist
        if (this.areToolsInstalled(toolsDir)) {
            return toolsDir;
        }

        // Download and install
        await this.downloadTools(toolsDir, platform, progress);
        return toolsDir;
    }

    /**
     * Check if tools are already installed
     */
    private areToolsInstalled(toolsDir: string): boolean {
        const makeExe = path.join(toolsDir, process.platform === 'win32' ? 'make.exe' : 'make');
        return fs.existsSync(makeExe);
    }

    /**
     * Download and extract tools
     */
    private async downloadTools(
        toolsDir: string,
        platform: string,
        progress?: vscode.Progress<{ message?: string; increment?: number }>
    ): Promise<void> {
        // Fetch manifest
        progress?.report({ message: 'Fetching tools manifest...' });
        const manifest = await this.fetchManifest();

        const platformInfo = manifest.platform[platform];
        if (!platformInfo) {
            throw new Error(`Tools not available for platform: ${platform}`);
        }

        // Download
        progress?.report({ message: `Downloading tools (${this.formatBytes(platformInfo.size)})...`, increment: 10 });
        const zipPath = path.join(this.storageUri.fsPath, `tools-${platform}.zip`);
        await this.downloadFile(platformInfo.url, zipPath, (downloaded, total) => {
            const percent = Math.floor((downloaded / total) * 80);
            progress?.report({ increment: percent - 10 });
        });

        // Verify checksum
        progress?.report({ message: 'Verifying download...', increment: 80 });
        await this.verifyChecksum(zipPath, platformInfo.sha256);

        // Extract
        progress?.report({ message: 'Extracting tools...', increment: 90 });
        await this.extractZip(zipPath, toolsDir);

        // Cleanup
        fs.unlinkSync(zipPath);
        progress?.report({ increment: 100 });
    }

    /**
     * Fetch tools manifest from GitHub
     */
    private async fetchManifest(): Promise<ToolsManifest> {
        const url = `${this.toolsBaseUrl}/tools-manifest/manifest.json`;
        return new Promise((resolve, reject) => {
            https.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (err) {
                        reject(new Error('Failed to parse manifest'));
                    }
                });
            }).on('error', reject);
        });
    }

    /**
     * Download file with progress
     */
    private downloadFile(
        url: string,
        dest: string,
        onProgress?: (downloaded: number, total: number) => void
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            fs.mkdirSync(path.dirname(dest), { recursive: true });
            const file = fs.createWriteStream(dest);

            https.get(url, (response) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`Failed to download: ${response.statusCode}`));
                    return;
                }

                const total = parseInt(response.headers['content-length'] || '0');
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
     * Verify SHA256 checksum
     */
    private async verifyChecksum(filePath: string, expectedHash: string): Promise<void> {
        const crypto = require('crypto');
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);

        return new Promise((resolve, reject) => {
            stream.on('data', data => hash.update(data));
            stream.on('end', () => {
                const fileHash = hash.digest('hex');
                if (fileHash === expectedHash) {
                    resolve();
                } else {
                    reject(new Error(`Checksum mismatch. Expected ${expectedHash}, got ${fileHash}`));
                }
            });
            stream.on('error', reject);
        });
    }

    /**
     * Extract ZIP file
     */
    private async extractZip(zipPath: string, destDir: string): Promise<void> {
        // TODO: Implement ZIP extraction (requires adm-zip package)
        // npm install adm-zip @types/adm-zip
        throw new Error('ZIP extraction not yet implemented. Install adm-zip package.');
        
        /* Implementation for future:
        fs.mkdirSync(destDir, { recursive: true });
        const AdmZip = require('adm-zip');
        const zip = new AdmZip(zipPath);
        zip.extractAllTo(destDir, true);

        // Make binaries executable on Unix
        if (process.platform !== 'win32') {
            const files = fs.readdirSync(destDir);
            for (const file of files) {
                if (file.endsWith('.exe') || !file.includes('.')) {
                    fs.chmodSync(path.join(destDir, file), 0o755);
                }
            }
        }
        */
    }

    /**
     * Get platform identifier
     */
    private getPlatform(): string {
        return process.platform === 'win32' ? 'win32' :
               process.platform === 'darwin' ? 'darwin' : 'linux';
    }

    /**
     * Format bytes to human readable
     */
    private formatBytes(bytes: number): string {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    /**
     * Show download progress dialog
     */
    public static async downloadWithProgress(
        context: vscode.ExtensionContext
    ): Promise<string> {
        const downloader = new ToolDownloader(context);

        return vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Setting up build tools',
                cancellable: false
            },
            async (progress) => {
                try {
                    const toolsDir = await downloader.ensureTools(progress);
                    vscode.window.showInformationMessage('Build tools installed successfully!');
                    return toolsDir;
                } catch (error) {
                    vscode.window.showErrorMessage(
                        `Failed to download tools: ${error instanceof Error ? error.message : 'Unknown error'}`
                    );
                    throw error;
                }
            }
        );
    }
}

/**
 * Example manifest.json structure to upload to GitHub releases:
 * 
 * {
 *   "version": "1.0.0",
 *   "platform": {
 *     "win32": {
 *       "url": "https://github.com/Davec6505/mikroc-bootloader-plugin/releases/download/tools-v1.0.0/tools-win32.zip",
 *       "size": 7340032,
 *       "sha256": "abc123..."
 *     },
 *     "linux": {
 *       "url": "https://github.com/Davec6505/mikroc-bootloader-plugin/releases/download/tools-v1.0.0/tools-linux.zip",
 *       "size": 5242880,
 *       "sha256": "def456..."
 *     },
 *     "darwin": {
 *       "url": "https://github.com/Davec6505/mikroc-bootloader-plugin/releases/download/tools-v1.0.0/tools-darwin.zip",
 *       "size": 6291456,
 *       "sha256": "ghi789..."
 *     }
 *   }
 * }
 */
