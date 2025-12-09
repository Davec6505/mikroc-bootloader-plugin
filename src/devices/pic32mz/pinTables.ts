/**
 * PIC32MZ EF/EC Family Pin Tables
 * 
 * Data extracted from PIC32MZ2048ECH064/100/124/144 datasheet
 * TABLE 1-1: ADC1 PINOUT I/O DESCRIPTIONS
 */

import { DevicePin, PackageType } from './types';

/**
 * Helper function to create a pin definition
 */
function createPin(
    pin64: number | null,
    pin100: number | null,
    pin124: number | null,
    pin144: number | null,
    pinName: string,
    pinType: 'I' | 'O' | 'I/O' | 'P',
    bufferType: 'Digital' | 'Analog' | 'TTL' | 'ST' | 'CMOS' | 'Power',
    alternateFunctions: string[]
): DevicePin {
    const isPowerPin = pinName.startsWith('V') || pinName.startsWith('A');
    
    // Extract port information for GPIO pins (e.g., "RB8" -> port: B, bit: 8)
    let port: { letter: string; bit: number } | undefined;
    const gpioMatch = pinName.match(/^R([A-K])(\d+)$/);
    if (gpioMatch) {
        port = {
            letter: gpioMatch[1],
            bit: parseInt(gpioMatch[2])
        };
    }
    
    // Extract analog channel
    const analogChannel = alternateFunctions.find(f => f.startsWith('AN'));
    
    // Extract RP number
    const rpMatch = alternateFunctions.find(f => f.match(/^RP\d+$/));
    const rpNumber = rpMatch ? parseInt(rpMatch.substring(2)) : undefined;
    
    // Extract CN number
    const cnNumber = alternateFunctions.find(f => f.startsWith('CN'));
    
    return {
        pinNumber: {
            '64-pin': pin64,
            '100-pin': pin100,
            '124-pin': pin124,
            '144-pin': pin144
        },
        pinName,
        port,
        isPowerPin,
        bufferType,
        defaultFunction: pinName,
        alternateFunctions,
        analogChannel,
        rpNumber,
        cnNumber,
        pinType
    };
}

/**
 * Complete pin table for PIC32MZ2048EF/EC family
 * Organized by functional category for easier reference
 */
