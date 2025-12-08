/**
 * XC32 Configuration Code Generator
 * Generates #pragma config statements from UI settings
 */

import { calculateRegisters } from '../devices/pic32mz/efhRegisterMap';

/**
 * XC32 pragma names mapped to register bit fields
 * Based on Microchip XC32 documentation and PIC32MZ datasheet
 */

interface PragmaMapping {
    pragmaName: string;
    settingIndex: number;
    valueMap: { [uiValue: string]: string };
}

const XC32_PRAGMA_MAP: PragmaMapping[] = [
    // DEVCFG3 Settings
    {
        pragmaName: 'FMIIEN',
        settingIndex: 0,
        valueMap: {
            'Default RMII': 'OFF',
            'Alternate MII': 'ON'
        }
    },
    {
        pragmaName: 'FETHIO',
        settingIndex: 1,
        valueMap: {
            'Default Ethernet I/O Pins': 'ON',
            'Alternate Ethernet I/O Pins': 'OFF'
        }
    },
    {
        pragmaName: 'PGL1WAY',
        settingIndex: 2,
        valueMap: {
            'Allow multiple reconfigurations': 'OFF',
            'Allow only one reconfiguration': 'ON'
        }
    },
    {
        pragmaName: 'PMDL1WAY',
        settingIndex: 3,
        valueMap: {
            'Allow multiple reconfigurations': 'OFF',
            'Allow only one reconfiguration': 'ON'
        }
    },
    {
        pragmaName: 'IOL1WAY',
        settingIndex: 4,
        valueMap: {
            'Allow multiple reconfigurations': 'OFF',
            'Allow only one reconfiguration': 'ON'
        }
    },
    {
        pragmaName: 'FUSBIDIO',
        settingIndex: 5,
        valueMap: {
            'Controlled by USB Module': 'ON',
            'Controlled by PORT': 'OFF'
        }
    },

    // DEVCFG2 Settings (PLL Configuration)
    {
        pragmaName: 'FPLLIDIV',
        settingIndex: 6,
        valueMap: {
            '1x Divider': 'DIV_1',
            '2x Divider': 'DIV_2',
            '3x Divider': 'DIV_3',
            '4x Divider': 'DIV_4',
            '5x Divider': 'DIV_5',
            '6x Divider': 'DIV_6',
            '7x Divider': 'DIV_7',
            '8x Divider': 'DIV_8'
        }
    },
    {
        pragmaName: 'FPLLRNG',
        settingIndex: 7,
        valueMap: {
            'Bypass': 'BYPASS',
            '5-10 MHz': 'RANGE_5_10_MHZ',
            '8-16 MHz': 'RANGE_8_16_MHZ',
            '13-26 MHz': 'RANGE_13_26_MHZ',
            '21-42 MHz': 'RANGE_21_42_MHZ',
            '34-64 MHz': 'RANGE_34_64_MHZ'
        }
    },
    {
        pragmaName: 'FPLLICLK',
        settingIndex: 8,
        valueMap: {
            'FRC Oscillator': 'PLL_FRC',
            'POSC (Primary Oscillator)': 'PLL_POSC'
        }
    },
    {
        pragmaName: 'FPLLMULT',
        settingIndex: 9,
        valueMap: {} // Dynamic 1-128
    },
    {
        pragmaName: 'FPLLODIV',
        settingIndex: 10,
        valueMap: {
            '2x Divider': 'DIV_2',
            '4x Divider': 'DIV_4',
            '8x Divider': 'DIV_8',
            '16x Divider': 'DIV_16',
            '32x Divider': 'DIV_32'
        }
    },
    {
        pragmaName: 'UPLLFSEL',
        settingIndex: 11,
        valueMap: {
            'System PLL output is used for USB clock': 'SYS_PLL',
            'USB PLL output is used for USB clock': 'USB_PLL'
        }
    },

    // DEVCFG1 Settings (Oscillator & Watchdog)
    {
        pragmaName: 'FNOSC',
        settingIndex: 12,
        valueMap: {
            'Fast RC Oscillator (FRC)': 'FRC',
            'Fast RC Oscillator (FRC) with PLL': 'SPLL',
            'Primary Oscillator (XT, HS, EC)': 'POSC',
            'Primary Oscillator (XT, HS, EC) with PLL': 'PRIPLL',
            'Secondary Oscillator (SOSC)': 'SOSC',
            'Low-Power RC Oscillator (LPRC)': 'LPRC',
            'Fast RC Oscillator (FRC) divided by 16': 'FRCDIV16',
            'Fast RC Oscillator (FRC) divided by FRCDIV': 'FRCDIV'
        }
    },
    {
        pragmaName: 'FSOSCEN',
        settingIndex: 14,
        valueMap: {
            'Disabled': 'OFF',
            'Enabled': 'ON'
        }
    },
    {
        pragmaName: 'IESO',
        settingIndex: 15,
        valueMap: {
            'Disabled': 'OFF',
            'Enabled': 'ON'
        }
    },
    {
        pragmaName: 'POSCMOD',
        settingIndex: 16,
        valueMap: {
            'External clock mode': 'EC',
            'XT mode (crystal, 4-10 MHz)': 'XT',
            'HS mode (crystal, 10-40 MHz)': 'HS',
            'Primary oscillator disabled': 'OFF'
        }
    },
    {
        pragmaName: 'OSCIOFNC',
        settingIndex: 17,
        valueMap: {
            'Disabled (REFCLKO I/O pin enabled)': 'OFF',
            'Enabled (REFCLKO disabled)': 'ON'
        }
    },
    {
        pragmaName: 'FCKSM',
        settingIndex: 18,
        valueMap: {
            'Clock switching and FSCM are enabled': 'CSECME',
            'Clock switching is enabled, FSCM is disabled': 'CSECMD',
            'Clock switching and FSCM are disabled': 'CSDCMD'
        }
    },
    {
        pragmaName: 'FWDTEN',
        settingIndex: 22,
        valueMap: {
            'WDT Disabled': 'OFF',
            'WDT Enabled': 'ON'
        }
    },
    {
        pragmaName: 'FDMTEN',
        settingIndex: 25,
        valueMap: {
            'Deadman Timer is disabled': 'OFF',
            'Deadman Timer is enabled': 'ON'
        }
    },

    // DEVCFG0 Settings (Debug & Boot)
    {
        pragmaName: 'DEBUG',
        settingIndex: 26,
        valueMap: {
            'Debugger is enabled': 'ON',
            'Debugger is disabled': 'OFF'
        }
    },
    {
        pragmaName: 'JTAGEN',
        settingIndex: 27,
        valueMap: {
            'JTAG Disabled': 'OFF',
            'JTAG Port Enabled': 'ON'
        }
    },
    {
        pragmaName: 'ICESEL',
        settingIndex: 28,
        valueMap: {
            'Communicate on PGEC1/PGED1': 'ICS_PGx1',
            'Communicate on PGEC2/PGED2': 'ICS_PGx2',
            'Communicate on PGEC3/PGED3': 'ICS_PGx3',
            'Communicate on PGEC4/PGED4': 'ICS_PGx4'
        }
    },
    {
        pragmaName: 'TRCEN',
        settingIndex: 29,
        valueMap: {
            'Trace features are disabled': 'OFF',
            'Trace features are enabled': 'ON'
        }
    },
    {
        pragmaName: 'BOOTISA',
        settingIndex: 30,
        valueMap: {
            'Boot code and Exception code is MIPS32': 'MIPS32',
            'Boot code and Exception code is microMIPS': 'MICROMIPS'
        }
    }
];

