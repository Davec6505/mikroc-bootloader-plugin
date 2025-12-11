/**
 * PIC32MZ EFH Register Mapper
 * Maps UI configuration settings to DEVCFG0-3 register bit values
 * 
 * Based on PIC32MZ2048EFH datasheet and MikroC definitions
 */

// Register bit field interface
interface RegisterBitField {
    register: 'DEVCFG0' | 'DEVCFG1' | 'DEVCFG2' | 'DEVCFG3';
    bitStart: number;  // LSB position
    bitWidth: number;  // Number of bits
    value: number;     // Calculated bit value
}

// Mapping from setting description to register bit value
interface SettingValueMap {
    [description: string]: number;
}

// Complete register mapping for all 40 settings
interface RegisterMapping {
    [settingIndex: number]: {
        register: 'DEVCFG0' | 'DEVCFG1' | 'DEVCFG2' | 'DEVCFG3';
        fieldName: string;
        bitStart: number;
        bitWidth: number;
        values: SettingValueMap;
    };
}

/**
 * PIC32MZ EFH DEVCFG Register Bit Field Mapping
 * 
 * DEVCFG3 (0xBFC0FFC0):
 *   USERID[15:0]    - User ID bits
 *   FMIIEN[24]      - Ethernet MII Enable
 *   FETHIO[25]      - Ethernet I/O Pin Select
 *   PGL1WAY[27]     - Permission Group Lock One Way Configuration
 *   PMDL1WAY[28]    - Peripheral Module Disable Lock One Way Configuration
 *   IOL1WAY[29]     - Peripheral Pin Select Lock One Way Configuration
 *   FUSBIDIO[30]    - USB USBID Selection
 * 
 * DEVCFG2 (0xBFC0FFC4):
 *   FPLLIDIV[2:0]   - System PLL Input Divider
 *   FPLLRNG[6:4]    - System PLL Input Range
 *   FPLLICLK[7]     - System PLL Input Clock Select
 *   FPLLMULT[14:8]  - System PLL Multiplier
 *   FPLLODIV[18:16] - System PLL Output Divider
 *   UPLLFSEL[30]    - USB PLL Input Clock Select
 * 
 * DEVCFG1 (0xBFC0FFC8):
 *   FNOSC[2:0]      - Oscillator Selection
 *   DMTINTV[5:3]    - DMT Count Window Interval
 *   FSOSCEN[6]      - Secondary Oscillator Enable
 *   IESO[7]         - Internal External Switchover
 *   POSCMOD[9:8]    - Primary Oscillator Configuration
 *   OSCIOFNC[10]    - CLKO Output Signal Active
 *   FCKSM[15:14]    - Clock Switching and Monitor Selection
 *   WDTPS[20:16]    - Watchdog Timer Postscaler
 *   WDTSPGM[21]     - Watchdog Timer Stop During Flash Programming
 *   WINDIS[22]      - Watchdog Timer Window Mode Disable
 *   FWDTEN[23]      - Watchdog Timer Enable
 *   FWDTWINSZ[25:24]- Watchdog Timer Window Size
 *   DMTCNT[30:26]   - Deadman Timer Count Select
 *   FDMTEN[31]      - Deadman Timer Enable
 * 
 * DEVCFG0 (0xBFC0FFCC):
 *   DEBUG[1:0]      - Background Debugger Enable
 *   JTAGEN[2]       - JTAG Enable
 *   ICESEL[4:3]     - ICD Communication Channel Select
 *   TRCEN[5]        - Trace Enable
 *   BOOTISA[6]      - Boot ISA Selection
 *   FECCCON[9:8]    - Dynamic Flash ECC Configuration
 *   FSLEEP[10]      - Flash Sleep Mode
 *   DBGPER[14:12]   - Debug Mode CPU Access Permission
 *   SMCLR[15]       - Soft Master Clear Enable
 *   SOSCGAIN[17:16] - Secondary Oscillator Gain Control
 *   SOSCBOOST[18]   - Secondary Oscillator Boost Kick Start Enable
 *   POSCGAIN[20:19] - Primary Oscillator Gain Control
 *   POSCBOOST[21]   - Primary Oscillator Boost Kick Start Enable
 *   EJTAGBEN[30]    - Enhanced JTAG Enable
 */

