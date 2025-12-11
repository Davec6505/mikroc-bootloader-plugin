/**
 * Peripheral Pin Select (PPS) Mapping Tables for PIC32MZ EC/EF Family
 * 
 * Data extracted from PIC32MZ2048ECH064/100/124/144 datasheet
 * TABLE 12-1: INPUT PIN SELECTION
 * TABLE 12-2: OUTPUT PIN SELECTION
 */

import { PPSInputSignal, PPSOutputPin, PPSOutputValue } from './types';

/**
 * PPS Input Mapping Group 0 (RPD2, RPG8, RPF4, etc.)
 * Used by peripherals in the first group
 */
export const PPS_INPUT_GROUP_0_PINS = [
    { value: 0x0, pin: 'RPD2' },
    { value: 0x1, pin: 'RPG8' },
    { value: 0x2, pin: 'RPF4' },
    { value: 0x3, pin: 'RPD10' },
    { value: 0x4, pin: 'RPF1' },
    { value: 0x5, pin: 'RPB9' },
    { value: 0x6, pin: 'RPB10' },
    { value: 0x7, pin: 'RPC14' },
    { value: 0x8, pin: 'RPB5' },
    { value: 0xA, pin: 'RPC1', availability: '100+' },  // Not on 64-pin
    { value: 0xB, pin: 'RPD14', availability: '100+' },
    { value: 0xC, pin: 'RPG1', availability: '100+' },
    { value: 0xD, pin: 'RPA14', availability: '100+' },
    { value: 0xE, pin: 'RPD6', availability: '124+' },  // Not on 64/100-pin
];

/**
 * PPS Input Mapping Group 1 (RPD3, RPG7, RPF5, etc.)
 */
export const PPS_INPUT_GROUP_1_PINS = [
    { value: 0x0, pin: 'RPD3' },
    { value: 0x1, pin: 'RPG7' },
    { value: 0x2, pin: 'RPF5' },
    { value: 0x3, pin: 'RPD11' },
    { value: 0x4, pin: 'RPF0' },
    { value: 0x5, pin: 'RPB1' },
    { value: 0x6, pin: 'RPE5' },
    { value: 0x7, pin: 'RPC13' },
    { value: 0x8, pin: 'RPB3' },
    { value: 0xA, pin: 'RPC4', availability: '100+' },
    { value: 0xB, pin: 'RPD15', availability: '100+' },
    { value: 0xC, pin: 'RPG0', availability: '100+' },
    { value: 0xD, pin: 'RPA15', availability: '100+' },
    { value: 0xE, pin: 'RPD7', availability: '124+' },
];

/**
 * PPS Input Mapping Group 2 (RPD9, RPG6, RPB8, etc.)
 */
export const PPS_INPUT_GROUP_2_PINS = [
    { value: 0x0, pin: 'RPD9' },
    { value: 0x1, pin: 'RPG6' },
    { value: 0x2, pin: 'RPB8' },
    { value: 0x3, pin: 'RPB15' },
    { value: 0x4, pin: 'RPD4' },
    { value: 0x5, pin: 'RPB0' },
    { value: 0x6, pin: 'RPE3' },
    { value: 0x7, pin: 'RPB7' },
    { value: 0x9, pin: 'RPF12', availability: '100+' },
    { value: 0xA, pin: 'RPD12', availability: '100+' },
    { value: 0xB, pin: 'RPF8', availability: '100+' },
    { value: 0xC, pin: 'RPC3', availability: '100+' },
    { value: 0xD, pin: 'RPE9', availability: '100+' },
];

/**
 * PPS Input Mapping Group 3 (RPD1, RPG9, RPB14, etc.)
 */
