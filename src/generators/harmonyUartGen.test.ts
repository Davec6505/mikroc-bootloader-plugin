/**
 * Test for UART Generator
 * Validates UART code generation
 */

import { HarmonyUartGenerator, UartConfig } from './harmonyUartGen';
import * as path from 'path';

function testUartBaudRateCalculation() {
    console.log('=== Testing UART Baud Rate Calculation ===\n');

    const generator = new HarmonyUartGenerator('');
    
    // Test 115200 baud with 50 MHz PBCLK2
    const config: UartConfig = {
        instanceName: 'UART1',
        instanceNum: 1,
        operatingMode: 'non-blocking',
        stopBits: 1,
        parityAndData: '8N',
        highBaudRate: true,  // 4x divisor
        uenSelect: 0,
        baudRate: 115200,
        clockFreq: 50000000,  // 50 MHz PBCLK2
    };

    const result = generator.calculateBaudRate(config);
    
    console.log('Configuration:');
    console.log(`  PBCLK2: ${config.clockFreq} Hz`);
    console.log(`  Target Baud: ${config.baudRate}`);
    console.log(`  High Baud Rate (4x): ${config.highBaudRate}`);
    console.log();
    
    console.log('Results:');
    console.log(`  BRG Value: 0x${result.brgValue.toString(16).toUpperCase()} (${result.brgValue})`);
    console.log(`  Actual Baud: ${result.actualBaud.toFixed(2)}`);
    console.log(`  Error: ${result.errorPercent.toFixed(4)}%`);
    console.log();

    // Validate
    let success = true;
    
    if (Math.abs(result.errorPercent) > 2.0) {
        console.error('❌ FAILED: Baud rate error > 2%');
        success = false;
    } else {
        console.log('✓ Baud rate error within acceptable range (<2%)');
    }

    const expectedBRG = Math.round((50000000 / (4 * 115200)) - 1);
    if (result.brgValue === expectedBRG) {
        console.log('✓ BRG calculation correct');
    } else {
        console.error(`❌ FAILED: Expected BRG ${expectedBRG}, got ${result.brgValue}`);
        success = false;
    }

    return success;
}

function testUartConfiguration() {
    console.log('\n=== Testing UART Configuration ===\n');

    const generator = new HarmonyUartGenerator('');
    const config = HarmonyUartGenerator.getDefaultConfig(1, 50000000);

    console.log('Default Configuration:');
    console.log(`  Instance: ${config.instanceName}`);
    console.log(`  Operating Mode: ${config.operatingMode}`);
    console.log(`  Stop Bits: ${config.stopBits}`);
    console.log(`  Parity/Data: ${config.parityAndData}`);
    console.log(`  High Baud Rate: ${config.highBaudRate}`);
    console.log(`  Baud Rate: ${config.baudRate}`);
    console.log(`  Clock: ${config.clockFreq} Hz`);
    console.log();

    const baudResult = generator.calculateBaudRate(config);
    console.log(`Baud Error: ${baudResult.errorPercent.toFixed(4)}%`);
    
    return true;
}

function testInterruptGeneration() {
    console.log('\n=== Testing Interrupt Code Generation ===\n');

    const generator = new HarmonyUartGenerator('');
    const config = HarmonyUartGenerator.getDefaultConfig(1, 50000000);

    const declarations = generator.generateInterruptDeclarations(config);
    const vectors = generator.generateInterruptVectors(config);

    console.log('Interrupt Declarations:');
    console.log('----------------------------------------');
    console.log(declarations);
    console.log('----------------------------------------\n');

    console.log('Interrupt Vectors:');
    console.log('----------------------------------------');
    console.log(vectors);
    console.log('----------------------------------------\n');

    let success = true;

    if (!declarations.includes('UART1_FAULT_InterruptHandler')) {
        console.error('❌ FAILED: Missing FAULT handler declaration');
        success = false;
    } else {
        console.log('✓ FAULT handler declaration present');
    }

    if (!vectors.includes('__ISR(_UART_1_FAULT_VECTOR')) {
        console.error('❌ FAILED: Missing FAULT ISR vector');
        success = false;
    } else {
        console.log('✓ FAULT ISR vector present');
    }

    if (!vectors.includes('__ISR(_UART_1_RX_VECTOR')) {
        console.error('❌ FAILED: Missing RX ISR vector');
        success = false;
    } else {
        console.log('✓ RX ISR vector present');
    }

    if (!vectors.includes('__ISR(_UART_1_TX_VECTOR')) {
        console.error('❌ FAILED: Missing TX ISR vector');
        success = false;
    } else {
        console.log('✓ TX ISR vector present');
    }

    return success;
}

function testMultipleBaudRates() {
    console.log('\n=== Testing Multiple Baud Rates ===\n');

    const generator = new HarmonyUartGenerator('');
    const baudRates = [9600, 19200, 38400, 57600, 115200, 230400, 460800];
    const pbclk2 = 50000000;

    console.log('PBCLK2: 50 MHz, High-Speed Mode (4x)\n');
    console.log('Baud Rate  | BRG Value | Actual Baud | Error %');
    console.log('-----------|-----------|-------------|----------');

    let allGood = true;

    for (const baud of baudRates) {
        const config: UartConfig = {
            instanceName: 'UART1',
            instanceNum: 1,
            operatingMode: 'non-blocking',
            stopBits: 1,
            parityAndData: '8N',
            highBaudRate: true,
            uenSelect: 0,
            baudRate: baud,
            clockFreq: pbclk2,
        };

        const result = generator.calculateBaudRate(config);
        const errorStr = result.errorPercent.toFixed(4).padStart(8);
        const statusIcon = Math.abs(result.errorPercent) < 2.0 ? '✓' : '✗';
        
        console.log(`${baud.toString().padStart(10)} | 0x${result.brgValue.toString(16).toUpperCase().padStart(7)} | ${result.actualBaud.toFixed(2).padStart(11)} | ${errorStr} ${statusIcon}`);
        
        if (Math.abs(result.errorPercent) >= 2.0) {
            allGood = false;
        }
    }

    console.log();
    return allGood;
}

// Run tests
if (require.main === module) {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║          UART Generator Test Suite                            ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const test1 = testUartBaudRateCalculation();
    const test2 = testUartConfiguration();
    const test3 = testInterruptGeneration();
    const test4 = testMultipleBaudRates();

    console.log('\n' + '='.repeat(80));
    console.log('Test Summary:');
    console.log('='.repeat(80));
    console.log(`  Baud Rate Calculation: ${test1 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Configuration: ${test2 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Interrupt Generation: ${test3 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Multiple Baud Rates: ${test4 ? '✅ PASS' : '❌ FAIL'}`);
    console.log('='.repeat(80));

    if (test1 && test2 && test3 && test4) {
        console.log('\n✅ All tests passed! UART generator is ready.\n');
        process.exit(0);
    } else {
        console.log('\n❌ Some tests failed. Review output above.\n');
        process.exit(1);
    }
}

export { testUartBaudRateCalculation, testUartConfiguration, testInterruptGeneration, testMultipleBaudRates };
