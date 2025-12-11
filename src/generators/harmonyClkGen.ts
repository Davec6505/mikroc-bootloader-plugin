/**
 * Clock System Generator for PIC32MZ
 * Generates plib_clk.c and plib_clk.h for Peripheral Bus Clock configuration
 */

import * as fs from 'fs';
import * as path from 'path';

export interface PBCLKConfig {
    enabled: boolean;
    divider: number;  // 1, 2, 4, 8, 16, 32, 64, 128
}

export interface ClkConfig {
    cpuClockFrequency: number;  // System clock (e.g., 200000000)
    pbclk1: PBCLKConfig;
    pbclk2: PBCLKConfig;
    pbclk3: PBCLKConfig;
    pbclk4: PBCLKConfig;
    pbclk5: PBCLKConfig;
    pbclk6?: PBCLKConfig;  // May not exist on all devices
    pbclk7: PBCLKConfig;
    pbclk8?: PBCLKConfig;  // May not exist on all devices
}

export interface PMDConfig {
    pmd1: string;  // Hex value (e.g., "0x1001")
    pmd2: string;
    pmd3: string;
    pmd4: string;
    pmd5: string;
    pmd6: string;
    pmd7: string;
}

export class HarmonyClkGenerator {
    private templateDir: string;

    constructor(templateDir: string) {
        this.templateDir = templateDir;
    }

    /**
     * Calculate PBCLK frequency from system clock and divider
     */
    public calculatePBCLKFrequency(systemClock: number, divider: number): number {
        return Math.floor(systemClock / divider);
    }

    /**
     * Get PBDIV register value from divider (divider - 1)
     */
    private getPBDIVValue(divider: number): number {
        return divider - 1;
    }

    /**
     * Generate PBCLK configuration code
     */
    private generatePBCLKConfig(config: ClkConfig): string {
        const lines: string[] = [];

        // PBCLK1 - Always enabled by default
        if (config.pbclk1.enabled && config.pbclk1.divider !== 2) {
            lines.push('    /* Peripheral Bus 1 is by default enabled, set its divisor */');
            lines.push(`    PB1DIVbits.PBDIV = ${this.getPBDIVValue(config.pbclk1.divider)};`);
            lines.push('');
        }

        // PBCLK2
        if (config.pbclk2.enabled) {
            if (config.pbclk2.divider !== 2) {
                lines.push('    /* Peripheral Bus 2 is by default enabled, set its divisor */');
                lines.push(`    PB2DIVbits.PBDIV = ${this.getPBDIVValue(config.pbclk2.divider)};`);
                lines.push('');
            }
        } else {
            lines.push('    /* Disable Peripheral Bus 2 */');
            lines.push('    PB2DIVCLR = _PB2DIV_ON_MASK;');
            lines.push('');
        }

        // PBCLK3
        if (config.pbclk3.enabled) {
            if (config.pbclk3.divider !== 2) {
                lines.push('    /* Peripheral Bus 3 is by default enabled, set its divisor */');
                lines.push(`    PB3DIVbits.PBDIV = ${this.getPBDIVValue(config.pbclk3.divider)};`);
                lines.push('');
            }
        } else {
            lines.push('    /* Disable Peripheral Bus 3 */');
            lines.push('    PB3DIVCLR = _PB3DIV_ON_MASK;');
            lines.push('');
        }

        // PBCLK4
        if (config.pbclk4.enabled) {
            if (config.pbclk4.divider !== 2) {
                lines.push('    /* Peripheral Bus 4 is by default enabled, set its divisor */');
                lines.push(`    PB4DIVbits.PBDIV = ${this.getPBDIVValue(config.pbclk4.divider)};`);
                lines.push('');
            }
        } else {
            lines.push('    /* Disable Peripheral Bus 4 */');
            lines.push('    PB4DIVCLR = _PB4DIV_ON_MASK;');
            lines.push('');
        }

        // PBCLK5
        if (config.pbclk5.enabled) {
            if (config.pbclk5.divider !== 2) {
                lines.push('    /* Peripheral Bus 5 is by default enabled, set its divisor */');
                lines.push(`    PB5DIVbits.PBDIV = ${this.getPBDIVValue(config.pbclk5.divider)};`);
                lines.push('');
            }
        } else {
            lines.push('    /* Disable Peripheral Bus 5 */');
            lines.push('    PB5DIVCLR = _PB5DIV_ON_MASK;');
            lines.push('');
        }

        // PBCLK6 (may not exist on all devices)
        if (config.pbclk6) {
            if (config.pbclk6.enabled) {
                if (config.pbclk6.divider !== 2) {
                    lines.push('    /* Peripheral Bus 6 is by default enabled, set its divisor */');
                    lines.push(`    PB6DIVbits.PBDIV = ${this.getPBDIVValue(config.pbclk6.divider)};`);
                    lines.push('');
                }
            } else {
                lines.push('    /* Disable Peripheral Bus 6 */');
                lines.push('    PB6DIVCLR = _PB6DIV_ON_MASK;');
                lines.push('');
            }
        }

        // PBCLK7
        if (config.pbclk7.enabled) {
            if (config.pbclk7.divider !== 1) {
                lines.push('    /* Peripheral Bus 7 is by default enabled, set its divisor */');
                lines.push(`    PB7DIVbits.PBDIV = ${this.getPBDIVValue(config.pbclk7.divider)};`);
                lines.push('');
            }
        } else {
            lines.push('    /* Disable Peripheral Bus 7 */');
            lines.push('    PB7DIVCLR = _PB7DIV_ON_MASK;');
            lines.push('');
        }

        // PBCLK8 (may not exist on all devices)
        if (config.pbclk8) {
            if (config.pbclk8.enabled) {
                if (config.pbclk8.divider !== 2) {
                    lines.push('    /* Peripheral Bus 8 is by default enabled, set its divisor */');
                    lines.push(`    PB8DIVbits.PBDIV = ${this.getPBDIVValue(config.pbclk8.divider)};`);
                    lines.push('');
                }
            } else {
                lines.push('    /* Disable Peripheral Bus 8 */');
                lines.push('    PB8DIVCLR = _PB8DIV_ON_MASK;');
                lines.push('');
            }
        }

        return lines.join('\r\n');
    }