export const PPS_INPUT_GROUP_3_PINS = [
    { value: 0x0, pin: 'RPD1' },
    { value: 0x1, pin: 'RPG9' },
    { value: 0x2, pin: 'RPB14' },
    { value: 0x3, pin: 'RPD0' },
    { value: 0x5, pin: 'RPB6' },
    { value: 0x6, pin: 'RPD5' },
    { value: 0x7, pin: 'RPB2' },
    { value: 0x8, pin: 'RPF3' },
    { value: 0x9, pin: 'RPF13', availability: '100+' },
    { value: 0xA, pin: 'No Connect' },
    { value: 0xB, pin: 'RPF2', availability: '100+' },
    { value: 0xC, pin: 'RPC2', availability: '100+' },
    { value: 0xD, pin: 'RPE8', availability: '100+' },
];

/**
 * PPS Input Signal Definitions
 * Each peripheral input can be mapped to one of the RP pin groups above
 */
export const PPS_INPUT_SIGNALS: PPSInputSignal[] = [
    // Group 0 peripherals
    { signalName: 'INT3', registerName: 'INT3R', description: 'External Interrupt 3', category: 'Interrupt', validRPValues: [0,1,2,3,4,5,6,7,8,10,11,12,13,14] },
    { signalName: 'T2CK', registerName: 'T2CKR', description: 'Timer2 External Clock', category: 'Timer', validRPValues: [0,1,2,3,4,5,6,7,8,10,11,12,13,14] },
    { signalName: 'T6CK', registerName: 'T6CKR', description: 'Timer6 External Clock', category: 'Timer', validRPValues: [0,1,2,3,4,5,6,7,8,10,11,12,13,14] },
    { signalName: 'IC3', registerName: 'IC3R', description: 'Input Capture 3', category: 'IC', validRPValues: [0,1,2,3,4,5,6,7,8,10,11,12,13,14] },
    { signalName: 'IC7', registerName: 'IC7R', description: 'Input Capture 7', category: 'IC', validRPValues: [0,1,2,3,4,5,6,7,8,10,11,12,13,14] },
    { signalName: 'U1RX', registerName: 'U1RXR', description: 'UART1 Receive', category: 'UART', validRPValues: [0,1,2,3,4,5,6,7,8,10,11,12,13,14] },
    { signalName: 'U2CTS', registerName: 'U2CTSR', description: 'UART2 Clear to Send', category: 'UART', validRPValues: [0,1,2,3,4,5,6,7,8,10,11,12,13,14] },
    { signalName: 'U5RX', registerName: 'U5RXR', description: 'UART5 Receive', category: 'UART', validRPValues: [0,1,2,3,4,5,6,7,8,10,11,12,13,14] },
    { signalName: 'U6CTS', registerName: 'U6CTSR', description: 'UART6 Clear to Send', category: 'UART', validRPValues: [0,1,2,3,4,5,6,7,8,10,11,12,13,14] },
    { signalName: 'SDI1', registerName: 'SDI1R', description: 'SPI1 Data Input', category: 'SPI', validRPValues: [0,1,2,3,4,5,6,7,8,10,11,12,13,14] },
    { signalName: 'SDI3', registerName: 'SDI3R', description: 'SPI3 Data Input', category: 'SPI', validRPValues: [0,1,2,3,4,5,6,7,8,10,11,12,13,14] },
    { signalName: 'SDI5', registerName: 'SDI5R', description: 'SPI5 Data Input', category: 'SPI', validRPValues: [0,1,2,3,4,5,6,7,8,10,11,12,13,14] },
    { signalName: 'SS6', registerName: 'SS6R', description: 'SPI6 Slave Select', category: 'SPI', validRPValues: [0,1,2,3,4,5,6,7,8,10,11,12,13,14] },
    { signalName: 'REFCLKI1', registerName: 'REFCLKI1R', description: 'Reference Clock Input 1', category: 'Other', validRPValues: [0,1,2,3,4,5,6,7,8,10,11,12,13,14] },
    
    // Group 1 peripherals
    { signalName: 'INT4', registerName: 'INT4R', description: 'External Interrupt 4', category: 'Interrupt', validRPValues: [0,1,2,3,4,5,6,7,8,10,11,12,13,14] },
    { signalName: 'T5CK', registerName: 'T5CKR', description: 'Timer5 External Clock', category: 'Timer', validRPValues: [0,1,2,3,4,5,6,7,8,10,11,12,13,14] },
    { signalName: 'T7CK', registerName: 'T7CKR', description: 'Timer7 External Clock', category: 'Timer', validRPValues: [0,1,2,3,4,5,6,7,8,10,11,12,13,14] },
    { signalName: 'IC4', registerName: 'IC4R', description: 'Input Capture 4', category: 'IC', validRPValues: [0,1,2,3,4,5,6,7,8,10,11,12,13,14] },
    { signalName: 'IC8', registerName: 'IC8R', description: 'Input Capture 8', category: 'IC', validRPValues: [0,1,2,3,4,5,6,7,8,10,11,12,13,14] },
    { signalName: 'U3RX', registerName: 'U3RXR', description: 'UART3 Receive', category: 'UART', validRPValues: [0,1,2,3,4,5,6,7,8,10,11,12,13,14] },
    { signalName: 'U4CTS', registerName: 'U4CTSR', description: 'UART4 Clear to Send', category: 'UART', validRPValues: [0,1,2,3,4,5,6,7,8,10,11,12,13,14] },
    { signalName: 'SDI2', registerName: 'SDI2R', description: 'SPI2 Data Input', category: 'SPI', validRPValues: [0,1,2,3,4,5,6,7,8,10,11,12,13,14] },
    { signalName: 'SDI4', registerName: 'SDI4R', description: 'SPI4 Data Input', category: 'SPI', validRPValues: [0,1,2,3,4,5,6,7,8,10,11,12,13,14] },
    { signalName: 'REFCLKI4', registerName: 'REFCLKI4R', description: 'Reference Clock Input 4', category: 'Other', validRPValues: [0,1,2,3,4,5,6,7,8,10,11,12,13,14] },
    
    // Group 2 peripherals
    { signalName: 'INT2', registerName: 'INT2R', description: 'External Interrupt 2', category: 'Interrupt', validRPValues: [0,1,2,3,4,5,6,7,9,10,11,12,13] },
    { signalName: 'T3CK', registerName: 'T3CKR', description: 'Timer3 External Clock', category: 'Timer', validRPValues: [0,1,2,3,4,5,6,7,9,10,11,12,13] },
    { signalName: 'T8CK', registerName: 'T8CKR', description: 'Timer8 External Clock', category: 'Timer', validRPValues: [0,1,2,3,4,5,6,7,9,10,11,12,13] },
    { signalName: 'IC2', registerName: 'IC2R', description: 'Input Capture 2', category: 'IC', validRPValues: [0,1,2,3,4,5,6,7,9,10,11,12,13] },
    { signalName: 'IC5', registerName: 'IC5R', description: 'Input Capture 5', category: 'IC', validRPValues: [0,1,2,3,4,5,6,7,9,10,11,12,13] },
    { signalName: 'IC9', registerName: 'IC9R', description: 'Input Capture 9', category: 'IC', validRPValues: [0,1,2,3,4,5,6,7,9,10,11,12,13] },
    { signalName: 'U1CTS', registerName: 'U1CTSR', description: 'UART1 Clear to Send', category: 'UART', validRPValues: [0,1,2,3,4,5,6,7,9,10,11,12,13] },
    { signalName: 'U2RX', registerName: 'U2RXR', description: 'UART2 Receive', category: 'UART', validRPValues: [0,1,2,3,4,5,6,7,9,10,11,12,13] },
    { signalName: 'U5CTS', registerName: 'U5CTSR', description: 'UART5 Clear to Send', category: 'UART', validRPValues: [0,1,2,3,4,5,6,7,9,10,11,12,13] },
    { signalName: 'SS1', registerName: 'SS1R', description: 'SPI1 Slave Select', category: 'SPI', validRPValues: [0,1,2,3,4,5,6,7,9,10,11,12,13] },
    { signalName: 'SS3', registerName: 'SS3R', description: 'SPI3 Slave Select', category: 'SPI', validRPValues: [0,1,2,3,4,5,6,7,9,10,11,12,13] },
    { signalName: 'SS4', registerName: 'SS4R', description: 'SPI4 Slave Select', category: 'SPI', validRPValues: [0,1,2,3,4,5,6,7,9,10,11,12,13] },
    { signalName: 'SS5', registerName: 'SS5R', description: 'SPI5 Slave Select', category: 'SPI', validRPValues: [0,1,2,3,4,5,6,7,9,10,11,12,13] },
    
    // Group 3 peripherals
    { signalName: 'INT1', registerName: 'INT1R', description: 'External Interrupt 1', category: 'Interrupt', validRPValues: [0,1,2,3,5,6,7,8,9,10,11,12,13] },
    { signalName: 'T4CK', registerName: 'T4CKR', description: 'Timer4 External Clock', category: 'Timer', validRPValues: [0,1,2,3,5,6,7,8,9,10,11,12,13] },
    { signalName: 'T9CK', registerName: 'T9CKR', description: 'Timer9 External Clock', category: 'Timer', validRPValues: [0,1,2,3,5,6,7,8,9,10,11,12,13] },
    { signalName: 'IC1', registerName: 'IC1R', description: 'Input Capture 1', category: 'IC', validRPValues: [0,1,2,3,5,6,7,8,9,10,11,12,13] },
    { signalName: 'IC6', registerName: 'IC6R', description: 'Input Capture 6', category: 'IC', validRPValues: [0,1,2,3,5,6,7,8,9,10,11,12,13] },
    { signalName: 'U3CTS', registerName: 'U3CTSR', description: 'UART3 Clear to Send', category: 'UART', validRPValues: [0,1,2,3,5,6,7,8,9,10,11,12,13] },
    { signalName: 'U4RX', registerName: 'U4RXR', description: 'UART4 Receive', category: 'UART', validRPValues: [0,1,2,3,5,6,7,8,9,10,11,12,13] },
    { signalName: 'U6RX', registerName: 'U6RXR', description: 'UART6 Receive', category: 'UART', validRPValues: [0,1,2,3,5,6,7,8,9,10,11,12,13] },
    { signalName: 'SS2', registerName: 'SS2R', description: 'SPI2 Slave Select', category: 'SPI', validRPValues: [0,1,2,3,5,6,7,8,9,10,11,12,13] },
    { signalName: 'SDI6', registerName: 'SDI6R', description: 'SPI6 Data Input', category: 'SPI', validRPValues: [0,1,2,3,5,6,7,8,9,10,11,12,13] },
    { signalName: 'OCFA', registerName: 'OCFAR', description: 'Output Compare Fault A', category: 'Other', validRPValues: [0,1,2,3,5,6,7,8,9,10,11,12,13] },
    { signalName: 'REFCLKI3', registerName: 'REFCLKI3R', description: 'Reference Clock Input 3', category: 'Other', validRPValues: [0,1,2,3,5,6,7,8,9,10,11,12,13] },
];

