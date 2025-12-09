/**
 * mikroC GPIO Code Generator for PIC32MZ
 * Generates mikroC-style GPIO initialization code
 */

import { PinConfiguration } from '../devices/pic32mz/types';

export function generateMikroCGpioCode(pins: PinConfiguration[]): string {
    const configuredPins = pins.filter(p => p.mode !== 'GPIO' || p.gpio);
    
    if (configuredPins.length === 0) {
        return '// No GPIO pins configured\n';
    }

    let code = '// Pin Definitions\n';
    
    // Generate macros for each configured GPIO pin
    configuredPins.forEach(pin => {
        if (pin.mode === 'GPIO' && pin.gpio) {
            const customName = pin.gpio.customName || pin.pinName;
            const port = pin.pinName.charAt(1); // 'B' from 'RB8'
            const bit = pin.pinName.substring(2); // '8' from 'RB8'
            
            code += `#define ${customName}_TRIS    TRIS${port}bits.TRIS${port}${bit}\n`;
            code += `#define ${customName}_LAT     LAT${port}bits.LAT${port}${bit}\n`;
            code += `#define ${customName}_PORT    PORT${port}bits.R${port}${bit}\n`;
            
            if (pin.gpio.direction === 'Output') {
                code += `#define ${customName}_Set()   (LAT${port}SET = (1 << ${bit}))\n`;
                code += `#define ${customName}_Clear() (LAT${port}CLR = (1 << ${bit}))\n`;
                code += `#define ${customName}_Toggle() (LAT${port}INV = (1 << ${bit}))\n`;
            } else {
                code += `#define ${customName}_Get()    (PORT${port}bits.R${port}${bit})\n`;
            }
            code += '\n';
        }
    });

    // Generate initialization function
    code += '// GPIO Initialization\n';
    code += 'void GPIO_Initialize(void) {\n';
    
    // Group by port for efficiency
    const portGroups = new Map<string, PinConfiguration[]>();
    configuredPins.forEach(pin => {
        if (pin.mode === 'GPIO' && pin.gpio) {
            const port = pin.pinName.charAt(1);
            if (!portGroups.has(port)) {
                portGroups.set(port, []);
            }
            portGroups.get(port)!.push(pin);
        }
    });

    // Generate port-wise initialization
    portGroups.forEach((portPins, port) => {
        code += `    // Configure PORT${port}\n`;
        
        // Calculate bitmasks
        let anselClrMask = 0;
        let trisClrMask = 0;
        let trisSetMask = 0;
        let latClrMask = 0;
        let latSetMask = 0;
        let cnpuSetMask = 0;
        let cnpdSetMask = 0;
        let odcSetMask = 0;

        portPins.forEach(pin => {
            const bit = parseInt(pin.pinName.substring(2));
            const bitMask = 1 << bit;
            
            // Disable analog
            anselClrMask |= bitMask;
            
            if (pin.gpio!.direction === 'Output') {
                trisClrMask |= bitMask;
                if (pin.gpio!.initialState === 'High') {
                    latSetMask |= bitMask;
                } else {
                    latClrMask |= bitMask;
                }
                if (pin.gpio!.openDrain) {
                    odcSetMask |= bitMask;
                }
            } else {
                trisSetMask |= bitMask;
                if (pin.gpio!.pullUp) {
                    cnpuSetMask |= bitMask;
                }
                if (pin.gpio!.pullDown) {
                    cnpdSetMask |= bitMask;
                }
            }
        });

        // Generate register writes
        if (anselClrMask) {
            code += `    ANSEL${port}CLR = 0x${anselClrMask.toString(16).toUpperCase()}; // Disable analog\n`;
        }
        if (latClrMask) {
            code += `    LAT${port}CLR = 0x${latClrMask.toString(16).toUpperCase()}; // Set outputs low\n`;
        }
        if (latSetMask) {
            code += `    LAT${port}SET = 0x${latSetMask.toString(16).toUpperCase()}; // Set outputs high\n`;
        }
        if (trisClrMask) {
            code += `    TRIS${port}CLR = 0x${trisClrMask.toString(16).toUpperCase()}; // Set as outputs\n`;
        }
        if (trisSetMask) {
            code += `    TRIS${port}SET = 0x${trisSetMask.toString(16).toUpperCase()}; // Set as inputs\n`;
        }
        if (cnpuSetMask) {
            code += `    CNPU${port}SET = 0x${cnpuSetMask.toString(16).toUpperCase()}; // Enable pull-ups\n`;
        }
        if (cnpdSetMask) {
            code += `    CNPD${port}SET = 0x${cnpdSetMask.toString(16).toUpperCase()}; // Enable pull-downs\n`;
        }
        if (odcSetMask) {
            code += `    ODC${port}SET = 0x${odcSetMask.toString(16).toUpperCase()}; // Enable open-drain\n`;
        }
        
        code += '\n';
    });

    code += '}\n';
    
    return code;
}
