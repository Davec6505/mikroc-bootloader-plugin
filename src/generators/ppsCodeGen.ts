/**
 * PPS (Peripheral Pin Select) Code Generator for PIC32MZ
 * Generates initialization code for both mikroC and Harmony/XC32
 */

import { PinConfiguration } from '../devices/pic32mz/types';
import { PPS_INPUT_SIGNALS, PPS_OUTPUT_PINS } from '../devices/pic32mz/ppsMapping';

export function generateMikroCPPSCode(pins: PinConfiguration[]): string {
    const ppsPins = pins.filter(p => p.mode === 'Peripheral' && p.peripheral);
    
    if (ppsPins.length === 0) {
        return '// No PPS configured\n';
    }

    let code = '// PPS Configuration\n';
    code += 'void PPS_Initialize(void) {\n';
    code += '    // Unlock PPS\n';
    code += '    SYSKEY = 0x00000000;\n';
    code += '    SYSKEY = 0xAA996655;\n';
    code += '    SYSKEY = 0x556699AA;\n';
    code += '    CFGCONbits.IOLOCK = 0;\n\n';

    // Group by input/output
    const inputMappings: Array<{signal: string, pin: string, value: number}> = [];
    const outputMappings: Array<{pin: string, signal: string, value: number}> = [];

    ppsPins.forEach(pin => {
        const peripheral = pin.peripheral!;
        
        // Check if this is an input signal
        const inputSignal = PPS_INPUT_SIGNALS.find(s => s.signalName === peripheral.ppsInputSignal);
        if (inputSignal && peripheral.ppsInputSignal) {
            // Find the RP value for this pin
            const rpNum = extractRPNumber(pin.pinName);
            if (rpNum !== null) {
                inputMappings.push({
                    signal: inputSignal.registerName,
                    pin: pin.pinName,
                    value: rpNum
                });
            }
        }

        // Check if this is an output signal
        if (peripheral.ppsOutputSignal) {
            const outputPin = PPS_OUTPUT_PINS.find(p => p.rpPin === `RP${pin.pinName.substring(1)}`);
            if (outputPin) {
                const outputSignal = outputPin.validPeripherals.find(v => v.signalName === peripheral.ppsOutputSignal);
                if (outputSignal) {
                    outputMappings.push({
                        pin: outputPin.registerName,
                        signal: peripheral.ppsOutputSignal,
                        value: outputSignal.value
                    });
                }
            }
        }
    });

    // Generate input mappings
    if (inputMappings.length > 0) {
        code += '    // Configure PPS Inputs\n';
        inputMappings.forEach(mapping => {
            code += `    ${mapping.signal} = 0x${mapping.value.toString(16).toUpperCase()}; // ${mapping.pin}\n`;
        });
        code += '\n';
    }

    // Generate output mappings
    if (outputMappings.length > 0) {
        code += '    // Configure PPS Outputs\n';
        outputMappings.forEach(mapping => {
            code += `    ${mapping.pin} = 0x${mapping.value.toString(16).toUpperCase()}; // ${mapping.signal}\n`;
        });
        code += '\n';
    }

    code += '    // Lock PPS\n';
    code += '    CFGCONbits.IOLOCK = 1;\n';
    code += '    SYSKEY = 0x00000000;\n';
    code += '}\n';

    return code;
}

export function generateHarmonyPPSCode(pins: PinConfiguration[]): string {
    const ppsPins = pins.filter(p => p.mode === 'Peripheral' && p.peripheral);
    
    if (ppsPins.length === 0) {
        return '// No PPS configured\n';
    }

    let code = 'void PPS_Initialize(void)\n{\n';
    code += '    /* Unlock system for PPS configuration */\n';
    code += '    SYSKEY = 0x00000000U;\n';
    code += '    SYSKEY = 0xAA996655U;\n';
    code += '    SYSKEY = 0x556699AAU;\n';
    code += '    CFGCONbits.IOLOCK = 0;\n\n';

    // Group by input/output
    const inputMappings: Array<{signal: string, pin: string, value: number, desc: string}> = [];
    const outputMappings: Array<{pin: string, signal: string, value: number, desc: string}> = [];

    ppsPins.forEach(pin => {
        const peripheral = pin.peripheral!;
        
        // Check if this is an input signal
        const inputSignal = PPS_INPUT_SIGNALS.find(s => s.signalName === peripheral.ppsInputSignal);
        if (inputSignal && peripheral.ppsInputSignal) {
            const rpNum = extractRPNumber(pin.pinName);
            if (rpNum !== null) {
                inputMappings.push({
                    signal: inputSignal.registerName,
                    pin: pin.pinName,
                    value: rpNum,
                    desc: inputSignal.description
                });
            }
        }

        // Check if this is an output signal
        if (peripheral.ppsOutputSignal) {
            const outputPin = PPS_OUTPUT_PINS.find(p => p.rpPin === `RP${pin.pinName.substring(1)}`);
            if (outputPin) {
                const outputSignal = outputPin.validPeripherals.find(v => v.signalName === peripheral.ppsOutputSignal);
                if (outputSignal) {
                    outputMappings.push({
                        pin: outputPin.registerName,
                        signal: peripheral.ppsOutputSignal,
                        value: outputSignal.value,
                        desc: outputSignal.description
                    });
                }
            }
        }
    });

    // Generate input mappings
    if (inputMappings.length > 0) {
        code += '    /* PPS Input Mapping */\n';
        inputMappings.forEach(mapping => {
            code += `    ${mapping.signal} = 0x${mapping.value.toString(16).toUpperCase()}U; /* ${mapping.desc} = ${mapping.pin} */\n`;
        });
        code += '\n';
    }

    // Generate output mappings
    if (outputMappings.length > 0) {
        code += '    /* PPS Output Mapping */\n';
        outputMappings.forEach(mapping => {
            code += `    ${mapping.pin} = 0x${mapping.value.toString(16).toUpperCase()}U; /* ${mapping.signal} = ${mapping.desc} */\n`;
        });
        code += '\n';
    }

    code += '    /* Lock back the PPS */\n';
    code += '    CFGCONbits.IOLOCK = 1;\n';
    code += '    SYSKEY = 0x00000000U;\n';
    code += '}\n';

    return code;
}

/**
 * Extract RP number from pin name (e.g., "RB8" -> 8 for RPB8)
 */
function extractRPNumber(pinName: string): number | null {
    // Pin name format: RB8 -> RPB8 has RP number
    // Check if this pin has PPS capability by looking at the port/pin combination
    const match = pinName.match(/^R([A-K])(\d+)$/);
    if (!match) {
        return null;
    }
    
    const port = match[1];
    const bit = parseInt(match[2]);
    
    // For simplicity, assume the RP number matches the bit number
    // In a real implementation, this would need a proper lookup table
    return bit;
}