/**
 * PPS Output Pin Definitions with available peripheral outputs
 * Group 0: Output group with U3TX, SDO1, SDO2, etc.
 */
const OUTPUT_GROUP_0: PPSOutputValue[] = [
    { value: 0x0, signalName: 'No Connect', description: 'Not connected', category: 'Other' },
    { value: 0x1, signalName: 'U3TX', description: 'UART3 Transmit', category: 'UART' },
    { value: 0x2, signalName: 'U4RTS', description: 'UART4 Request to Send', category: 'UART' },
    { value: 0x5, signalName: 'SDO1', description: 'SPI1 Data Output', category: 'SPI' },
    { value: 0x6, signalName: 'SDO2', description: 'SPI2 Data Output', category: 'SPI' },
    { value: 0x7, signalName: 'SDO3', description: 'SPI3 Data Output', category: 'SPI' },
    { value: 0x9, signalName: 'SDO5', description: 'SPI5 Data Output', category: 'SPI' },
    { value: 0xA, signalName: 'SS6', description: 'SPI6 Slave Select', category: 'SPI' },
    { value: 0xB, signalName: 'OC3', description: 'Output Compare 3', category: 'OC' },
    { value: 0xC, signalName: 'OC6', description: 'Output Compare 6', category: 'OC' },
    { value: 0xD, signalName: 'REFCLKO4', description: 'Reference Clock Output 4', category: 'RefClk' },
    { value: 0xE, signalName: 'C2OUT', description: 'Comparator 2 Output', category: 'Other' },
];