export const EFH_REGISTER_MAP: RegisterMapping = {
    // SETTING0: Ethernet RMII/MII Enable
    0: {
        register: 'DEVCFG3',
        fieldName: 'FMIIEN',
        bitStart: 24,
        bitWidth: 1,
        values: {
            'Default RMII': 0,
            'Alternate MII': 1
        }
    },

    // SETTING1: Ethernet I/O Pin Selection
    1: {
        register: 'DEVCFG3',
        fieldName: 'FETHIO',
        bitStart: 25,
        bitWidth: 1,
        values: {
            'Default Ethernet I/O Pins': 0,
            'Alternate Ethernet I/O Pins': 1
        }
    },

    // SETTING2: Permission Group Lock Configuration
    2: {
        register: 'DEVCFG3',
        fieldName: 'PGL1WAY',
        bitStart: 27,
        bitWidth: 1,
        values: {
            'Allow multiple reconfigurations': 0,
            'Allow only one reconfiguration': 1
        }
    },

    // SETTING3: Peripheral Module Disable Configuration
    3: {
        register: 'DEVCFG3',
        fieldName: 'PMDL1WAY',
        bitStart: 28,
        bitWidth: 1,
        values: {
            'Allow multiple reconfigurations': 0,
            'Allow only one reconfiguration': 1
        }
    },

    // SETTING4: Peripheral Pin Select Configuration
    4: {
        register: 'DEVCFG3',
        fieldName: 'IOL1WAY',
        bitStart: 29,
        bitWidth: 1,
        values: {
            'Allow multiple reconfigurations': 0,
            'Allow only one reconfiguration': 1
        }
    },

    // SETTING5: USB USBID Selection
    5: {
        register: 'DEVCFG3',
        fieldName: 'FUSBIDIO',
        bitStart: 30,
        bitWidth: 1,
        values: {
            'Controlled by USB Module': 0,
            'Controlled by PORT': 1
        }
    },

    // SETTING6: System PLL Input Divider
    6: {
        register: 'DEVCFG2',
        fieldName: 'FPLLIDIV',
        bitStart: 0,
        bitWidth: 3,
        values: {
            '1x Divider': 0,
            '2x Divider': 1,
            '3x Divider': 2,
            '4x Divider': 3,
            '5x Divider': 4,
            '6x Divider': 5,
            '7x Divider': 6,
            '8x Divider': 7
        }
    },

    // SETTING7: System PLL Input Range
    7: {
        register: 'DEVCFG2',
        fieldName: 'FPLLRNG',
        bitStart: 4,
        bitWidth: 3,
        values: {
            'Bypass': 0,
            '5-10 MHz': 1,
            '8-16 MHz': 2,
            '13-26 MHz': 3,
            '21-42 MHz': 4,
            '34-64 MHz': 5
        }
    },

    // SETTING8: System PLL Input Clock Source
    8: {
        register: 'DEVCFG2',
        fieldName: 'FPLLICLK',
        bitStart: 7,
        bitWidth: 1,
        values: {
            'FRC Oscillator': 0,
            'POSC (Primary Oscillator)': 1
        }
    },

    // SETTING9: System PLL Multiplier
    9: {
        register: 'DEVCFG2',
        fieldName: 'FPLLMULT',
        bitStart: 8,
        bitWidth: 7,
        values: {
            'PLL Multiply by 1': 0,
            'PLL Multiply by 2': 1,
            'PLL Multiply by 3': 2,
            'PLL Multiply by 4': 3,
            'PLL Multiply by 5': 4,
            'PLL Multiply by 6': 5,
            'PLL Multiply by 7': 6,
            'PLL Multiply by 8': 7,
            'PLL Multiply by 9': 8,
            'PLL Multiply by 10': 9,
            'PLL Multiply by 11': 10,
            'PLL Multiply by 12': 11,
            'PLL Multiply by 13': 12,
            'PLL Multiply by 14': 13,
            'PLL Multiply by 15': 14,
            'PLL Multiply by 16': 15,
            'PLL Multiply by 17': 16,
            'PLL Multiply by 18': 17,
            'PLL Multiply by 19': 18,
            'PLL Multiply by 20': 19,
            'PLL Multiply by 21': 20,
            'PLL Multiply by 22': 21,
            'PLL Multiply by 23': 22,
            'PLL Multiply by 24': 23,
            'PLL Multiply by 25': 24,
            'PLL Multiply by 26': 25,
            'PLL Multiply by 27': 26,
            'PLL Multiply by 28': 27,
            'PLL Multiply by 29': 28,
            'PLL Multiply by 30': 29,
            'PLL Multiply by 31': 30,
            'PLL Multiply by 32': 31,
            'PLL Multiply by 33': 32,
            'PLL Multiply by 34': 33,
            'PLL Multiply by 35': 34,
            'PLL Multiply by 36': 35,
            'PLL Multiply by 37': 36,
            'PLL Multiply by 38': 37,
            'PLL Multiply by 39': 38,
            'PLL Multiply by 40': 39,
            'PLL Multiply by 41': 40,
            'PLL Multiply by 42': 41,
            'PLL Multiply by 43': 42,
            'PLL Multiply by 44': 43,
            'PLL Multiply by 45': 44,
            'PLL Multiply by 46': 45,
            'PLL Multiply by 47': 46,
            'PLL Multiply by 48': 47,
            'PLL Multiply by 49': 48,
            'PLL Multiply by 50': 49,
            'PLL Multiply by 51': 50,
            'PLL Multiply by 52': 51,
            'PLL Multiply by 53': 52,
            'PLL Multiply by 54': 53,
            'PLL Multiply by 55': 54,
            'PLL Multiply by 56': 55,
            'PLL Multiply by 57': 56,
            'PLL Multiply by 58': 57,
            'PLL Multiply by 59': 58,
            'PLL Multiply by 60': 59,
            'PLL Multiply by 61': 60,
            'PLL Multiply by 62': 61,
            'PLL Multiply by 63': 62,
            'PLL Multiply by 64': 63,
            'PLL Multiply by 65': 64,
            'PLL Multiply by 66': 65,
            'PLL Multiply by 67': 66,
            'PLL Multiply by 68': 67,
            'PLL Multiply by 69': 68,
            'PLL Multiply by 70': 69,
            'PLL Multiply by 71': 70,
            'PLL Multiply by 72': 71,
            'PLL Multiply by 73': 72,
            'PLL Multiply by 74': 73,
            'PLL Multiply by 75': 74,
            'PLL Multiply by 76': 75,
            'PLL Multiply by 77': 76,
            'PLL Multiply by 78': 77,
            'PLL Multiply by 79': 78,
            'PLL Multiply by 80': 79,
            'PLL Multiply by 81': 80,
            'PLL Multiply by 82': 81,
            'PLL Multiply by 83': 82,
            'PLL Multiply by 84': 83,
            'PLL Multiply by 85': 84,
            'PLL Multiply by 86': 85,
            'PLL Multiply by 87': 86,
            'PLL Multiply by 88': 87,
            'PLL Multiply by 89': 88,
            'PLL Multiply by 90': 89,
            'PLL Multiply by 91': 90,
            'PLL Multiply by 92': 91,
            'PLL Multiply by 93': 92,
            'PLL Multiply by 94': 93,
            'PLL Multiply by 95': 94,
            'PLL Multiply by 96': 95,
            'PLL Multiply by 97': 96,
            'PLL Multiply by 98': 97,
            'PLL Multiply by 99': 98,
            'PLL Multiply by 100': 99,
            'PLL Multiply by 101': 100,
            'PLL Multiply by 102': 101,
            'PLL Multiply by 103': 102,
            'PLL Multiply by 104': 103,
            'PLL Multiply by 105': 104,
            'PLL Multiply by 106': 105,
            'PLL Multiply by 107': 106,
            'PLL Multiply by 108': 107,
            'PLL Multiply by 109': 108,
            'PLL Multiply by 110': 109,
            'PLL Multiply by 111': 110,
            'PLL Multiply by 112': 111,
            'PLL Multiply by 113': 112,
            'PLL Multiply by 114': 113,
            'PLL Multiply by 115': 114,
            'PLL Multiply by 116': 115,
            'PLL Multiply by 117': 116,
            'PLL Multiply by 118': 117,
            'PLL Multiply by 119': 118,
            'PLL Multiply by 120': 119,
            'PLL Multiply by 121': 120,
            'PLL Multiply by 122': 121,
            'PLL Multiply by 123': 122,
            'PLL Multiply by 124': 123,
            'PLL Multiply by 125': 124,
            'PLL Multiply by 126': 125,
            'PLL Multiply by 127': 126,
            'PLL Multiply by 128': 127
        }
    },

    // SETTING10: System PLL Output Divider
    10: {
        register: 'DEVCFG2',
        fieldName: 'FPLLODIV',
        bitStart: 16,
        bitWidth: 3,
        values: {
            '2x Divider': 0,
            '4x Divider': 1,
            '8x Divider': 2,
            '16x Divider': 3,
            '32x Divider': 4
        }
    },

    // SETTING11: USB PLL Input Clock Select
    11: {
        register: 'DEVCFG2',
        fieldName: 'UPLLFSEL',
        bitStart: 30,
        bitWidth: 1,
        values: {
            'System PLL output is used for USB clock': 0,
            'USB PLL output is used for USB clock': 1
        }
    },

    // SETTING12: Oscillator Selection Bits
    12: {
        register: 'DEVCFG1',
        fieldName: 'FNOSC',
        bitStart: 0,
        bitWidth: 3,
        values: {
            'Fast RC Oscillator (FRC)': 0,
            'Fast RC Oscillator (FRC) with PLL': 1,
            'Primary Oscillator (XT, HS, EC)': 2,
            'Primary Oscillator (XT, HS, EC) with PLL': 3,
            'Secondary Oscillator (SOSC)': 4,
            'Low-Power RC Oscillator (LPRC)': 5,
            'Fast RC Oscillator (FRC) divided by 16': 6,
            'Fast RC Oscillator (FRC) divided by FRCDIV': 7
        }
    },

    // SETTING13: DMT Count Window Interval
    13: {
        register: 'DEVCFG1',
        fieldName: 'DMTINTV',
        bitStart: 3,
        bitWidth: 3,
        values: {
            'Window/Interval value is zero': 0,
            'Window/Interval value is 1/2 counter value': 1,
            'Window/Interval value is 3/4 counter value': 2,
            'Window/Interval value is 7/8 counter value': 3,
            'Window/Interval value is 15/16 counter value': 4,
            'Window/Interval value is 31/32 counter value': 5,
            'Window/Interval value is 63/64 counter value': 6,
            'Window/Interval value is 127/128 counter value': 7
        }
    },

    // SETTING14: Secondary Oscillator Enable
    14: {
        register: 'DEVCFG1',
        fieldName: 'FSOSCEN',
        bitStart: 6,
        bitWidth: 1,
        values: {
            'Disabled': 0,
            'Enabled': 1
        }
    },

    // SETTING15: Internal/External Clock Switchover
    15: {
        register: 'DEVCFG1',
        fieldName: 'IESO',
        bitStart: 7,
        bitWidth: 1,
        values: {
            'Disabled': 0,
            'Enabled': 1
        }
    },

    // SETTING16: Primary Oscillator Configuration
    16: {
        register: 'DEVCFG1',
        fieldName: 'POSCMOD',
        bitStart: 8,
        bitWidth: 2,
        values: {
            'External clock mode': 0,
            'XT mode (crystal, 4-10 MHz)': 1,
            'HS mode (crystal, 10-40 MHz)': 2,
            'Primary oscillator disabled': 3
        }
    },

    // SETTING17: CLKO Output Signal Active on REFCLKO Pin
    17: {
        register: 'DEVCFG1',
        fieldName: 'OSCIOFNC',
        bitStart: 10,
        bitWidth: 1,
        values: {
            'Disabled (REFCLKO I/O pin enabled)': 0,
            'Enabled (REFCLKO disabled)': 1
        }
    },

    // SETTING18: Clock Switching and Fail-Safe Clock Monitor
    18: {
        register: 'DEVCFG1',
        fieldName: 'FCKSM',
        bitStart: 14,
        bitWidth: 2,
        values: {
            'Clock switching and FSCM are enabled': 0,
            'Clock switching is enabled, FSCM is disabled': 1,
            'Clock switching and FSCM are disabled': 3
        }
    },

    // SETTING19: Watchdog Timer Postscaler
    19: {
        register: 'DEVCFG1',
        fieldName: 'WDTPS',
        bitStart: 16,
        bitWidth: 5,
        values: {
            '1:1': 0,
            '1:2': 1,
            '1:4': 2,
            '1:8': 3,
            '1:16': 4,
            '1:32': 5,
            '1:64': 6,
            '1:128': 7,
            '1:256': 8,
            '1:512': 9,
            '1:1024': 10,
            '1:2048': 11,
            '1:4096': 12,
            '1:8192': 13,
            '1:16384': 14,
            '1:32768': 15,
            '1:65536': 16,
            '1:131072': 17,
            '1:262144': 18,
            '1:524288': 19,
            '1:1048576': 20
        }
    },

    // SETTING20: Watchdog Timer Stop During Flash Programming
    20: {
        register: 'DEVCFG1',
        fieldName: 'WDTSPGM',
        bitStart: 21,
        bitWidth: 1,
        values: {
            'WDT stops during Flash programming': 0,
            'WDT runs during Flash programming': 1
        }
    },

    // SETTING21: Watchdog Timer Window Mode Enable
    21: {
        register: 'DEVCFG1',
        fieldName: 'WINDIS',
        bitStart: 22,
        bitWidth: 1,
        values: {
            'Window mode enabled': 0,
            'Window mode disabled (normal mode)': 1
        }
    },

    // SETTING22: Watchdog Timer Enable
    22: {
        register: 'DEVCFG1',
        fieldName: 'FWDTEN',
        bitStart: 23,
        bitWidth: 1,
        values: {
            'WDT Disabled': 0,
            'WDT Enabled': 1
        }
    },

    // SETTING23: Watchdog Timer Window Size
    23: {
        register: 'DEVCFG1',
        fieldName: 'FWDTWINSZ',
        bitStart: 24,
        bitWidth: 2,
        values: {
            'Window size is 75%': 0,
            'Window size is 50%': 1,
            'Window size is 37.5%': 2,
            'Window size is 25%': 3
        }
    },

    // SETTING24: Deadman Timer Count Select
    24: {
        register: 'DEVCFG1',
        fieldName: 'DMTCNT',
        bitStart: 26,
        bitWidth: 5,
        values: {
            '2^8 (256)': 0,
            '2^9 (512)': 1,
            '2^10 (1024)': 2,
            '2^11 (2048)': 3,
            '2^12 (4096)': 4,
            '2^13 (8192)': 5,
            '2^14 (16384)': 6,
            '2^15 (32768)': 7,
            '2^16 (65536)': 8,
            '2^17': 9,
            '2^18': 10,
            '2^19': 11,
            '2^20': 12,
            '2^21': 13,
            '2^22': 14,
            '2^23': 15,
            '2^24': 16,
            '2^25': 17,
            '2^26': 18,
            '2^27': 19,
            '2^28': 20,
            '2^29': 21,
            '2^30': 22,
            '2^31': 23
        }
    },

    // SETTING25: Deadman Timer Enable
    25: {
        register: 'DEVCFG1',
        fieldName: 'FDMTEN',
        bitStart: 31,
        bitWidth: 1,
        values: {
            'Deadman Timer is disabled': 0,
            'Deadman Timer is enabled': 1
        }
    },

    // SETTING26: Background Debugger Enable
    26: {
        register: 'DEVCFG0',
        fieldName: 'DEBUG',
        bitStart: 0,
        bitWidth: 2,
        values: {
            'Debugger is enabled': 3,
            'Debugger is disabled': 0
        }
    },

    // SETTING27: JTAG Enable
    27: {
        register: 'DEVCFG0',
        fieldName: 'JTAGEN',
        bitStart: 2,
        bitWidth: 1,
        values: {
            'JTAG Disabled': 0,
            'JTAG Port Enabled': 1
        }
    },

    // SETTING28: ICD Communication Channel Select
    28: {
        register: 'DEVCFG0',
        fieldName: 'ICESEL',
        bitStart: 3,
        bitWidth: 2,
        values: {
            'Communicate on PGEC1/PGED1': 3,
            'Communicate on PGEC2/PGED2': 2,
            'Communicate on PGEC3/PGED3': 1,
            'Communicate on PGEC4/PGED4': 0
        }
    },

    // SETTING29: Trace Enable
    29: {
        register: 'DEVCFG0',
        fieldName: 'TRCEN',
        bitStart: 5,
        bitWidth: 1,
        values: {
            'Trace features are disabled': 0,
            'Trace features are enabled': 1
        }
    },

    // SETTING30: Boot ISA Selection
    30: {
        register: 'DEVCFG0',
        fieldName: 'BOOTISA',
        bitStart: 6,
        bitWidth: 1,
        values: {
            'Boot code and Exception code is MIPS32': 0,
            'Boot code and Exception code is microMIPS': 1
        }
    },

    // SETTING31: Dynamic Flash ECC Configuration
    31: {
        register: 'DEVCFG0',
        fieldName: 'FECCCON',
        bitStart: 8,
        bitWidth: 2,
        values: {
            'ECC and Dynamic ECC are disabled': 3,
            'Dynamic ECC is disabled, ECC is enabled': 2,
            'Dynamic ECC and ECC are enabled': 0
        }
    },

    // SETTING32: Flash Sleep Mode
    32: {
        register: 'DEVCFG0',
        fieldName: 'FSLEEP',
        bitStart: 10,
        bitWidth: 1,
        values: {
            'Flash is powered down when device is in Sleep mode': 0,
            'Flash is not powered down when device is in Sleep mode': 1
        }
    },

    // SETTING33: Debug Mode CPU Access Permission
    33: {
        register: 'DEVCFG0',
        fieldName: 'DBGPER',
        bitStart: 12,
        bitWidth: 3,
        values: {
            'Allow CPU access to ALL permissions': 0,
            'Allow CPU access to Group 1 permission regions': 1,
            'Allow CPU access to Group 2 permission regions': 2,
            'Allow CPU access to Group 3 permission regions': 3,
            'Allow CPU access to Group 4 permission regions': 4,
            'Allow CPU access to Group 5 permission regions': 5,
            'Allow CPU access to Group 6 permission regions': 6,
            'Allow CPU access to Group 7 permission regions': 7
        }
    },

    // SETTING34: Soft Master Clear Enable
    34: {
        register: 'DEVCFG0',
        fieldName: 'SMCLR',
        bitStart: 15,
        bitWidth: 1,
        values: {
            'MCLR pin generates a normal system Reset': 0,
            'MCLR pin generates a Soft Master Clear only': 1
        }
    },

    // SETTING35: Secondary Oscillator Gain Control
    35: {
        register: 'DEVCFG0',
        fieldName: 'SOSCGAIN',
        bitStart: 16,
        bitWidth: 2,
        values: {
            'Gain is 1.5x': 0,
            'Gain is 3x': 1,
            'Gain is 6x': 2,
            'Gain is 12x': 3
        }
    },

    // SETTING36: Secondary Oscillator Boost Kick Start
    36: {
        register: 'DEVCFG0',
        fieldName: 'SOSCBOOST',
        bitStart: 18,
        bitWidth: 1,
        values: {
            'Normal start': 0,
            'Boost the kick start': 1
        }
    },

    // SETTING37: Primary Oscillator Gain Control
    37: {
        register: 'DEVCFG0',
        fieldName: 'POSCGAIN',
        bitStart: 19,
        bitWidth: 2,
        values: {
            'Gain is 1.5x': 0,
            'Gain is 3x': 1,
            'Gain is 6x': 2,
            'Gain is 12x': 3
        }
    },

    // SETTING38: Primary Oscillator Boost Kick Start
    38: {
        register: 'DEVCFG0',
        fieldName: 'POSCBOOST',
        bitStart: 21,
        bitWidth: 1,
        values: {
            'Normal start': 0,
            'Boost the kick start': 1
        }
    },

    // SETTING39: Enhanced JTAG Enable
    39: {
        register: 'DEVCFG0',
        fieldName: 'EJTAGBEN',
        bitStart: 30,
        bitWidth: 1,
        values: {
            'Normal JTAG functionality': 0,
            'Enhanced JTAG enabled': 1
        }
    }
};

