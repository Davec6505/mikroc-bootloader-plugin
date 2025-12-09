/**
 * Pin Manager Type Definitions for PIC32MZ Devices
 */

export type PackageType = '64-pin' | '100-pin' | '124-pin' | '144-pin';

export type PinMode = 'GPIO' | 'Analog' | 'Peripheral' | 'Power';

export type BufferType = 'Digital' | 'Analog' | 'TTL' | 'ST' | 'CMOS' | 'Power';

export type PinDirection = 'Input' | 'Output' | 'Bidirectional';

/**
 * Represents a physical pin on the device
 */
export interface DevicePin {
    /** Pin numbers for each package type (null if not available in that package) */
    pinNumber: Record<PackageType, number | null>;
    
    /** Primary pin name (e.g., "RB8", "AN0", "MCLR", "VDD") */
    pinName: string;
    
    /** Port and bit number for GPIO pins (e.g., "B", 8) */
    port?: {
        letter: string;  // "A", "B", "C", etc.
        bit: number;     // 0-15
    };
    
    /** True if this is a power/ground pin */
    isPowerPin: boolean;
    
    /** Buffer type */
    bufferType: BufferType;
    
    /** Default/primary function */
    defaultFunction: string;
    
    /** All available alternate functions */
    alternateFunctions: string[];
    
    /** Analog channel if available (e.g., "AN0", "AN15") */
    analogChannel?: string;
    
    /** Remappable Pin number if PPS-capable (e.g., 2 for RP2) */
    rpNumber?: number;
    
    /** Change Notification identifier (e.g., "CNB8") */
    cnNumber?: string;
    
    /** Pin type indicator */
    pinType: 'I' | 'O' | 'I/O' | 'P';
}

/**
 * PPS Input Signal Configuration
 */
export interface PPSInputSignal {
    /** Signal name (e.g., "U1RX", "INT3", "T2CK") */
    signalName: string;
    
    /** Register name for configuration (e.g., "U1RXR", "INT3R") */
    registerName: string;
    
    /** Human-readable description */
    description: string;
    
    /** Valid RP pin values that can be assigned (0-15) */
    validRPValues: number[];
    
    /** Peripheral category */
    category: 'UART' | 'SPI' | 'Timer' | 'IC' | 'Interrupt' | 'Other';
}

/**
 * PPS Output Signal Value
 */
export interface PPSOutputValue {
    /** Register value (0-15) */
    value: number;
    
    /** Signal name (e.g., "U1TX", "OC1") */
    signalName: string;
    
    /** Human-readable description */
    description: string;
    
    /** Peripheral category */
    category: 'UART' | 'SPI' | 'Timer' | 'OC' | 'RefClk' | 'Other';
}

/**
 * PPS Output Pin Configuration
 */
export interface PPSOutputPin {
    /** RP pin name (e.g., "RPD2", "RPG8") */
    rpPin: string;
    
    /** Register name (e.g., "RPD2R") */
    registerName: string;
    
    /** Available peripheral outputs for this pin */
    validPeripherals: PPSOutputValue[];
}

/**
 * User's pin configuration
 */
export interface PinConfiguration {
    /** Pin name being configured */
    pinName: string;
    
    /** Configuration mode */
    mode: PinMode;
    
    /** GPIO configuration (when mode === 'GPIO') */
    gpio?: {
        customName?: string;
        direction: PinDirection;
        initialState?: 'High' | 'Low';
        pullUp?: boolean;
        pullDown?: boolean;
        openDrain?: boolean;
        changeNotification?: boolean;
        interruptOnChange?: boolean;
    };
    
    /** Peripheral configuration (when mode === 'Peripheral') */
    peripheral?: {
        function: string;
        ppsInputSignal?: string;
        ppsOutputSignal?: string;
    };
    
    /** Analog configuration (when mode === 'Analog') */
    analog?: {
        channelName: string;
        enabled: boolean;
    };
}

/**
 * Complete pin manager state
 */
export interface PinManagerState {
    /** Selected device */
    deviceName: string;
    
    /** Selected package type */
    packageType: PackageType;
    
    /** Pin configurations */
    pins: PinConfiguration[];
}