/**
 * Group 1: Output group with U1TX, OC4, OC7, REFCLKO1, etc.
 */
const OUTPUT_GROUP_1: PPSOutputValue[] = [
    { value: 0x0, signalName: 'No Connect', description: 'Not connected', category: 'Other' },
    { value: 0x1, signalName: 'U1TX', description: 'UART1 Transmit', category: 'UART' },
    { value: 0x2, signalName: 'U2RTS', description: 'UART2 Request to Send', category: 'UART' },
    { value: 0x3, signalName: 'U5TX', description: 'UART5 Transmit', category: 'UART' },
    { value: 0x4, signalName: 'U6RTS', description: 'UART6 Request to Send', category: 'UART' },
    { value: 0x5, signalName: 'SDO1', description: 'SPI1 Data Output', category: 'SPI' },
    { value: 0x6, signalName: 'SDO2', description: 'SPI2 Data Output', category: 'SPI' },
    { value: 0x7, signalName: 'SDO3', description: 'SPI3 Data Output', category: 'SPI' },
    { value: 0x8, signalName: 'SDO4', description: 'SPI4 Data Output', category: 'SPI' },
    { value: 0x9, signalName: 'SDO5', description: 'SPI5 Data Output', category: 'SPI' },
    { value: 0xB, signalName: 'OC4', description: 'Output Compare 4', category: 'OC' },
    { value: 0xC, signalName: 'OC7', description: 'Output Compare 7', category: 'OC' },
    { value: 0xF, signalName: 'REFCLKO1', description: 'Reference Clock Output 1', category: 'RefClk' },
];

