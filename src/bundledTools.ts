/**
 * Bundled Tools Manager
 * Detects and provides paths to bundled GNU utilities and MikroC bootloader
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { BootloaderUpdater } from './bootloaderUpdater';

export class BundledToolsManager {
    private extensionPath: string;
    private platform: string;
    private bootloaderUpdater: BootloaderUpdater | null = null;

    constructor(extensionPath: string) {
        this.extensionPath = extensionPath;
        this.platform = process.platform === 'win32' ? 'win32' : 
                        process.platform === 'darwin' ? 'darwin' : 'linux';
    }

    /**
     * Set the bootloader updater instance
     */
    public setBootloaderUpdater(updater: BootloaderUpdater): void {
        this.bootloaderUpdater = updater;
    }

    /**
     * Get the path to bundled make executable
     */
    public getMakePath(): string | null {
        const bundledMake = path.join(
            this.extensionPath, 
            'bin', 
            this.platform, 
            this.platform === 'win32' ? 'make.exe' : 'make'
        );

        if (fs.existsSync(bundledMake)) {
            // Normalize path to forward slashes for cross-platform compatibility
            // and ensure absolute path is used
            return bundledMake.replace(/\\/g, '/');
        }

        // Fall back to system PATH
        return 'make';
    }

    /**
     * Get the path to bundled MikroC bootloader
     * Prefers downloaded version from updater, falls back to bundled
     */
    public getBootloaderPath(): string | null {
        // Use updater's path resolution (checks downloaded first, then bundled)
        if (this.bootloaderUpdater) {
            return this.bootloaderUpdater.getBootloaderPath();
        }

        // Fallback if updater not available
        const bundledBootloader = path.join(
            this.extensionPath,
            'bin',
            this.platform,
            this.platform === 'win32' ? 'mikro_hb.exe' : 'mikro_hb'
        );

        if (fs.existsSync(bundledBootloader)) {
            return bundledBootloader;
        }

        return null;
    }

    /**
     * Get the bin directory path for bundled tools
     */
    public getBinPath(): string {
        return path.join(this.extensionPath, 'bin', this.platform);
    }

    /**
     * Check if bundled tools are available
     */
    public hasBundledTools(): boolean {
        const makePath = path.join(
            this.extensionPath,
            'bin',
            this.platform,
            this.platform === 'win32' ? 'make.exe' : 'make'
        );
        return fs.existsSync(makePath);
    }

    /**
     * Get environment variables to use bundled tools
     * Adds bundled bin directory to PATH
     */
    public getEnvironment(): NodeJS.ProcessEnv {
        const env = { ...process.env };
        
        if (this.hasBundledTools()) {
            const binPath = this.getBinPath();
            const pathSeparator = this.platform === 'win32' ? ';' : ':';
            
            // Prepend bundled bin to PATH so it takes precedence
            env.PATH = `${binPath}${pathSeparator}${env.PATH || ''}`;
        }

        return env;
    }

    /**
     * Verify that make is available (bundled or system)
     */
    public async verifyMake(): Promise<{ available: boolean; path: string; message: string }> {
        const makePath = this.getMakePath();
        
        if (!makePath) {
            return {
                available: false,
                path: '',
                message: 'GNU Make not found. Please install make or use bundled version.'
            };
        }

        // Check if it's the bundled version
        const bundledBinPath = this.getBinPath();
        const isBundled = makePath.startsWith(bundledBinPath);

        return {
            available: true,
            path: makePath,
            message: isBundled 
                ? `Using bundled GNU Make: ${makePath}`
                : `Using system GNU Make: ${makePath}`
        };
    }

    /**
     * Show information about bundled tools
     */
    public async showToolsInfo(): Promise<void> {
        const makeVerify = await this.verifyMake();
        const bootloaderPath = this.getBootloaderPath();
        const hasBundled = this.hasBundledTools();

        const info = [
            '**Bundled Tools Status**',
            '',
            `Platform: ${this.platform}`,
            `Bundled Tools Available: ${hasBundled ? '✅ Yes' : '❌ No'}`,
            '',
            '**GNU Make:**',
            `Available: ${makeVerify.available ? '✅ Yes' : '❌ No'}`,
            `Path: \`${makeVerify.path}\``,
            '',
            '**MikroC Bootloader:**',
            bootloaderPath 
                ? `✅ Available: \`${bootloaderPath}\``
                : '❌ Not found (configure in settings)',
        ].join('\n');

        const md = new vscode.MarkdownString(info);
        md.isTrusted = true;

        await vscode.window.showInformationMessage(
            'Bundled Tools Information',
            { modal: true, detail: info }
        );
    }
}
