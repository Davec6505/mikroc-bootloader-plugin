/**
 * MikroC Configuration Generator
 * Generates .cfg XML file from UI settings
 * Uses same DEVCFG register values as XC32
 */

import { calculateRegisters } from '../devices/pic32mz/efhRegisterMap';

/**
 * MikroC configuration register addresses (PIC32MZ)
 */
const MIKROC_CONFIG_ADDRESSES = {
    DEVCFG0: 0x1FC0FFC0,
    DEVCFG1: 0x1FC0FFC4,
    DEVCFG2: 0x1FC0FFC8,
    DEVCFG3: 0x1FC0FFCC
};

/**
 * Generate MikroC .cfg XML file content
 * 
 * Format matches MikroC PRO for PIC32 XML structure:
 * <MCU_DEVICE_FLAGS>
 *   <DEVICE>
 *     <DEVICE_NAME>P32MZ2048EFH100</DEVICE_NAME>
 *     <VALUE>
 *       <COUNT>4</COUNT>
 *       <VALUE0><VAL>$1FC0FFC0:$43000000</VAL></VALUE0>
 *       ...
 *     </VALUE>
 *   </DEVICE>
 * </MCU_DEVICE_FLAGS>
 */
export function generateMikroCConfig(settings: Map<number, string>, deviceName: string): string {
    // Calculate DEVCFG register values (same as XC32)
    const registers = calculateRegisters(settings);
    
    // Format register values as MikroC expects (hex with $ prefix)
    const formatHex = (addr: number, value: number): string => {
        const addrHex = addr.toString(16).toUpperCase().padStart(8, '0');
        const valHex = value.toString(16).toUpperCase().padStart(8, '0');
        return `$${addrHex}:$${valHex}`;
    };
    
    // Build XML structure
    let xml = '<?xml version="1.0"?>\n';
    xml += '<MCU_DEVICE_FLAGS>\n';
    xml += '  <DEVICE>\n';
    xml += `    <DEVICE_NAME>${deviceName}</DEVICE_NAME>\n`;
    xml += '    <VALUE>\n';
    xml += '      <COUNT>4</COUNT>\n';
    xml += '      <VALUE0>\n';
    xml += `        <VAL>${formatHex(MIKROC_CONFIG_ADDRESSES.DEVCFG0, registers.DEVCFG0)}</VAL>\n`;
    xml += '      </VALUE0>\n';
    xml += '      <VALUE1>\n';
    xml += `        <VAL>${formatHex(MIKROC_CONFIG_ADDRESSES.DEVCFG1, registers.DEVCFG1)}</VAL>\n`;
    xml += '      </VALUE1>\n';
    xml += '      <VALUE2>\n';
    xml += `        <VAL>${formatHex(MIKROC_CONFIG_ADDRESSES.DEVCFG2, registers.DEVCFG2)}</VAL>\n`;
    xml += '      </VALUE2>\n';
    xml += '      <VALUE3>\n';
    xml += `        <VAL>${formatHex(MIKROC_CONFIG_ADDRESSES.DEVCFG3, registers.DEVCFG3)}</VAL>\n`;
    xml += '      </VALUE3>\n';
    xml += '    </VALUE>\n';
    xml += '  </DEVICE>\n';
    xml += '</MCU_DEVICE_FLAGS>\n';
    
    return xml;
}

/**
 * Generate .c.ini editor position file (MikroC IDE file)
 */
export function generateMikroCIni(): string {
    return `[Position]
Line=1
Column=1
[FoldedLines]
Count=0
`;
}