/**
 * Group 2: Output group with U3RTS, U4TX, U6TX, OC5, OC8, REFCLKO3, etc.
 */
const OUTPUT_GROUP_2: PPSOutputValue[] = [
    { value: 0x0, signalName: 'No Connect', description: 'Not connected', category: 'Other' },
    { value: 0x1, signalName: 'U3RTS', description: 'UART3 Request to Send', category: 'UART' },
    { value: 0x2, signalName: 'U4TX', description: 'UART4 Transmit', category: 'UART' },
    { value: 0x4, signalName: 'U6TX', description: 'UART6 Transmit', category: 'UART' },
    { value: 0x5, signalName: 'SS1', description: 'SPI1 Slave Select', category: 'SPI' },
    { value: 0x7, signalName: 'SS3', description: 'SPI3 Slave Select', category: 'SPI' },
    { value: 0x8, signalName: 'SS4', description: 'SPI4 Slave Select', category: 'SPI' },
    { value: 0x9, signalName: 'SS5', description: 'SPI5 Slave Select', category: 'SPI' },
    { value: 0xA, signalName: 'SDO6', description: 'SPI6 Data Output', category: 'SPI' },
    { value: 0xB, signalName: 'OC5', description: 'Output Compare 5', category: 'OC' },
    { value: 0xC, signalName: 'OC8', description: 'Output Compare 8', category: 'OC' },
    { value: 0xE, signalName: 'C1OUT', description: 'Comparator 1 Output', category: 'Other' },
    { value: 0xF, signalName: 'REFCLKO3', description: 'Reference Clock Output 3', category: 'RefClk' },
];

/**
 * Group 3: Output group with U1RTS, U2TX, OC1, OC2, OC9, etc.
 */