/**
 * Generate XC32 #pragma config statements
 */
export function generateXC32Config(settings: Map<number, string>, deviceName: string): string {
    let output = '';
    
    // Header comment
    output += `// PIC32MZ Configuration Bit Settings\n`;
    output += `// Device: ${deviceName}\n`;
    output += `// Generated by MikroC Bootloader Plugin\n`;
    output += `\n`;
    output += `// DEVCFG3\n`;
    
    // Generate pragmas
    XC32_PRAGMA_MAP.forEach(mapping => {
        const settingValue = settings.get(mapping.settingIndex);
        if (!settingValue) {
            return;
        }
        
        let pragmaValue = '';
        
        // Handle dynamic multiplier (FPLLMULT)
        if (mapping.pragmaName === 'FPLLMULT') {
            const match = settingValue.match(/PLL Multiply by (\d+)/);
            if (match) {
                pragmaValue = `MUL_${match[1]}`;
            }
        } else {
            pragmaValue = mapping.valueMap[settingValue] || '';
        }
        
        if (pragmaValue) {
            output += `#pragma config ${mapping.pragmaName} = ${pragmaValue}\n`;
        }
    });
    
    output += `\n`;
    
    // Add register values as comments for reference
    const registers = calculateRegisters(settings);
    output += `// Register values (for reference):\n`;
    output += `// DEVCFG3 = 0x${registers.DEVCFG3.toString(16).toUpperCase().padStart(8, '0')}\n`;
    output += `// DEVCFG2 = 0x${registers.DEVCFG2.toString(16).toUpperCase().padStart(8, '0')}\n`;
    output += `// DEVCFG1 = 0x${registers.DEVCFG1.toString(16).toUpperCase().padStart(8, '0')}\n`;
    output += `// DEVCFG0 = 0x${registers.DEVCFG0.toString(16).toUpperCase().padStart(8, '0')}\n`;
    
    return output;
}

