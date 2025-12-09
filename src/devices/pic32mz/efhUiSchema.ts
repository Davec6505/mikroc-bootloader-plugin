/**
 * PIC32MZ EFH UI Schema
 * 
 * Defines the configuration settings UI based on MikroC's Edit Project dialog
 * Extracted from P32MZ2048EFH_PLL_24_to_200MHz.cfgsch reference file
 */

export interface ConfigSetting {
    index: number;              // SETTING0-39 index
    name: string;               // Human-readable setting name
    category: string;           // Grouping category
    options: string[];          // Available option values
    defaultValue: string;       // Default selection
    description?: string;       // Additional help text
}

/**
 * EFH UI Schema - 40 Configuration Settings
 * 
 * Note: This schema is shared across ALL EFH devices (064/100/124/144, 1024/2048)
 * Pin count and flash size do not affect config register structure
 */
export const EFH_UI_SCHEMA: ConfigSetting[] = [
    // Ethernet Configuration
    {
        index: 0,
        name: "Ethernet RMII/MII Enable",
        category: "Ethernet",
        options: [
            "MII Enabled",
            "RMII Enabled",
            "OFF"
        ],
        defaultValue: "MII Enabled"
    },
    {
        index: 1,
        name: "Ethernet I/O Pin Select",
        category: "Ethernet",
        options: [
            "Default Ethernet I/O",
            "Alternate Ethernet I/O"
        ],
        defaultValue: "Default Ethernet I/O"
    },
    
    // Permission/Lock Configuration
    {
        index: 2,
        name: "Permission Group Lock One Way Configuration",
        category: "Security",
        options: [
            "Allow multiple reconfigurations",
            "Allow only one reconfiguration"
        ],
        defaultValue: "Allow multiple reconfigurations"
    },
    {
        index: 3,
        name: "Peripheral Module Disable Configuration",
        category: "Security",
        options: [
            "Allow multiple reconfigurations",
            "Allow only one reconfiguration"
        ],
        defaultValue: "Allow multiple reconfigurations"
    },
    {
        index: 4,
        name: "Peripheral Pin Select Configuration",
        category: "Security",
        options: [
            "Allow multiple reconfigurations",
            "Allow only one reconfiguration"
        ],
        defaultValue: "Allow multiple reconfigurations"
    },
    
    // USB Configuration
    {
        index: 5,
        name: "USB USBID Selection",
        category: "USB",
        options: [
            "Controlled by the USB Module",
            "Controlled by Port Function"
        ],
        defaultValue: "Controlled by the USB Module"
    },
    
    // PLL Configuration
    {
        index: 6,
        name: "System PLL Input Divider",
        category: "PLL",
        options: [
            "1x Divider",
            "2x Divider",
            "3x Divider",
            "4x Divider",
            "5x Divider",
            "6x Divider",
            "7x Divider",
            "8x Divider"
        ],
        defaultValue: "3x Divider",
        description: "SPLL input divider (FPLLIDIV)"
    },
    {
        index: 7,
        name: "System PLL Input Range",
        category: "PLL",
        options: [
            "5-10 MHz Input",
            "8-16 MHz Input",
            "13-26 MHz Input",
            "21-42 MHz Input",
            "34-64 MHz Input"
        ],
        defaultValue: "5-10 MHz Input",
        description: "SPLL input frequency range (FPLLRNG)"
    },
    {
        index: 8,
        name: "System PLL Input Clock Selection",
        category: "PLL",
        options: [
            "FRC is input to the System PLL",
            "POSC is input to the System PLL"
        ],
        defaultValue: "POSC is input to the System PLL",
        description: "SPLL input clock source (FPLLICLK)"
    },
    {
        index: 9,
        name: "System PLL Multiplier",
        category: "PLL",
        options: Array.from({ length: 113 }, (_, i) => `PLL Multiply by ${i + 1}`),
        defaultValue: "PLL Multiply by 50",
        description: "SPLL multiplier value (FPLLMULT): 1-128"
    },
    {
        index: 10,
        name: "System PLL Output Clock Divider",
        category: "PLL",
        options: [
            "2x Divider",
            "4x Divider",
            "8x Divider",
            "16x Divider",
            "32x Divider"
        ],
        defaultValue: "2x Divider",
        description: "SPLL output divider (FPLLODIV)"
    },
    {
        index: 11,
        name: "USB PLL Input Frequency Selection",
        category: "PLL",
        options: [
            "USB PLL input is 8 MHz",
            "USB PLL input is 12 MHz",
            "USB PLL input is 16 MHz",
            "USB PLL input is 24 MHz"
        ],
        defaultValue: "USB PLL input is 24 MHz"
    },
    
    // Oscillator Configuration
    {
        index: 12,
        name: "Oscillator Selection Bits",
        category: "Oscillator",
        options: [
            "Fast RC Osc (FRC)",
            "Fast RC Osc w/Div-by-N (FRCDIV)",
            "Primary Osc (XT, HS, EC)",
            "Primary Osc w/PLL (XT+PLL, HS+PLL)",
            "Secondary Osc (SOSC)",
            "Low-Power RC Osc (LPRC)",
            "Fast RC Osc w/Div-by-16 (FRCDIV16)",
            "System PLL Output"
        ],
        defaultValue: "Fast RC Osc w/Div-by-N (FRCDIV)"
    },
    {
        index: 13,
        name: "DMT Count Window Interval",
        category: "Deadman Timer",
        options: [
            "Window/Interval value is zero",
            "Window/Interval value is 1/1",
            "Window/Interval value is 1/2",
            "Window/Interval value is 1/4",
            "Window/Interval value is 1/8",
            "Window/Interval value is 1/16",
            "Window/Interval value is 1/32",
            "Window/Interval value is 1/64"
        ],
        defaultValue: "Window/Interval value is 1/2"
    },
    {
        index: 14,
        name: "Secondary Oscillator Enable",
        category: "Oscillator",
        options: [
            "Disable SOSC",
            "Enable SOSC"
        ],
        defaultValue: "Disable SOSC"
    },
    {
        index: 15,
        name: "Internal/External Switch Over",
        category: "Oscillator",
        options: [
            "Disabled",
            "Enabled"
        ],
        defaultValue: "Disabled"
    },
    {
        index: 16,
        name: "Primary Oscillator Configuration",
        category: "Oscillator",
        options: [
            "External clock mode",
            "XT osc mode",
            "HS osc mode",
            "Disabled"
        ],
        defaultValue: "External clock mode"
    },
    {
        index: 17,
        name: "CLKO Output Signal",
        category: "Oscillator",
        options: [
            "CLKO output disabled",
            "CLKO output active"
        ],
        defaultValue: "CLKO output disabled"
    },
    {
        index: 18,
        name: "Clock Switching and Monitor Selection",
        category: "Oscillator",
        options: [
            "Clock Switch Enable, FSCM Disabled",
            "Clock Switch Disable, FSCM Disabled",
            "Clock Switch Enable, FSCM Enabled",
            "Clock Switch Disable, FSCM Enabled"
        ],
        defaultValue: "Clock Switch Disable, FSCM Disabled"
    },
    
    // Watchdog Timer
    {
        index: 19,
        name: "Watchdog Timer Postscaler",
        category: "Watchdog",
        options: Array.from({ length: 32 }, (_, i) => `1:${Math.pow(2, i)}`),
        defaultValue: "1:1048576"
    },
    {
        index: 20,
        name: "WDT Stop During Flash Programming",
        category: "Watchdog",
        options: [
            "WDT stops during Flash programming",
            "WDT runs during Flash programming"
        ],
        defaultValue: "WDT stops during Flash programming"
    },
    {
        index: 21,
        name: "WDT Window Mode",
        category: "Watchdog",
        options: [
            "Watchdog Timer is in non-Window mode",
            "Watchdog Timer is in Window mode"
        ],
        defaultValue: "Watchdog Timer is in non-Window mode"
    },
    {
        index: 22,
        name: "WDT Enable",
        category: "Watchdog",
        options: [
            "WDT Disabled",
            "WDT Enabled"
        ],
        defaultValue: "WDT Disabled"
    },
    {
        index: 23,
        name: "WDT Window Size",
        category: "Watchdog",
        options: [
            "75%",
            "50%",
            "37.5%",
            "25%"
        ],
        defaultValue: "25%"
    },
    
    // Deadman Timer
    {
        index: 24,
        name: "DMT Count Selection",
        category: "Deadman Timer",
        options: Array.from({ length: 32 }, (_, i) => `2^${i + 8} (${Math.pow(2, i + 8)})`),
        defaultValue: "2^8 (256)"
    },
    {
        index: 25,
        name: "DMT Enable",
        category: "Deadman Timer",
        options: [
            "Dead Man Timer is Disabled",
            "Dead Man Timer is Enabled"
        ],
        defaultValue: "Dead Man Timer is Disabled"
    },
    
    // Debug/Programming
    {
        index: 26,
        name: "Background Debugger Enable",
        category: "Debug",
        options: [
            "BDM Disabled",
            "BDM Enabled"
        ],
        defaultValue: "BDM Enabled"
    },
    {
        index: 27,
        name: "JTAG Enable",
        category: "Debug",
        options: [
            "JTAG Disabled",
            "JTAG Port Enabled"
        ],
        defaultValue: "JTAG Port Enabled"
    },
    {
        index: 28,
        name: "ICE/ICD Comm Channel",
        category: "Debug",
        options: [
            "Communicate on PGEC1/PGED1",
            "Communicate on PGEC2/PGED2",
            "Communicate on PGEC3/PGED3",
            "Communicate on PGEC4/PGED4"
        ],
        defaultValue: "Communicate on PGEC1/PGED1"
    },
    {
        index: 29,
        name: "Trace Enable",
        category: "Debug",
        options: [
            "Trace features in the CPU are disabled",
            "Trace features in the CPU are enabled"
        ],
        defaultValue: "Trace features in the CPU are disabled"
    },
    
    // Boot/System Configuration
    {
        index: 30,
        name: "Boot ISA Selection",
        category: "Boot",
        options: [
            "Boot code and Exception code is MIPS32",
            "Boot code and Exception code is microMIPS"
        ],
        defaultValue: "Boot code and Exception code is MIPS32"
    },
    {
        index: 31,
        name: "Dynamic Flash ECC",
        category: "Flash",
        options: [
            "Disabled",
            "Enabled"
        ],
        defaultValue: "Disabled"
    },
    {
        index: 32,
        name: "Flash Sleep Mode",
        category: "Flash",
        options: [
            "Flash is in Sleep Mode",
            "Flash is powered down"
        ],
        defaultValue: "Flash is powered down"
    },
    {
        index: 33,
        name: "Debug Mode CPU Access",
        category: "Debug",
        options: [
            "CPU has access during Debug mode",
            "CPU access during Debug mode is blocked"
        ],
        defaultValue: "CPU has access during Debug mode"
    },
    {
        index: 34,
        name: "Soft Master Clear Enable",
        category: "Boot",
        options: [
            "MCLR pin generates a normal system Reset",
            "MCLR generates a Soft Master Clear"
        ],
        defaultValue: "MCLR pin generates a normal system Reset"
    },
    
    // Oscillator Tuning
    {
        index: 35,
        name: "Secondary Oscillator Gain Control",
        category: "Oscillator Tuning",
        options: [
            "2x gain setting",
            "1.5x gain setting",
            "1x gain setting",
            "0.5x gain setting"
        ],
        defaultValue: "2x gain setting"
    },
    {
        index: 36,
        name: "Secondary Oscillator Boost",
        category: "Oscillator Tuning",
        options: [
            "Normal power",
            "Boost power"
        ],
        defaultValue: "Normal power"
    },
    {
        index: 37,
        name: "Primary Oscillator Gain Control",
        category: "Oscillator Tuning",
        options: [
            "2x gain setting",
            "1.5x gain setting",
            "1x gain setting",
            "0.5x gain setting"
        ],
        defaultValue: "2x gain setting"
    },
    {
        index: 38,
        name: "Primary Oscillator Boost",
        category: "Oscillator Tuning",
        options: [
            "Normal power",
            "Boost power"
        ],
        defaultValue: "Normal power"
    },
    
    // EJTAG
    {
        index: 39,
        name: "EJTAG Boot",
        category: "Debug",
        options: [
            "Normal EJTAG functionality",
            "Reduced EJTAG functionality"
        ],
        defaultValue: "Normal EJTAG functionality"
    },
    
    // Peripheral Clock Configuration (Runtime - not config bits)
    {
        index: 40,
        name: "Peripheral Bus 2 Clock Divisor",
        category: "Peripheral Clocks",
        options: [
            "PBCLK2 is SYSCLK/1",
            "PBCLK2 is SYSCLK/2",
            "PBCLK2 is SYSCLK/3",
            "PBCLK2 is SYSCLK/4",
            "PBCLK2 is SYSCLK/5",
            "PBCLK2 is SYSCLK/6",
            "PBCLK2 is SYSCLK/7",
            "PBCLK2 is SYSCLK/8"
        ],
        defaultValue: "PBCLK2 is SYSCLK/4",
        description: "Peripheral Bus 2 services UART, SPI, I2C peripherals"
    },
    {
        index: 41,
        name: "Peripheral Bus 3 Clock Divisor",
        category: "Peripheral Clocks",
        options: [
            "PBCLK3 is SYSCLK/1",
            "PBCLK3 is SYSCLK/2",
            "PBCLK3 is SYSCLK/3",
            "PBCLK3 is SYSCLK/4",
            "PBCLK3 is SYSCLK/5",
            "PBCLK3 is SYSCLK/6",
            "PBCLK3 is SYSCLK/7",
            "PBCLK3 is SYSCLK/8"
        ],
        defaultValue: "PBCLK3 is SYSCLK/4",
        description: "Peripheral Bus 3 services Timer, ADC, Comparator peripherals"
    },
    
    // Peripheral Module Disable (PMD) Configuration
    {
        index: 42,
        name: "PMD1 - ADC, CVR, CMP Disable",
        category: "Power Management",
        options: [
            "All enabled",
            "Custom"
        ],
        defaultValue: "All enabled",
        description: "Peripheral Module Disable register 1 (ADC, Comparators, CVref)"
    },
    {
        index: 43,
        name: "PMD2 - CMP, DAC Disable",
        category: "Power Management",
        options: [
            "All enabled",
            "Custom"
        ],
        defaultValue: "All enabled",
        description: "Peripheral Module Disable register 2 (Comparators, DAC)"
    },
    {
        index: 44,
        name: "PMD3 - IC, OC, Timer Disable",
        category: "Power Management",
        options: [
            "All enabled",
            "Custom"
        ],
        defaultValue: "All enabled",
        description: "Peripheral Module Disable register 3 (Input Capture, Output Compare, Timers)"
    },
    {
        index: 45,
        name: "PMD4 - USB Disable",
        category: "Power Management",
        options: [
            "All enabled",
            "Custom"
        ],
        defaultValue: "All enabled",
        description: "Peripheral Module Disable register 4 (USB)"
    },
    {
        index: 46,
        name: "PMD5 - UART, SPI, I2C Disable",
        category: "Power Management",
        options: [
            "All enabled",
            "Custom"
        ],
        defaultValue: "All enabled",
        description: "Peripheral Module Disable register 5 (UART, SPI, I2C)"
    },
    {
        index: 47,
        name: "PMD6 - REFO, PMP, SQI, ETH, CAN Disable",
        category: "Power Management",
        options: [
            "All enabled",
            "Custom"
        ],
        defaultValue: "All enabled",
        description: "Peripheral Module Disable register 6 (REFO, PMP, SQI, Ethernet, CAN)"
    },
    {
        index: 48,
        name: "PMD7 - DMA Disable",
        category: "Power Management",
        options: [
            "All enabled",
            "Custom"
        ],
        defaultValue: "All enabled",
        description: "Peripheral Module Disable register 7 (DMA)"
    }
];

/**
 * Get settings by category
 */
export function getSettingsByCategory(category: string): ConfigSetting[] {
    return EFH_UI_SCHEMA.filter(setting => setting.category === category);
}

/**
 * Get all categories
 */
export function getCategories(): string[] {
    const categories = new Set(EFH_UI_SCHEMA.map(s => s.category));
    return Array.from(categories);
}

/**
 * Get setting by index
 */
export function getSettingByIndex(index: number): ConfigSetting | undefined {
    return EFH_UI_SCHEMA.find(s => s.index === index);
}