const OUTPUT_GROUP_3: PPSOutputValue[] = [
    { value: 0x0, signalName: 'No Connect', description: 'Not connected', category: 'Other' },
    { value: 0x1, signalName: 'U1RTS', description: 'UART1 Request to Send', category: 'UART' },
    { value: 0x2, signalName: 'U2TX', description: 'UART2 Transmit', category: 'UART' },
    { value: 0x3, signalName: 'U5RTS', description: 'UART5 Request to Send', category: 'UART' },
    { value: 0x4, signalName: 'U6TX', description: 'UART6 Transmit', category: 'UART' },
    { value: 0x6, signalName: 'SS2', description: 'SPI2 Slave Select', category: 'SPI' },
    { value: 0x8, signalName: 'SDO4', description: 'SPI4 Data Output', category: 'SPI' },
    { value: 0xA, signalName: 'SDO6', description: 'SPI6 Data Output', category: 'SPI' },
    { value: 0xB, signalName: 'OC2', description: 'Output Compare 2', category: 'OC' },
    { value: 0xC, signalName: 'OC1', description: 'Output Compare 1', category: 'OC' },
    { value: 0xD, signalName: 'OC9', description: 'Output Compare 9', category: 'OC' },
];

/**
 * All PPS Output Pins with their available peripheral outputs
 */