/**
 * Generate initialization.c file content
 */
export function generateInitializationC(settings: Map<number, string>, deviceName: string): string {
    // Generate user-selected configuration bits
    let configBits = '';
    
    // Generate pragmas from user settings
    XC32_PRAGMA_MAP.forEach(mapping => {
        const settingValue = settings.get(mapping.settingIndex);
        if (!settingValue) {
            return;
        }
        
        let pragmaValue = '';
        
        // Handle dynamic multiplier (FPLLMULT)
        if (mapping.pragmaName === 'FPLLMULT') {
            const match = settingValue.match(/PLL Multiply by (\d+)/);
            if (match) {
                pragmaValue = `MUL_${match[1]}`;
            }
        } else {
            pragmaValue = mapping.valueMap[settingValue] || '';
        }
        
        if (pragmaValue) {
            configBits += `#pragma config ${mapping.pragmaName} = ${pragmaValue}\n`;
        }
    });
    
    // Add essential configuration bits not in UI (with safe defaults)
    const additionalConfigs = `
// Additional essential configuration bits (safe defaults)
#pragma config FECCCON =    OFF_UNLOCKED
#pragma config FSLEEP =     OFF
#pragma config DBGPER =     PG_ALL
#pragma config SMCLR =      MCLR_NORM
#pragma config SOSCGAIN =   GAIN_LEVEL_3
#pragma config SOSCBOOST =  ON
#pragma config POSCGAIN =   GAIN_LEVEL_3
#pragma config POSCBOOST =  ON
#pragma config EJTAGBEN =   NORMAL
#pragma config CP =         OFF
#pragma config DMTINTV =    WIN_127_128
#pragma config WDTPS =      PS1048576
#pragma config WDTSPGM =    STOP
#pragma config WINDIS =     NORMAL
#pragma config FWDTWINSZ =  WINSZ_25
#pragma config DMTCNT =     DMT31
#pragma config UPLLFSEL =   FREQ_24MHZ
#pragma config USERID =     0xffff
#pragma config TSEQ =       0xffff
#pragma config CSEQ =       0x0
`;

    return `/*******************************************************************************
  System Initialization File

  File Name:
    initialization.c

  Summary:
    This file contains source code necessary to initialize the system.

  Description:
    This file contains source code necessary to initialize the system.  It
    implements the "SYS_Initialize" function, defines the configuration bits,
    and allocates any necessary global system resources.
 *******************************************************************************/

// *****************************************************************************
// *****************************************************************************
// Section: Included Files
// *****************************************************************************
// *****************************************************************************
#include "definitions.h"
#include "device.h"

// ****************************************************************************
// ****************************************************************************
// Section: Configuration Bits
// ****************************************************************************
// ****************************************************************************

${configBits}${additionalConfigs}

// *****************************************************************************
// *****************************************************************************
// Section: System Initialization
// *****************************************************************************
// *****************************************************************************

/*******************************************************************************
  Function:
    void SYS_Initialize ( void *data )

  Summary:
    Initializes the board, services, drivers, application and other modules.

  Remarks:
 */

void SYS_Initialize(void* data)
{
    /* Disable interrupts during initialization */
    __builtin_disable_interrupts();
    
    /* Configure Prefetch, Wait States and ECC */
    PRECONbits.PREFEN = 3;    // Enable predictive prefetch for all regions
    PRECONbits.PFMWS = 3;     // 3 wait states for 200MHz operation
    CFGCONbits.ECCCON = 3;    // Enable Flash ECC
    
    /* Enable global interrupts */
    __builtin_enable_interrupts();
}

/*******************************************************************************
 End of File
*/
`;
}

/**
 * Generate initialization.h file content
 */
export function generateInitializationH(): string {
    return `#ifndef _INITIALIZATION_H
#define _INITIALIZATION_H

#include <xc.h>
#include <sys/attribs.h>

/**
 * System Initialization
 * Must be called at startup before main()
 */
void SYS_Initialize(void);

#endif /* _INITIALIZATION_H */
`;
}
