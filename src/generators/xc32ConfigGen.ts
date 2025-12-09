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
            'MII Enabled': 'ON',
            'RMII Enabled': 'ON',
            'OFF': 'OFF'
        }
    },
    {
        pragmaName: 'FETHIO',
        settingIndex: 1,
        valueMap: {
            'Default Ethernet I/O': 'ON',
            'Alternate Ethernet I/O': 'OFF'
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
            'Controlled by the USB Module': 'ON',
            'Controlled by Port Function': 'OFF'
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
            'FRC': 'PLL_FRC',
            'POSC': 'PLL_POSC'
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
            'USB PLL input is 8 MHz': 'FREQ_8MHZ',
            'USB PLL input is 12 MHz': 'FREQ_12MHZ',
            'USB PLL input is 16 MHz': 'FREQ_16MHZ',
            'USB PLL input is 24 MHz': 'FREQ_24MHZ'
        }
    },

    // DEVCFG1 Settings (Oscillator & Watchdog)
    {
        pragmaName: 'FNOSC',
        settingIndex: 12,
        valueMap: {
            'Fast RC Osc (FRC)': 'FRC',
            'Fast RC Osc w/Div-by-N (FRCDIV)': 'FRCDIV',
            'Primary Osc (XT, HS, EC)': 'POSC',
            'Primary Osc w/PLL (XT+PLL, HS+PLL)': 'SPLL',
            'Secondary Osc (SOSC)': 'SOSC',
            'Low-Power RC Osc (LPRC)': 'LPRC',
            'Fast RC Osc w/Div-by-16 (FRC/16)': 'FRCDIV16'
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
            'XT osc mode': 'XT',
            'HS osc mode': 'HS',
            'Disabled': 'OFF'
        }
    },
    {
        pragmaName: 'OSCIOFNC',
        settingIndex: 17,
        valueMap: {
            'CLKO output disabled': 'OFF',
            'CLKO output active': 'ON'
        }
    },
    {
        pragmaName: 'FCKSM',
        settingIndex: 18,
        valueMap: {
            'Clock Switching Enabled, FSCM Enabled': 'CSECME',
            'Clock Switching Enabled, FSCM Disabled': 'CSECMD',
            'Clock Switching Disabled, FSCM Disabled': 'CSDCMD'
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
    /* MISRAC 2012 deviation block start */
    /* MISRA C-2012 Rule 2.2 deviated in this file.  Deviation record ID -  H3_MISRAC_2012_R_2_2_DR_1 */

    /* Start out with interrupts disabled before configuring any modules */
    (void)__builtin_disable_interrupts();

    /* Initialize Clock System */
    CLK_Initialize();
    
    /* Configure Prefetch, Wait States and ECC */
    PRECONbits.PREFEN = 3;
    PRECONbits.PFMWS = 3;
    CFGCONbits.ECCCON = 3;

    /* Initialize GPIO */
    GPIO_Initialize();

    /* Initialize Core Timer */
    CORETIMER_Initialize();

    /* Initialize Interrupt Controller */
    EVIC_Initialize();

    /* MISRAC 2012 deviation block end */
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

/**
 * Generate plib_clk.c content with peripheral clock and PMD settings
 */
export function generatePlibClkC(settings: { [key: number]: string }): string {
    // Extract peripheral clock divisors (indices 40-41)
    const pb2DivSetting = settings[40] || "PBCLK2 is SYSCLK/4";
    const pb3DivSetting = settings[41] || "PBCLK3 is SYSCLK/4";
    
    // Map UI strings to divisor values (PBxDIV register expects divisor - 1)
    const pb2Div = parseInt(pb2DivSetting.match(/\/(\d+)/)?.[1] || "4") - 1;
    const pb3Div = parseInt(pb3DivSetting.match(/\/(\d+)/)?.[1] || "4") - 1;
    
    // PMD register values - default to 0x1001, 0x3, etc. (from working example)
    // In future, these could be customizable based on settings 42-48
    const pmd1 = "0x1001U";
    const pmd2 = "0x3U";
    const pmd3 = "0x1e201ffU";
    const pmd4 = "0xe0U";
    const pmd5 = "0x301f3f3dU";
    const pmd6 = "0x10830001U";
    const pmd7 = "0x500000U";
    
    return `/*******************************************************************************
  SYS CLK Static Functions for Clock System Service

  Company:
    Microchip Technology Inc.

  File Name:
    plib_clk.c

  Summary:
    SYS CLK static function implementations for the Clock System Service.

  Description:
    The Clock System Service provides a simple interface to manage the
    oscillators on Microchip microcontrollers. This file defines the static
    implementation for the Clock System Service.

  Remarks:
    Static functions incorporate all system clock configuration settings as
    determined by the user via the MikroC Bootloader Plugin configuration.

*******************************************************************************/

/*******************************************************************************
* Copyright (C) 2019 Microchip Technology Inc. and its subsidiaries.
*
* Subject to your compliance with these terms, you may use Microchip software
* and any derivatives exclusively with Microchip products. It is your
* responsibility to comply with third party license terms applicable to your
* use of third party software (including open source software) that may
* accompany Microchip software.
*
* THIS SOFTWARE IS SUPPLIED BY MICROCHIP "AS IS". NO WARRANTIES, WHETHER
* EXPRESS, IMPLIED OR STATUTORY, APPLY TO THIS SOFTWARE, INCLUDING ANY IMPLIED
* WARRANTIES OF NON-INFRINGEMENT, MERCHANTABILITY, AND FITNESS FOR A
* PARTICULAR PURPOSE.
*
* IN NO EVENT WILL MICROCHIP BE LIABLE FOR ANY INDIRECT, SPECIAL, PUNITIVE,
* INCIDENTAL OR CONSEQUENTIAL LOSS, DAMAGE, COST OR EXPENSE OF ANY KIND
* WHATSOEVER RELATED TO THE SOFTWARE, HOWEVER CAUSED, EVEN IF MICROCHIP HAS
* BEEN ADVISED OF THE POSSIBILITY OR THE DAMAGES ARE FORESEEABLE. TO THE
* FULLEST EXTENT ALLOWED BY LAW, MICROCHIP'S TOTAL LIABILITY ON ALL CLAIMS IN
* ANY WAY RELATED TO THIS SOFTWARE WILL NOT EXCEED THE AMOUNT OF FEES, IF ANY,
* THAT YOU HAVE PAID DIRECTLY TO MICROCHIP FOR THIS SOFTWARE.
*******************************************************************************/

// *****************************************************************************
// *****************************************************************************
// Section: Include Files
// *****************************************************************************
// *****************************************************************************

#include "device.h"
#include "plib_clk.h"

// *****************************************************************************
// *****************************************************************************
// Section: File Scope Functions
// *****************************************************************************
// *****************************************************************************

// *****************************************************************************
/* Function:
    void CLK_Initialize( void )

  Summary:
    Initializes hardware and internal data structure of the System Clock.

  Description:
    This function initializes the hardware and internal data structure of System
    Clock Service.

  Remarks:
    This configuration is determined by the user via the MikroC Bootloader Plugin.
    The objective is to eliminate the user's need to be knowledgeable in the
    function of the 'configuration bits' to configure the system oscillators.
*/

void CLK_Initialize(void)
{
    /* Unlock system for clock configuration */
    SYSKEY = 0x00000000U;
    SYSKEY = 0xAA996655U;
    SYSKEY = 0x556699AAU;

    /* Peripheral Module Disable Configuration */
    CFGCONbits.PMDLOCK = 0;

    PMD1 = ${pmd1};
    PMD2 = ${pmd2};
    PMD3 = ${pmd3};
    PMD4 = ${pmd4};
    PMD5 = ${pmd5};
    PMD6 = ${pmd6};
    PMD7 = ${pmd7};

    CFGCONbits.PMDLOCK = 1;

    /* Peripheral Bus 2 is by default enabled, set its divisor */
    PB2DIVbits.PBDIV = ${pb2Div};

    /* Peripheral Bus 3 is by default enabled, set its divisor */
    PB3DIVbits.PBDIV = ${pb3Div};

    /* Lock system since done with clock configuration */
    SYSKEY = 0x33333333U;
}
`;
}