export const PPS_OUTPUT_PINS: PPSOutputPin[] = [
    // Group 0 pins
    { rpPin: 'RPD2', registerName: 'RPD2R', validPeripherals: OUTPUT_GROUP_0 },
    { rpPin: 'RPG8', registerName: 'RPG8R', validPeripherals: OUTPUT_GROUP_0 },
    { rpPin: 'RPF4', registerName: 'RPF4R', validPeripherals: OUTPUT_GROUP_0 },
    { rpPin: 'RPD10', registerName: 'RPD10R', validPeripherals: OUTPUT_GROUP_0 },
    { rpPin: 'RPF1', registerName: 'RPF1R', validPeripherals: OUTPUT_GROUP_0 },
    { rpPin: 'RPB9', registerName: 'RPB9R', validPeripherals: OUTPUT_GROUP_0 },
    { rpPin: 'RPB10', registerName: 'RPB10R', validPeripherals: OUTPUT_GROUP_0 },
    { rpPin: 'RPC14', registerName: 'RPC14R', validPeripherals: OUTPUT_GROUP_0 },
    { rpPin: 'RPB5', registerName: 'RPB5R', validPeripherals: OUTPUT_GROUP_0 },
    { rpPin: 'RPC1', registerName: 'RPC1R', validPeripherals: OUTPUT_GROUP_0 },
    { rpPin: 'RPD14', registerName: 'RPD14R', validPeripherals: OUTPUT_GROUP_0 },
    { rpPin: 'RPG1', registerName: 'RPG1R', validPeripherals: OUTPUT_GROUP_0 },
    { rpPin: 'RPA14', registerName: 'RPA14R', validPeripherals: OUTPUT_GROUP_0 },
    { rpPin: 'RPD6', registerName: 'RPD6R', validPeripherals: OUTPUT_GROUP_0 },
    
    // Group 1 pins
    { rpPin: 'RPD3', registerName: 'RPD3R', validPeripherals: OUTPUT_GROUP_1 },
    { rpPin: 'RPG7', registerName: 'RPG7R', validPeripherals: OUTPUT_GROUP_1 },
    { rpPin: 'RPF5', registerName: 'RPF5R', validPeripherals: OUTPUT_GROUP_1 },
    { rpPin: 'RPD11', registerName: 'RPD11R', validPeripherals: OUTPUT_GROUP_1 },
    { rpPin: 'RPF0', registerName: 'RPF0R', validPeripherals: OUTPUT_GROUP_1 },
    { rpPin: 'RPB1', registerName: 'RPB1R', validPeripherals: OUTPUT_GROUP_1 },
    { rpPin: 'RPE5', registerName: 'RPE5R', validPeripherals: OUTPUT_GROUP_1 },
    { rpPin: 'RPC13', registerName: 'RPC13R', validPeripherals: OUTPUT_GROUP_1 },
    { rpPin: 'RPB3', registerName: 'RPB3R', validPeripherals: OUTPUT_GROUP_1 },
    { rpPin: 'RPC4', registerName: 'RPC4R', validPeripherals: OUTPUT_GROUP_1 },
    { rpPin: 'RPD15', registerName: 'RPD15R', validPeripherals: OUTPUT_GROUP_1 },
    { rpPin: 'RPG0', registerName: 'RPG0R', validPeripherals: OUTPUT_GROUP_1 },
    { rpPin: 'RPA15', registerName: 'RPA15R', validPeripherals: OUTPUT_GROUP_1 },
    { rpPin: 'RPD7', registerName: 'RPD7R', validPeripherals: OUTPUT_GROUP_1 },
    
    // Group 2 pins
    { rpPin: 'RPD9', registerName: 'RPD9R', validPeripherals: OUTPUT_GROUP_2 },
    { rpPin: 'RPG6', registerName: 'RPG6R', validPeripherals: OUTPUT_GROUP_2 },
    { rpPin: 'RPB8', registerName: 'RPB8R', validPeripherals: OUTPUT_GROUP_2 },
    { rpPin: 'RPB15', registerName: 'RPB15R', validPeripherals: OUTPUT_GROUP_2 },
    { rpPin: 'RPD4', registerName: 'RPD4R', validPeripherals: OUTPUT_GROUP_2 },
    { rpPin: 'RPB0', registerName: 'RPB0R', validPeripherals: OUTPUT_GROUP_2 },
    { rpPin: 'RPE3', registerName: 'RPE3R', validPeripherals: OUTPUT_GROUP_2 },
    { rpPin: 'RPB7', registerName: 'RPB7R', validPeripherals: OUTPUT_GROUP_2 },
    { rpPin: 'RPF12', registerName: 'RPF12R', validPeripherals: OUTPUT_GROUP_2 },
    { rpPin: 'RPD12', registerName: 'RPD12R', validPeripherals: OUTPUT_GROUP_2 },
    { rpPin: 'RPF8', registerName: 'RPF8R', validPeripherals: OUTPUT_GROUP_2 },
    { rpPin: 'RPC3', registerName: 'RPC3R', validPeripherals: OUTPUT_GROUP_2 },
    { rpPin: 'RPE9', registerName: 'RPE9R', validPeripherals: OUTPUT_GROUP_2 },
    
    // Group 3 pins
    { rpPin: 'RPD1', registerName: 'RPD1R', validPeripherals: OUTPUT_GROUP_3 },
    { rpPin: 'RPG9', registerName: 'RPG9R', validPeripherals: OUTPUT_GROUP_3 },
    { rpPin: 'RPB14', registerName: 'RPB14R', validPeripherals: OUTPUT_GROUP_3 },
    { rpPin: 'RPD0', registerName: 'RPD0R', validPeripherals: OUTPUT_GROUP_3 },
    { rpPin: 'RPB6', registerName: 'RPB6R', validPeripherals: OUTPUT_GROUP_3 },
    { rpPin: 'RPD5', registerName: 'RPD5R', validPeripherals: OUTPUT_GROUP_3 },
    { rpPin: 'RPB2', registerName: 'RPB2R', validPeripherals: OUTPUT_GROUP_3 },
    { rpPin: 'RPF3', registerName: 'RPF3R', validPeripherals: OUTPUT_GROUP_3 },
    { rpPin: 'RPF13', registerName: 'RPF13R', validPeripherals: OUTPUT_GROUP_3 },
    { rpPin: 'RPC2', registerName: 'RPC2R', validPeripherals: OUTPUT_GROUP_3 },
    { rpPin: 'RPE8', registerName: 'RPE8R', validPeripherals: OUTPUT_GROUP_3 },
    { rpPin: 'RPF2', registerName: 'RPF2R', validPeripherals: OUTPUT_GROUP_3 },
];

/**
 * Get available output peripherals for a specific RP pin
 */
export function getPPSOutputsForPin(rpPin: string): PPSOutputValue[] | undefined {
    const pinConfig = PPS_OUTPUT_PINS.find(p => p.rpPin === rpPin);
    return pinConfig?.validPeripherals;
}

/**
 * Get PPS input signal definition by name
 */
export function getPPSInputSignal(signalName: string): PPSInputSignal | undefined {
    return PPS_INPUT_SIGNALS.find(s => s.signalName === signalName);
}
