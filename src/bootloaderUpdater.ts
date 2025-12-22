/**
 * MikroC Bootloader Auto-Updater
 * Checks GitHub releases for updates to mikro_hb.exe
 */

import * as vscode from 'vscode';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';

interface GitHubRelease {
    tag_name: string;
    name: string;
    assets: Array<{
        name: string;
        browser_download_url: string;
        size: number;
    }>;
    published_at: string;
}

export class BootloaderUpdater {
    private static readonly REPO_OWNER = 'Davec6505';
    private static readonly REPO_NAME = 'MikroC_bootloader';
    private static readonly CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
    private static readonly LAST_CHECK_KEY = 'mikroc.bootloader.lastCheck';
    private static readonly CURRENT_VERSION_KEY = 'mikroc.bootloader.currentVersion';
    
    constructor(
        private context: vscode.ExtensionContext,
        private platform: string
    ) {}

    /**
     * Check for updates and download if available
     */
    async checkAndUpdate(): Promise<void> {
        const now = Date.now();
        const lastCheck = this.context.globalState.get<number>(BootloaderUpdater.LAST_CHECK_KEY, 0);
        
        // Check at most once per day
        if (now - lastCheck < BootloaderUpdater.CHECK_INTERVAL_MS) {
            return;
        }
        
        try {
            const latestRelease = await this.getLatestRelease();
            if (!latestRelease) {
                return;
            }
            
            const currentVersion = this.context.globalState.get<string>(
                BootloaderUpdater.CURRENT_VERSION_KEY,
                '0.0.0'
            );
            
            if (this.isNewerVersion(latestRelease.tag_name, currentVersion)) {
                await this.downloadAndInstall(latestRelease);
            }
            
            // Update last check time
            await this.context.globalState.update(BootloaderUpdater.LAST_CHECK_KEY, now);
        } catch (error) {
            console.error('Bootloader update check failed:', error);
            // Silently fail - don't bother user
        }
    }