export const PIC32MZ_PINS: DevicePin[] = [
    // Analog Input Pins (AN0-AN35)
    createPin(16, 25, null, 36, 'AN0', 'I', 'Analog', ['AN0']),
    createPin(15, 24, null, 35, 'AN1', 'I', 'Analog', ['AN1']),
    createPin(14, 23, null, 34, 'AN2', 'I', 'Analog', ['AN2']),
    createPin(13, 22, null, 31, 'AN3', 'I', 'Analog', ['AN3']),
    createPin(12, 21, null, 26, 'AN4', 'I', 'Analog', ['AN4']),
    createPin(23, 34, null, 49, 'AN5', 'I', 'Analog', ['AN5']),
    createPin(24, 35, null, 50, 'AN6', 'I', 'Analog', ['AN6']),
    createPin(27, 41, null, 59, 'AN7', 'I', 'Analog', ['AN7']),
    createPin(28, 42, null, 60, 'AN8', 'I', 'Analog', ['AN8']),
    createPin(29, 43, null, 61, 'AN9', 'I', 'Analog', ['AN9']),
    createPin(30, 44, null, 62, 'AN10', 'I', 'Analog', ['AN10']),
    createPin(10, 16, null, 21, 'AN11', 'I', 'Analog', ['AN11']),
    createPin(6, 12, null, 16, 'AN12', 'I', 'Analog', ['AN12']),
    createPin(5, 11, null, 15, 'AN13', 'I', 'Analog', ['AN13']),
    createPin(4, 10, null, 14, 'AN14', 'I', 'Analog', ['AN14']),
    createPin(3, 5, null, 5, 'AN15', 'I', 'Analog', ['AN15']),
    createPin(2, 4, null, 4, 'AN16', 'I', 'Analog', ['AN16']),
    createPin(1, 3, null, 3, 'AN17', 'I', 'Analog', ['AN17']),
    createPin(64, 100, null, 144, 'AN18', 'I', 'Analog', ['AN18']),
    createPin(null, 9, null, 13, 'AN19', 'I', 'Analog', ['AN19']),
    createPin(null, 8, null, 12, 'AN20', 'I', 'Analog', ['AN20']),
    createPin(null, 7, null, 11, 'AN21', 'I', 'Analog', ['AN21']),
    createPin(null, 6, null, 6, 'AN22', 'I', 'Analog', ['AN22']),
    createPin(null, 1, null, 1, 'AN23', 'I', 'Analog', ['AN23']),
    createPin(null, 17, null, 22, 'AN24', 'I', 'Analog', ['AN24']),
    createPin(null, 18, null, 23, 'AN25', 'I', 'Analog', ['AN25']),
    createPin(null, 19, null, 24, 'AN26', 'I', 'Analog', ['AN26']),
    createPin(null, 28, null, 39, 'AN27', 'I', 'Analog', ['AN27']),
    createPin(null, 29, null, 40, 'AN28', 'I', 'Analog', ['AN28']),
    createPin(null, 38, null, 56, 'AN29', 'I', 'Analog', ['AN29']),
    createPin(null, 39, null, 57, 'AN30', 'I', 'Analog', ['AN30']),
    createPin(null, 40, null, 58, 'AN31', 'I', 'Analog', ['AN31']),
    createPin(null, 47, null, 69, 'AN32', 'I', 'Analog', ['AN32']),
    createPin(null, 48, null, 70, 'AN33', 'I', 'Analog', ['AN33']),
    createPin(null, 2, null, 2, 'AN34', 'I', 'Analog', ['AN34']),
    createPin(null, null, null, 7, 'AN35', 'I', 'Analog', ['AN35']),
    
    // PORT A GPIO Pins
    createPin(null, 17, null, 22, 'RA0', 'I/O', 'ST', ['GPIO', 'RA0']),
    createPin(null, 38, null, 56, 'RA1', 'I/O', 'ST', ['GPIO', 'RA1']),
    createPin(null, 59, null, 85, 'RA2', 'I/O', 'ST', ['GPIO', 'RA2']),
    createPin(null, 60, null, 86, 'RA3', 'I/O', 'ST', ['GPIO', 'RA3']),
    createPin(null, 61, null, 87, 'RA4', 'I/O', 'ST', ['GPIO', 'RA4']),
    createPin(null, 2, null, 2, 'RA5', 'I/O', 'ST', ['GPIO', 'RA5', 'AN34']),
    createPin(null, 89, null, 129, 'RA6', 'I/O', 'ST', ['GPIO', 'RA6']),
    createPin(null, 90, null, 130, 'RA7', 'I/O', 'ST', ['GPIO', 'RA7']),
    createPin(null, 28, null, 39, 'RA9', 'I/O', 'ST', ['GPIO', 'RA9', 'AN27']),
    createPin(null, 29, null, 40, 'RA10', 'I/O', 'ST', ['GPIO', 'RA10', 'AN28']),
    createPin(null, 66, null, 95, 'RA14', 'I/O', 'ST', ['GPIO', 'RA14', 'RPA14']),
    createPin(null, 67, null, 96, 'RA15', 'I/O', 'ST', ['GPIO', 'RA15', 'RPA15']),
    
    // PORT B GPIO Pins
    createPin(16, 25, null, 36, 'RB0', 'I/O', 'ST', ['GPIO', 'RB0', 'AN0', 'RPB0']),
    createPin(15, 24, null, 35, 'RB1', 'I/O', 'ST', ['GPIO', 'RB1', 'AN1', 'RPB1', 'PGEC1']),
    createPin(14, 23, null, 34, 'RB2', 'I/O', 'ST', ['GPIO', 'RB2', 'AN2', 'RPB2']),
    createPin(13, 22, null, 31, 'RB3', 'I/O', 'ST', ['GPIO', 'RB3', 'AN3', 'RPB3']),
    createPin(12, 21, null, 26, 'RB4', 'I/O', 'ST', ['GPIO', 'RB4', 'AN4']),
    createPin(11, 20, null, 25, 'RB5', 'I/O', 'ST', ['GPIO', 'RB5', 'AN45', 'RPB5']),
    createPin(17, 26, null, 37, 'RB6', 'I/O', 'ST', ['GPIO', 'RB6', 'RPB6']),
    createPin(18, 27, null, 38, 'RB7', 'I/O', 'ST', ['GPIO', 'RB7', 'RPB7']),
    createPin(21, 32, null, 47, 'RB8', 'I/O', 'ST', ['GPIO', 'RB8', 'RPB8']),
    createPin(22, 33, null, 48, 'RB9', 'I/O', 'ST', ['GPIO', 'RB9', 'RPB9']),
    createPin(23, 34, null, 49, 'RB10', 'I/O', 'ST', ['GPIO', 'RB10', 'AN5', 'RPB10']),
    createPin(24, 35, null, 50, 'RB11', 'I/O', 'ST', ['GPIO', 'RB11', 'AN6']),
    createPin(27, 41, null, 59, 'RB12', 'I/O', 'ST', ['GPIO', 'RB12', 'AN7']),
    createPin(28, 42, null, 60, 'RB13', 'I/O', 'ST', ['GPIO', 'RB13', 'AN8']),
    createPin(29, 43, null, 61, 'RB14', 'I/O', 'ST', ['GPIO', 'RB14', 'AN9', 'RPB14']),
    createPin(30, 44, null, 62, 'RB15', 'I/O', 'ST', ['GPIO', 'RB15', 'AN10', 'RPB15']),
    
    // PORT C GPIO Pins
    createPin(null, 6, null, 6, 'RC1', 'I/O', 'ST', ['GPIO', 'RC1', 'AN22', 'RPC1']),
    createPin(null, 7, null, 11, 'RC2', 'I/O', 'ST', ['GPIO', 'RC2', 'AN21', 'RPC2']),
    createPin(null, 8, null, 12, 'RC3', 'I/O', 'ST', ['GPIO', 'RC3', 'AN20', 'RPC3']),
    createPin(null, 9, null, 13, 'RC4', 'I/O', 'ST', ['GPIO', 'RC4', 'AN19', 'RPC4']),
    createPin(31, 49, null, 71, 'RC12', 'I/O', 'ST', ['GPIO', 'RC12', 'OSC1', 'CLKI']),
    createPin(47, 72, null, 105, 'RC13', 'I/O', 'ST', ['GPIO', 'RC13', 'SOSCI', 'RPC13']),
    createPin(48, 73, null, 106, 'RC14', 'I/O', 'ST', ['GPIO', 'RC14', 'SOSCO', 'RPC14']),
    createPin(32, 50, null, 72, 'RC15', 'I/O', 'ST', ['GPIO', 'RC15', 'OSC2', 'CLKO']),
    
    // PORT D GPIO Pins
    createPin(46, 71, null, 104, 'RD0', 'I/O', 'ST', ['GPIO', 'RD0', 'RPD0']),
    createPin(49, 76, null, 109, 'RD1', 'I/O', 'ST', ['GPIO', 'RD1', 'RPD1']),
    createPin(50, 77, null, 110, 'RD2', 'I/O', 'ST', ['GPIO', 'RD2', 'RPD2']),
    createPin(51, 78, null, 111, 'RD3', 'I/O', 'ST', ['GPIO', 'RD3', 'RPD3']),
    createPin(52, 81, null, 118, 'RD4', 'I/O', 'ST', ['GPIO', 'RD4', 'RPD4']),
    createPin(53, 82, null, 119, 'RD5', 'I/O', 'ST', ['GPIO', 'RD5', 'RPD5']),
    createPin(null, null, null, 120, 'RD6', 'I/O', 'ST', ['GPIO', 'RD6', 'RPD6']),
    createPin(null, null, null, 121, 'RD7', 'I/O', 'ST', ['GPIO', 'RD7', 'RPD7']),
    createPin(43, 68, null, 97, 'RD9', 'I/O', 'ST', ['GPIO', 'RD9', 'RPD9']),
    createPin(44, 69, null, 98, 'RD10', 'I/O', 'ST', ['GPIO', 'RD10', 'RPD10']),
    createPin(45, 70, null, 99, 'RD11', 'I/O', 'ST', ['GPIO', 'RD11', 'RPD11']),
    createPin(null, 79, null, 112, 'RD12', 'I/O', 'ST', ['GPIO', 'RD12', 'RPD12']),
    createPin(null, 80, null, 113, 'RD13', 'I/O', 'ST', ['GPIO', 'RD13', 'RPD13']),
    createPin(null, 47, null, 69, 'RD14', 'I/O', 'ST', ['GPIO', 'RD14', 'RPD14']),
    createPin(null, 48, null, 70, 'RD15', 'I/O', 'ST', ['GPIO', 'RD15', 'RPD15']),
    
    // PORT E GPIO Pins
    createPin(58, 91, null, 135, 'RE0', 'I/O', 'ST', ['GPIO', 'RE0']),
    createPin(61, 94, null, 138, 'RE1', 'I/O', 'ST', ['GPIO', 'RE1']),
    createPin(62, 98, null, 142, 'RE2', 'I/O', 'ST', ['GPIO', 'RE2']),
    createPin(63, 99, null, 143, 'RE3', 'I/O', 'ST', ['GPIO', 'RE3', 'RPE3']),
    createPin(64, 100, null, 144, 'RE4', 'I/O', 'ST', ['GPIO', 'RE4', 'AN18']),
    createPin(1, 3, null, 3, 'RE5', 'I/O', 'ST', ['GPIO', 'RE5', 'AN17', 'RPE5']),
    createPin(2, 4, null, 4, 'RE6', 'I/O', 'ST', ['GPIO', 'RE6', 'AN16']),
    createPin(3, 5, null, 5, 'RE7', 'I/O', 'ST', ['GPIO', 'RE7', 'AN15']),
    createPin(null, 18, null, 23, 'RE8', 'I/O', 'ST', ['GPIO', 'RE8', 'AN25', 'RPE8']),
    createPin(null, 19, null, 24, 'RE9', 'I/O', 'ST', ['GPIO', 'RE9', 'AN26', 'RPE9']),
    
    // PORT F GPIO Pins
    createPin(56, 85, null, 124, 'RF0', 'I/O', 'ST', ['GPIO', 'RF0', 'RPF0']),
    createPin(57, 86, null, 125, 'RF1', 'I/O', 'ST', ['GPIO', 'RF1', 'RPF1']),
    createPin(null, 57, null, 79, 'RF2', 'I/O', 'ST', ['GPIO', 'RF2', 'RPF2']),
    createPin(38, 56, null, 78, 'RF3', 'I/O', 'ST', ['GPIO', 'RF3', 'RPF3']),
    createPin(41, 64, null, 90, 'RF4', 'I/O', 'ST', ['GPIO', 'RF4', 'RPF4']),
    createPin(42, 65, null, 91, 'RF5', 'I/O', 'ST', ['GPIO', 'RF5', 'RPF5']),
    createPin(null, 58, null, 80, 'RF8', 'I/O', 'ST', ['GPIO', 'RF8', 'RPF8']),
    createPin(null, 40, null, 58, 'RF12', 'I/O', 'ST', ['GPIO', 'RF12', 'AN31', 'RPF12']),
    createPin(null, 39, null, 57, 'RF13', 'I/O', 'ST', ['GPIO', 'RF13', 'AN30', 'RPF13']),
    
    // PORT G GPIO Pins
    createPin(null, 88, null, 128, 'RG0', 'I/O', 'ST', ['GPIO', 'RG0', 'RPG0']),
    createPin(null, 87, null, 127, 'RG1', 'I/O', 'ST', ['GPIO', 'RG1', 'RPG1']),
    createPin(4, 10, null, 14, 'RG6', 'I/O', 'ST', ['GPIO', 'RG6', 'AN14', 'RPG6']),
    createPin(5, 11, null, 15, 'RG7', 'I/O', 'ST', ['GPIO', 'RG7', 'AN13', 'RPG7']),
    createPin(6, 12, null, 16, 'RG8', 'I/O', 'ST', ['GPIO', 'RG8', 'AN12', 'RPG8']),
    createPin(10, 16, null, 21, 'RG9', 'I/O', 'ST', ['GPIO', 'RG9', 'AN11', 'RPG9']),
    createPin(null, 96, null, 140, 'RG12', 'I/O', 'ST', ['GPIO', 'RG12']),
    createPin(null, 97, null, 141, 'RG13', 'I/O', 'ST', ['GPIO', 'RG13']),
    createPin(null, 95, null, 139, 'RG14', 'I/O', 'ST', ['GPIO', 'RG14']),
    createPin(null, 1, null, 1, 'RG15', 'I/O', 'ST', ['GPIO', 'RG15', 'AN23']),
    
    // PORT H GPIO Pins (124/144-pin only)
    createPin(null, null, null, 43, 'RH0', 'I/O', 'ST', ['GPIO', 'RH0']),
    createPin(null, null, null, 44, 'RH1', 'I/O', 'ST', ['GPIO', 'RH1']),
    createPin(null, null, null, 45, 'RH2', 'I/O', 'ST', ['GPIO', 'RH2']),
    createPin(null, null, null, 46, 'RH3', 'I/O', 'ST', ['GPIO', 'RH3']),
    createPin(null, null, null, 65, 'RH4', 'I/O', 'ST', ['GPIO', 'RH4']),
    createPin(null, null, null, 66, 'RH5', 'I/O', 'ST', ['GPIO', 'RH5']),
    createPin(null, null, null, 67, 'RH6', 'I/O', 'ST', ['GPIO', 'RH6']),
    createPin(null, null, null, 68, 'RH7', 'I/O', 'ST', ['GPIO', 'RH7']),
    createPin(null, null, null, 81, 'RH8', 'I/O', 'ST', ['GPIO', 'RH8']),
    createPin(null, null, null, 82, 'RH9', 'I/O', 'ST', ['GPIO', 'RH9']),
    createPin(null, null, null, 83, 'RH10', 'I/O', 'ST', ['GPIO', 'RH10']),
    createPin(null, null, null, 84, 'RH11', 'I/O', 'ST', ['GPIO', 'RH11']),
    createPin(null, null, null, 100, 'RH12', 'I/O', 'ST', ['GPIO', 'RH12']),
    createPin(null, null, null, 101, 'RH13', 'I/O', 'ST', ['GPIO', 'RH13']),
    createPin(null, null, null, 102, 'RH14', 'I/O', 'ST', ['GPIO', 'RH14']),
    createPin(null, null, null, 103, 'RH15', 'I/O', 'ST', ['GPIO', 'RH15']),
    
    // PORT J GPIO Pins (124/144-pin only)
    createPin(null, null, null, 114, 'RJ0', 'I/O', 'ST', ['GPIO', 'RJ0']),
    createPin(null, null, null, 115, 'RJ1', 'I/O', 'ST', ['GPIO', 'RJ1']),
    createPin(null, null, null, 116, 'RJ2', 'I/O', 'ST', ['GPIO', 'RJ2']),
    createPin(null, null, null, 117, 'RJ3', 'I/O', 'ST', ['GPIO', 'RJ3']),
    createPin(null, null, null, 131, 'RJ4', 'I/O', 'ST', ['GPIO', 'RJ4']),
    createPin(null, null, null, 132, 'RJ5', 'I/O', 'ST', ['GPIO', 'RJ5']),
    createPin(null, null, null, 133, 'RJ6', 'I/O', 'ST', ['GPIO', 'RJ6']),
    createPin(null, null, null, 134, 'RJ7', 'I/O', 'ST', ['GPIO', 'RJ7']),
    createPin(null, null, null, 7, 'RJ8', 'I/O', 'ST', ['GPIO', 'RJ8', 'AN35']),
    createPin(null, null, null, 8, 'RJ9', 'I/O', 'ST', ['GPIO', 'RJ9']),
    createPin(null, null, null, 10, 'RJ10', 'I/O', 'ST', ['GPIO', 'RJ10']),
    createPin(null, null, null, 27, 'RJ11', 'I/O', 'ST', ['GPIO', 'RJ11']),
    createPin(null, null, null, 9, 'RJ12', 'I/O', 'ST', ['GPIO', 'RJ12']),
    createPin(null, null, null, 28, 'RJ13', 'I/O', 'ST', ['GPIO', 'RJ13']),
    createPin(null, null, null, 29, 'RJ14', 'I/O', 'ST', ['GPIO', 'RJ14']),
    createPin(null, null, null, 30, 'RJ15', 'I/O', 'ST', ['GPIO', 'RJ15']),
    
    // PORT K GPIO Pins (144-pin only)
    createPin(null, null, null, 19, 'RK0', 'I/O', 'ST', ['GPIO', 'RK0']),
    createPin(null, null, null, 51, 'RK1', 'I/O', 'ST', ['GPIO', 'RK1']),
    createPin(null, null, null, 52, 'RK2', 'I/O', 'ST', ['GPIO', 'RK2']),
    createPin(null, null, null, 53, 'RK3', 'I/O', 'ST', ['GPIO', 'RK3']),
    createPin(null, null, null, 92, 'RK4', 'I/O', 'ST', ['GPIO', 'RK4']),
    createPin(null, null, null, 93, 'RK5', 'I/O', 'ST', ['GPIO', 'RK5']),
    createPin(null, null, null, 94, 'RK6', 'I/O', 'ST', ['GPIO', 'RK6']),
    createPin(null, null, null, 126, 'RK7', 'I/O', 'ST', ['GPIO', 'RK7']),
    
    // Power and Special Function Pins
    createPin(7, 13, null, 17, 'MCLR', 'I', 'ST', ['MCLR']),
    // VDD/VSS pins - multiple instances per package
    // Note: Power pins typically don't have alternate functions and are package-dependent
];

/**
 * Get all pins available for a specific package type
 */
export function getPinsForPackage(packageType: PackageType): DevicePin[] {
    return PIC32MZ_PINS.filter(pin => pin.pinNumber[packageType] !== null);
}

/**
 * Find a pin by name
 */
export function findPinByName(name: string): DevicePin | undefined {
    return PIC32MZ_PINS.find(pin => pin.pinName === name);
}

/**
 * Find a pin by physical pin number for a specific package
 */
export function findPinByNumber(pinNum: number, packageType: PackageType): DevicePin | undefined {
    return PIC32MZ_PINS.find(pin => pin.pinNumber[packageType] === pinNum);
}

/**
 * Get all GPIO pins (RBx, RCx, etc.)
 */
export function getGPIOPins(): DevicePin[] {
    return PIC32MZ_PINS.filter(pin => pin.port !== undefined);
}

/**
 * Get all PPS-capable pins
 */
export function getPPSPins(): DevicePin[] {
    return PIC32MZ_PINS.filter(pin => pin.rpNumber !== undefined);
}

/**
 * Get all analog-capable pins
 */
export function getAnalogPins(): DevicePin[] {
    return PIC32MZ_PINS.filter(pin => pin.analogChannel !== undefined);
}
