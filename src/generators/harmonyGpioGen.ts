/**
 * Harmony/XC32 GPIO Code Generator for PIC32MZ
 * Generates MCC-compatible plib_gpio files
 */

import { PinConfiguration } from '../devices/pic32mz/types';

export function generateHarmonyGpioHeader(pins: PinConfiguration[]): string {
    const configuredPins = pins.filter(p => p.mode === 'GPIO' && p.gpio);
    
    if (configuredPins.length === 0) {
        return '// No GPIO pins configured\n';
    }

    let code = `#ifndef PLIB_GPIO_H
#define PLIB_GPIO_H

#include <device.h>
#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

`;

    // Generate pin macros
    code += '// GPIO Pin Macros\n';
    configuredPins.forEach(pin => {
        const customName = pin.gpio!.customName || pin.pinName;
        const port = pin.pinName.charAt(1);
        const bit = pin.pinName.substring(2);
        
        if (pin.gpio!.direction === 'Output') {
            code += `#define ${customName}_Set()               (LAT${port}SET = (1U << ${bit}))\n`;
            code += `#define ${customName}_Clear()             (LAT${port}CLR = (1U << ${bit}))\n`;
            code += `#define ${customName}_Toggle()            (LAT${port}INV = (1U << ${bit}))\n`;
            code += `#define ${customName}_Get()               (((PORT${port} >> ${bit}) & 0x1U) != 0U)\n`;
            code += `#define ${customName}_OutputEnable()      (TRIS${port}CLR = (1U << ${bit}))\n`;
            code += `#define ${customName}_InputEnable()       (TRIS${port}SET = (1U << ${bit}))\n`;
        } else {
            code += `#define ${customName}_Get()               (((PORT${port} >> ${bit}) & 0x1U) != 0U)\n`;
            code += `#define ${customName}_InputEnable()       (TRIS${port}SET = (1U << ${bit}))\n`;
        }
        code += '\n';
    });

    code += `void GPIO_Initialize(void);

#ifdef __cplusplus
}
#endif

#endif // PLIB_GPIO_H
`;

    return code;
}

export function generateHarmonyGpioSource(pins: PinConfiguration[]): string {
    const configuredPins = pins.filter(p => p.mode === 'GPIO' && p.gpio);
    
    if (configuredPins.length === 0) {
        return '// No GPIO pins configured\n';
    }

    let code = `#include "plib_gpio.h"

void GPIO_Initialize(void)
{
`;

    // Group by port
    const portGroups = new Map<string, PinConfiguration[]>();
    configuredPins.forEach(pin => {
        const port = pin.pinName.charAt(1);
        if (!portGroups.has(port)) {
            portGroups.set(port, []);
        }
        portGroups.get(port)!.push(pin);
    });

    // Generate port-wise initialization
    portGroups.forEach((portPins, port) => {
        code += `    /* PORT${port} Configuration */\n`;
        
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

        // Generate comments for what's being configured
        const configuredBits: string[] = [];
        portPins.forEach(pin => {
            configuredBits.push(`${pin.pinName}${pin.gpio!.customName ? ` (${pin.gpio!.customName})` : ''}`);
        });
        code += `    /* ${configuredBits.join(', ')} */\n`;

        // Generate register writes
        if (anselClrMask) {
            code += `    ANSEL${port}CLR = 0x${anselClrMask.toString(16).toUpperCase()}U;\n`;
        }
        if (trisClrMask) {
            code += `    TRIS${port}CLR = 0x${trisClrMask.toString(16).toUpperCase()}U; /* Output */\n`;
        }
        if (trisSetMask) {
            code += `    TRIS${port}SET = 0x${trisSetMask.toString(16).toUpperCase()}U; /* Input */\n`;
        }
        if (latClrMask) {
            code += `    LAT${port}CLR = 0x${latClrMask.toString(16).toUpperCase()}U; /* Initial state low */\n`;
        }
        if (latSetMask) {
            code += `    LAT${port}SET = 0x${latSetMask.toString(16).toUpperCase()}U; /* Initial state high */\n`;
        }
        if (cnpuSetMask) {
            code += `    CNPU${port}SET = 0x${cnpuSetMask.toString(16).toUpperCase()}U; /* Pull-up enabled */\n`;
        }
        if (cnpdSetMask) {
            code += `    CNPD${port}SET = 0x${cnpdSetMask.toString(16).toUpperCase()}U; /* Pull-down enabled */\n`;
        }
        if (odcSetMask) {
            code += `    ODC${port}SET = 0x${odcSetMask.toString(16).toUpperCase()}U; /* Open-drain enabled */\n`;
        }
        
        code += '\n';
    });

    code += '}\n';
    
    return code;
}