/**
 * Calculate DEVCFG register values from current configuration
 */
export function calculateRegisters(currentConfig: Map<number, string>): {
    DEVCFG0: number;
    DEVCFG1: number;
    DEVCFG2: number;
    DEVCFG3: number;
} {
    // Start with all bits set (default to 1s, will be cleared as needed)
    let devcfg0 = 0xFFFFFFFF;
    let devcfg1 = 0xFFFFFFFF;
    let devcfg2 = 0xFFFFFFFF;
    let devcfg3 = 0xFFFFFFFF;

    // Process each setting
    currentConfig.forEach((value, settingIndex) => {
        const mapping = EFH_REGISTER_MAP[settingIndex];
        if (!mapping) return;

        const bitValue = mapping.values[value];
        if (bitValue === undefined) {
            console.warn(`Unknown value "${value}" for setting ${settingIndex}`);
            return;
        }

        // Create bit mask
        const mask = ((1 << mapping.bitWidth) - 1) << mapping.bitStart;
        const shiftedValue = bitValue << mapping.bitStart;

        // Clear bits and set new value
        switch (mapping.register) {
            case 'DEVCFG0':
                devcfg0 = (devcfg0 & ~mask) | shiftedValue;
                break;
            case 'DEVCFG1':
                devcfg1 = (devcfg1 & ~mask) | shiftedValue;
                break;
            case 'DEVCFG2':
                devcfg2 = (devcfg2 & ~mask) | shiftedValue;
                break;
            case 'DEVCFG3':
                devcfg3 = (devcfg3 & ~mask) | shiftedValue;
                break;
        }
    });

    // Ensure values are unsigned 32-bit
    return {
        DEVCFG0: devcfg0 >>> 0,
        DEVCFG1: devcfg1 >>> 0,
        DEVCFG2: devcfg2 >>> 0,
        DEVCFG3: devcfg3 >>> 0
    };
}

/**
 * Format register value as hex string for display
 */
export function formatRegisterValue(value: number): string {
    return '0x' + value.toString(16).toUpperCase().padStart(8, '0');
}
