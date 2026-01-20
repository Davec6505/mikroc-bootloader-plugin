/**
 * Device Definition Loader
 * Loads device definitions from JSON files for scalability
 */

import * as path from 'path';
import * as fs from 'fs';

export interface DeviceDefinition {
    label: string;
    description: string;
    maxClockMHz?: number;    // Maximum clock frequency in MHz
    configVariant?: string;  // Optional: which configBits variant to use (if not specified, uses 'default')
}

export interface DeviceFamily {
    family: string;
    description: string;
    configBits: Record<string, string[]>;  // Configuration pragma lines by variant ('default', 'with-usb', etc.)
    devices: DeviceDefinition[];
}

/**
 * Load all device definitions from JSON files
 * Returns a map of family name to device list (compatible with existing code)
 * Also stores family metadata (including configBits) in familyMetadata map
 */
export const familyMetadata: Map<string, DeviceFamily> = new Map();

export function loadDeviceDefinitions(extensionPath: string): Record<string, DeviceDefinition[]> {
    const devicesDir = path.join(extensionPath, 'devices');
    const deviceMap: Record<string, DeviceDefinition[]> = {};
    
    // Clear caches
    familyMetadata.clear();
    loadedDevices = {};
    
    try {
        // Check if devices directory exists
        if (!fs.existsSync(devicesDir)) {
            throw new Error('Devices directory not found - extension cannot function without device definitions');
        }
        
        // Load all JSON files from devices directory
        const jsonFiles = fs.readdirSync(devicesDir)
            .filter(file => file.endsWith('.json'))
            .sort(); // Alphabetical order
        
        for (const file of jsonFiles) {
            const filePath = path.join(devicesDir, file);
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                const familyData: DeviceFamily = JSON.parse(content);
                
                // Validate required fields
                if (!familyData.family || !familyData.devices || !familyData.configBits) {
                    throw new Error(`Invalid device file ${file}: missing required fields`);
                }
                
                // Validate configBits has at least a 'default' variant
                if (!familyData.configBits['default']) {
                    throw new Error(`Invalid device file ${file}: configBits must have a 'default' variant`);
                }
                
                // Add to device map
                deviceMap[familyData.family] = familyData.devices;
                
                // Store full family metadata (including configBits)
                familyMetadata.set(familyData.family, familyData);
                
                console.log(`Loaded ${familyData.devices.length} devices from ${file}`);
            } catch (error) {
                console.error(`Failed to load device file ${file}:`, error);
                throw error;  // Fail fast - don't continue with invalid data
            }
        }
        
        if (Object.keys(deviceMap).length === 0) {
            throw new Error('No valid device definitions found');
        }
        
        // Cache for detectDeviceFamily
        loadedDevices = deviceMap;
        
        return deviceMap;
    } catch (error) {
        console.error('Error loading device definitions:', error);
        throw error;  // Extension cannot function without devices
    }
}

/**
 * Get configuration bits for a specific device
 */
export function getConfigBits(familyName: string, deviceName: string): string[] {
    const family = familyMetadata.get(familyName);
    if (!family) {
        throw new Error(`No configuration bits found for family: ${familyName}`);
    }
    
    // Find the device to check for configVariant
    const device = family.devices.find(d => d.label === deviceName);
    const variant = device?.configVariant || 'default';
    
    // Get config bits for this variant
    const configBits = family.configBits[variant];
    if (!configBits) {
        throw new Error(`No configuration bits found for variant '${variant}' in family ${familyName}`);
    }
    
    return configBits;
}

/**
 * Detect device family from device name
 */
export function detectDeviceFamily(deviceName: string): string | null {
    // Check which family this device belongs to
    for (const [familyName, devices] of Object.entries(loadedDevices)) {
        if (devices.some(d => d.label === deviceName)) {
            return familyName;
        }
    }
    return null;
}

/**
 * Get device-specific maximum clock frequency in MHz
 * Falls back to family defaults if device-specific info not available
 */
export function getDeviceClockFrequency(deviceName: string): number {
    // Find device definition
    for (const devices of Object.values(loadedDevices)) {
        const device = devices.find(d => d.label === deviceName);
        if (device && device.maxClockMHz) {
            return device.maxClockMHz;
        }
    }
    
    // Fallback: Family-based defaults
    if (deviceName.startsWith('32MZ')) {
        return 200; // PIC32MZ default
    } else if (deviceName.startsWith('32MX')) {
        // MX1/2 XLP series (154, 174, 254, 274) = 72MHz
        if (deviceName.match(/32MX[12][57]4F/)) {
            return 72;
        }
        // MX1/2/5 series = 50MHz
        if (deviceName.match(/32MX[125]/)) {
            return 50;
        }
        // MX3/4 series = 120MHz
        if (deviceName.match(/32MX[34]/)) {
            return 120;
        }
        // MX5/6/7 series (Ethernet) = 80MHz
        if (deviceName.match(/32MX[567]/)) {
            return 80;
        }
        return 50; // Default fallback
    }
    
    return 80; // Generic fallback
}

// Cache loaded devices for detectDeviceFamily
let loadedDevices: Record<string, DeviceDefinition[]> = {};

/**
 * Get all devices as a flat list for quick pick
 */
export function getAllDevicesFlat(deviceMap: Record<string, DeviceDefinition[]>): DeviceDefinition[] {
    const allDevices: DeviceDefinition[] = [];
    
    for (const family in deviceMap) {
        allDevices.push(...deviceMap[family]);
    }
    
    return allDevices;
}
