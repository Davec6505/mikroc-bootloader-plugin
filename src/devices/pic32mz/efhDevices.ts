/**
 * PIC32MZ EFH Device Database
 * 
 * Supports 8 EFH family devices (1024KB and 2048KB flash variants)
 * All devices share identical DEVCFG register structure
 */

export interface PIC32Device {
    name: string;           // Full part number (e.g., "P32MZ2048EFH100")
    displayName: string;    // User-friendly name
    flashKB: number;        // Flash memory size in KB
    ramKB: number;          // RAM size in KB
    pins: number;           // Pin count
    family: string;         // Device family (EFH)
    series: string;         // Series (MZ)
}

/**
 * PIC32MZ EFH Device List
 * All devices use the same config register mapping (efhRegisterMap.ts)
 */
export const EFH_DEVICES: PIC32Device[] = [
    // PIC32MZ1024EFH Series (1MB Flash)
    {
        name: "P32MZ1024EFH064",
        displayName: "PIC32MZ1024EFH064 (1024KB Flash, 64-pin)",
        flashKB: 1024,
        ramKB: 512,
        pins: 64,
        family: "EFH",
        series: "MZ"
    },
    {
        name: "P32MZ1024EFH100",
        displayName: "PIC32MZ1024EFH100 (1024KB Flash, 100-pin)",
        flashKB: 1024,
        ramKB: 512,
        pins: 100,
        family: "EFH",
        series: "MZ"
    },
    {
        name: "P32MZ1024EFH124",
        displayName: "PIC32MZ1024EFH124 (1024KB Flash, 124-pin)",
        flashKB: 1024,
        ramKB: 512,
        pins: 124,
        family: "EFH",
        series: "MZ"
    },
    {
        name: "P32MZ1024EFH144",
        displayName: "PIC32MZ1024EFH144 (1024KB Flash, 144-pin)",
        flashKB: 1024,
        ramKB: 512,
        pins: 144,
        family: "EFH",
        series: "MZ"
    },
    
    // PIC32MZ2048EFH Series (2MB Flash)
    {
        name: "P32MZ2048EFH064",
        displayName: "PIC32MZ2048EFH064 (2048KB Flash, 64-pin)",
        flashKB: 2048,
        ramKB: 512,
        pins: 64,
        family: "EFH",
        series: "MZ"
    },
    {
        name: "P32MZ2048EFH100",
        displayName: "PIC32MZ2048EFH100 (2048KB Flash, 100-pin)",
        flashKB: 2048,
        ramKB: 512,
        pins: 100,
        family: "EFH",
        series: "MZ"
    },
    {
        name: "P32MZ2048EFH124",
        displayName: "PIC32MZ2048EFH124 (2048KB Flash, 124-pin)",
        flashKB: 2048,
        ramKB: 512,
        pins: 124,
        family: "EFH",
        series: "MZ"
    },
    {
        name: "P32MZ2048EFH144",
        displayName: "PIC32MZ2048EFH144 (2048KB Flash, 144-pin)",
        flashKB: 2048,
        ramKB: 512,
        pins: 144,
        family: "EFH",
        series: "MZ"
    }
];

/**
 * Get device by name
 */
export function getDeviceByName(name: string): PIC32Device | undefined {
    return EFH_DEVICES.find(dev => dev.name === name);
}

/**
 * Get all device names for dropdown
 */
export function getDeviceNames(): string[] {
    return EFH_DEVICES.map(dev => dev.name);
}

/**
 * Get all devices for display
 */
export function getDevicesForDisplay(): { label: string; value: string }[] {
    return EFH_DEVICES.map(dev => ({
        label: dev.displayName,
        value: dev.name
    }));
}