    /**
     * Generate PMD (Peripheral Module Disable) configuration
     */
    private generatePMDConfig(pmdConfig: PMDConfig): string {
        const lines: string[] = [];

        if (pmdConfig.pmd1 !== '0x0') {
            lines.push(`    PMD1 = ${pmdConfig.pmd1}U;`);
        }
        if (pmdConfig.pmd2 !== '0x0') {
            lines.push(`    PMD2 = ${pmdConfig.pmd2}U;`);
        }
        if (pmdConfig.pmd3 !== '0x0') {
            lines.push(`    PMD3 = ${pmdConfig.pmd3}U;`);
        }
        if (pmdConfig.pmd4 !== '0x0') {
            lines.push(`    PMD4 = ${pmdConfig.pmd4}U;`);
        }
        if (pmdConfig.pmd5 !== '0x0') {
            lines.push(`    PMD5 = ${pmdConfig.pmd5}U;`);
        }
        if (pmdConfig.pmd6 !== '0x0') {
            lines.push(`    PMD6 = ${pmdConfig.pmd6}U;`);
        }
        if (pmdConfig.pmd7 !== '0x0') {
            lines.push(`    PMD7 = ${pmdConfig.pmd7}U;`);
        }

        return lines.join('\r\n');
    }

    /**
     * Generate plib_clk.c file
     */
    public generateClkSource(config: ClkConfig, pmdConfig: PMDConfig): string {
        const pbclkConfig = this.generatePBCLKConfig(config);
        const pmdConfigStr = this.generatePMDConfig(pmdConfig);

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
    determined by the user via the Microchip Harmony Configurator GUI.
    It provides static version of the routines, eliminating the need for an
    object ID or object handle.

    Static single-open interfaces also eliminate the need for the open handle.

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
    This is configuration values for the static version of the Clock System
    Service module is determined by the user via the MHC GUI.

    The objective is to eliminate the user's need to be knowledgeable in the
    function of the 'configuration bits' to configure the system oscillators.
*/

void CLK_Initialize( void )
{
    /* unlock system for clock configuration */
    SYSKEY = 0x00000000U;
    SYSKEY = 0xAA996655U;
    SYSKEY = 0x556699AAU;

    /* Peripheral Module Disable Configuration */

    CFGCONbits.PMDLOCK = 0;

${pmdConfigStr}

    CFGCONbits.PMDLOCK = 1;

${pbclkConfig}
      

    /* Lock system since done with clock configuration */
    SYSKEY = 0x33333333U;
}
`;
    }

    /**
     * Generate plib_clk.h file
     */
    public generateClkHeader(): string {
        return `/*******************************************************************************
  SYS CLK Static Functions for Clock System Service

  Company:
    Microchip Technology Inc.

  File Name:
    plib_clk.h

  Summary:
    SYS CLK static function interface for the Clock System Service.

  Description:
    The Clock System Service provides a simple interface to manage the
    oscillators on Microchip microcontrollers. This file defines the static
    implementation for the Clock System Service.

  Remarks:
    Static functions incorporate all system clock configuration settings as
    determined by the user via the Microchip Harmony Configurator GUI.
    It provides static version of the routines, eliminating the need for an
    object ID or object handle.

    Static single-open interfaces also eliminate the need for the open handle.

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

#ifndef PLIB_CLK_H
#define PLIB_CLK_H

// *****************************************************************************
// *****************************************************************************
// Section: Included Files
// *****************************************************************************
// *****************************************************************************

#include <stddef.h>
#include <stdbool.h>  

// DOM-IGNORE-BEGIN
#ifdef __cplusplus // Provide C++ Compatibility

	extern "C" {

#endif
// DOM-IGNORE-END
 
// *****************************************************************************
// *****************************************************************************
// Section: CLK Module System Interface Routines
// *****************************************************************************
// *****************************************************************************

// *****************************************************************************
/* Function:
    void CLK_Initialize( void )

  Summary:
    Initializes hardware of the System Clock and Peripheral Clock.
    
  Description:
    This function initializes the hardware of System Clock and Peripheral Clocks.

  Precondition:
    None.

  Parameters:
    None.

  Returns:
    None.

  Example:
    <code>
    CLK_Initialize();
    </code>

  Remarks:
    None.
*/

void CLK_Initialize( void );

// DOM-IGNORE-BEGIN
#ifdef __cplusplus  // Provide C++ Compatibility

    }

#endif
// DOM-IGNORE-END

#endif // PLIB_CLK_H
`;
    }

    /**
     * Generate default clock configuration (matches Blinky_XC32)
     */
    public static getDefaultConfig(): ClkConfig {
        return {
            cpuClockFrequency: 200000000,  // 200 MHz
            pbclk1: { enabled: true, divider: 2 },   // 100 MHz (default)
            pbclk2: { enabled: true, divider: 4 },   // 50 MHz (UART, SPI, I2C)
            pbclk3: { enabled: true, divider: 4 },   // 50 MHz (Timers, ADC, CMP)
            pbclk4: { enabled: true, divider: 2 },   // 100 MHz (default)
            pbclk5: { enabled: true, divider: 2 },   // 100 MHz (default)
            pbclk6: undefined,  // Not present on all devices
            pbclk7: { enabled: true, divider: 1 },   // 200 MHz (default)
            pbclk8: undefined,  // Not present on all devices
        };
    }

    /**
     * Generate default PMD configuration (matches Blinky_XC32)
     */
    public static getDefaultPMDConfig(): PMDConfig {
        return {
            pmd1: '0x1001',
            pmd2: '0x3',
            pmd3: '0x1ff01ff',
            pmd4: '0x1f0',
            pmd5: '0x301f3f3f',
            pmd6: '0x10830001',
            pmd7: '0x500000',
        };
    }

    /**
     * Generate clock files and return as object
     */
    public generate(config: ClkConfig, pmdConfig: PMDConfig): { header: string; source: string } {
        return {
            header: this.generateClkHeader(),
            source: this.generateClkSource(config, pmdConfig),
        };
    }

    /**
     * Write clock files to disk
     */
    public writeFiles(outputDir: string, config: ClkConfig, pmdConfig: PMDConfig): void {
        const files = this.generate(config, pmdConfig);

        const clkDir = path.join(outputDir, 'peripheral', 'clk');
        if (!fs.existsSync(clkDir)) {
            fs.mkdirSync(clkDir, { recursive: true });
        }

        fs.writeFileSync(path.join(clkDir, 'plib_clk.h'), files.header, 'utf8');
        fs.writeFileSync(path.join(clkDir, 'plib_clk.c'), files.source, 'utf8');
    }
}