    /**
     * Get the latest release from GitHub
     */
    private getLatestRelease(): Promise<GitHubRelease | null> {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.github.com',
                path: `/repos/${BootloaderUpdater.REPO_OWNER}/${BootloaderUpdater.REPO_NAME}/releases/latest`,
                method: 'GET',
                headers: {
                    'User-Agent': 'VSCode-Extension-XC-Importer',
                    'Accept': 'application/vnd.github.v3+json'
                }
            };
            
            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            const release = JSON.parse(data) as GitHubRelease;
                            resolve(release);
                        } catch (e) {
                            reject(e);
                        }
                    } else if (res.statusCode === 404) {
                        // No releases yet
                        resolve(null);
                    } else {
                        reject(new Error(`GitHub API returned ${res.statusCode}`));
                    }
                });
            });
            
            req.on('error', reject);
            req.setTimeout(10000, () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
            req.end();
        });
    }

    /**
     * Compare version strings (supports v1.0.0 or 1.0.0 format)
     */
    private isNewerVersion(newVersion: string, currentVersion: string): boolean {
        const cleanNew = newVersion.replace(/^v/, '');
        const cleanCurrent = currentVersion.replace(/^v/, '');
        
        const newParts = cleanNew.split('.').map(n => parseInt(n, 10));
        const currentParts = cleanCurrent.split('.').map(n => parseInt(n, 10));
        
        for (let i = 0; i < 3; i++) {
            const newPart = newParts[i] || 0;
            const currentPart = currentParts[i] || 0;
            
            if (newPart > currentPart) {
                return true;
            } else if (newPart < currentPart) {
                return false;
            }
        }
        
        return false;
    }

    /**
     * Download and install the new bootloader version
     */
    private async downloadAndInstall(release: GitHubRelease): Promise<void> {
        // Find the appropriate asset for this platform
        const assetName = this.platform === 'win32' ? 'mikro_hb.exe' : 'mikro_hb';
        const asset = release.assets.find(a => a.name === assetName);
        
        if (!asset) {
            console.warn(`No ${assetName} found in release ${release.tag_name}`);
            return;
        }
        
        // Download with progress
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Updating MikroC Bootloader to ${release.tag_name}`,
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0, message: 'Downloading...' });
            
            const downloadPath = await this.downloadFile(
                asset.browser_download_url,
                asset.size,
                (percent) => progress.report({ increment: percent, message: `${percent}%` })
            );
            
            progress.report({ increment: 100, message: 'Installing...' });
            
            // Move to global storage
            const storagePath = this.getStoragePath();
            const targetPath = path.join(storagePath, assetName);
            
            // Ensure storage directory exists
            if (!fs.existsSync(storagePath)) {
                fs.mkdirSync(storagePath, { recursive: true });
            }
            
            // Move downloaded file
            fs.renameSync(downloadPath, targetPath);
            
            // Make executable on Linux
            if (this.platform !== 'win32') {
                fs.chmodSync(targetPath, 0o755);
            }
            
            // Update stored version
            await this.context.globalState.update(
                BootloaderUpdater.CURRENT_VERSION_KEY,
                release.tag_name
            );
            
            vscode.window.showInformationMessage(
                `✓ MikroC Bootloader updated to ${release.tag_name}`
            );
        });
    }

    /**
     * Download a file from URL with progress tracking
     */
    private downloadFile(
        url: string,
        totalSize: number,
        onProgress: (percent: number) => void
    ): Promise<string> {
        return new Promise((resolve, reject) => {
            const tempFile = path.join(
                this.context.globalStorageUri.fsPath,
                'mikro_hb.download'
            );
            
            // Ensure directory exists
            const dir = path.dirname(tempFile);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            const file = fs.createWriteStream(tempFile);
            let downloadedSize = 0;
            let lastPercent = 0;
            
            const download = (urlStr: string) => {
                https.get(urlStr, (response) => {
                    // Handle redirects
                    if (response.statusCode === 302 || response.statusCode === 301) {
                        const redirectUrl = response.headers.location;
                        if (redirectUrl) {
                            download(redirectUrl);
                            return;
                        }
                    }
                    
                    if (response.statusCode !== 200) {
                        reject(new Error(`Download failed: ${response.statusCode}`));
                        return;
                    }
                    
                    response.on('data', (chunk) => {
                        downloadedSize += chunk.length;
                        const percent = Math.floor((downloadedSize / totalSize) * 100);
                        
                        if (percent > lastPercent) {
                            onProgress(percent);
                            lastPercent = percent;
                        }
                    });
                    
                    response.pipe(file);
                    
                    file.on('finish', () => {
                        file.close();
                        resolve(tempFile);
                    });
                }).on('error', (err) => {
                    fs.unlinkSync(tempFile);
                    reject(err);
                });
            };
            
            download(url);
        });
    }

    /**
     * Get the path to the bootloader (downloaded version or bundled fallback)
     */
    getBootloaderPath(): string | null {
        const assetName = this.platform === 'win32' ? 'mikro_hb.exe' : 'mikro_hb';
        
        // Check for downloaded version first
        const downloadedPath = path.join(this.getStoragePath(), assetName);
        if (fs.existsSync(downloadedPath)) {
            return downloadedPath;
        }
        
        // Fall back to bundled version
        const bundledPath = path.join(
            this.context.extensionPath,
            'bin',
            this.platform,
            assetName
        );
        
        if (fs.existsSync(bundledPath)) {
            return bundledPath;
        }
        
        return null;
    }

    /**
     * Get global storage path for bootloader
     */
    private getStoragePath(): string {
        return path.join(this.context.globalStorageUri.fsPath, 'bootloader');
    }

    /**
     * Force check for updates (manual trigger)
     */
    async forceCheckForUpdates(): Promise<void> {
        // Reset last check time to force update
        await this.context.globalState.update(BootloaderUpdater.LAST_CHECK_KEY, 0);
        
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Checking for bootloader updates...',
            cancellable: false
        }, async () => {
            await this.checkAndUpdate();
        });
    }
}
