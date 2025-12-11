/**
 * Test for Clock Generator
 * Compares output with Blinky_XC32 MCC-generated code
 */

import { HarmonyClkGenerator } from './harmonyClkGen';
import * as fs from 'fs';
import * as path from 'path';

// Test that matches Blinky_XC32 configuration
function testBlinkyConfig() {
    console.log('=== Testing Clock Generator with Blinky_XC32 Configuration ===\n');

    const generator = new HarmonyClkGenerator('');
    
    // Get default config (matches Blinky_XC32)
    const config = HarmonyClkGenerator.getDefaultConfig();
    const pmdConfig = HarmonyClkGenerator.getDefaultPMDConfig();

    // Generate files
    const files = generator.generate(config, pmdConfig);

    console.log('Generated plib_clk.c:\n');
    console.log('----------------------------------------');
    console.log(files.source);
    console.log('----------------------------------------\n');

    // Calculate PBCLK frequencies
    console.log('PBCLK Frequencies:');
    console.log(`  PBCLK1: ${generator.calculatePBCLKFrequency(config.cpuClockFrequency, config.pbclk1.divider)} Hz (${config.pbclk1.divider}x divider)`);
    console.log(`  PBCLK2: ${generator.calculatePBCLKFrequency(config.cpuClockFrequency, config.pbclk2.divider)} Hz (${config.pbclk2.divider}x divider) - UART, SPI, I2C`);
    console.log(`  PBCLK3: ${generator.calculatePBCLKFrequency(config.cpuClockFrequency, config.pbclk3.divider)} Hz (${config.pbclk3.divider}x divider) - Timers, ADC`);
    console.log(`  PBCLK4: ${generator.calculatePBCLKFrequency(config.cpuClockFrequency, config.pbclk4.divider)} Hz (${config.pbclk4.divider}x divider)`);
    console.log(`  PBCLK5: ${generator.calculatePBCLKFrequency(config.cpuClockFrequency, config.pbclk5.divider)} Hz (${config.pbclk5.divider}x divider)`);
    console.log(`  PBCLK7: ${generator.calculatePBCLKFrequency(config.cpuClockFrequency, config.pbclk7.divider)} Hz (${config.pbclk7.divider}x divider)`);
    console.log();

    // Verify key sections
    const expectedPB2DIV = 'PB2DIVbits.PBDIV = 3;';
    const expectedPB3DIV = 'PB3DIVbits.PBDIV = 3;';
    const expectedPMD1 = 'PMD1 = 0x1001U;';

    let success = true;

    if (!files.source.includes(expectedPB2DIV)) {
        console.error('❌ FAILED: Missing PB2DIV configuration');
        success = false;
    } else {
        console.log('✓ PB2DIV configuration correct');
    }

    if (!files.source.includes(expectedPB3DIV)) {
        console.error('❌ FAILED: Missing PB3DIV configuration');
        success = false;
    } else {
        console.log('✓ PB3DIV configuration correct');
    }

    if (!files.source.includes(expectedPMD1)) {
        console.error('❌ FAILED: Missing PMD1 configuration');
        success = false;
    } else {
        console.log('✓ PMD1 configuration correct');
    }

    if (!files.source.includes('SYSKEY')) {
        console.error('❌ FAILED: Missing SYSKEY unlock/lock');
        success = false;
    } else {
        console.log('✓ SYSKEY unlock/lock present');
    }

    if (!files.source.includes('CFGCONbits.PMDLOCK')) {
        console.error('❌ FAILED: Missing PMDLOCK');
        success = false;
    } else {
        console.log('✓ PMDLOCK configuration correct');
    }

    if (success) {
        console.log('\n✅ All tests passed! Generator output matches expected MCC format.\n');
    } else {
        console.log('\n❌ Some tests failed. Review output above.\n');
    }

    return success;
}

// Test custom configuration
function testCustomConfig() {
    console.log('=== Testing Custom UART Configuration (115200 baud) ===\n');

    const generator = new HarmonyClkGenerator('');
    
    // Custom config for UART at 115200 baud
    // Need 50 MHz PBCLK2 for accurate baud rate
    const config = {
        cpuClockFrequency: 200000000,
        pbclk1: { enabled: true, divider: 2 },
        pbclk2: { enabled: true, divider: 4 },  // 50 MHz for UART
        pbclk3: { enabled: true, divider: 4 },
        pbclk4: { enabled: false, divider: 2 }, // Disabled
        pbclk5: { enabled: true, divider: 2 },
        pbclk7: { enabled: true, divider: 1 },
    };

    const pmdConfig = {
        pmd1: '0x1001',
        pmd2: '0x3',
        pmd3: '0x1ff01ff',
        pmd4: '0x1f0',
        pmd5: '0x301f3f3f',
        pmd6: '0x10830001',
        pmd7: '0x500000',
    };

    const files = generator.generate(config, pmdConfig);

    console.log('PBCLK2 Frequency:', generator.calculatePBCLKFrequency(config.cpuClockFrequency, config.pbclk2.divider), 'Hz');
    console.log();

    // Verify PBCLK4 is disabled
    if (files.source.includes('PB4DIVCLR')) {
        console.log('✓ PBCLK4 correctly disabled');
    } else {
        console.error('❌ PBCLK4 should be disabled');
    }

    console.log('\nGenerated configuration section:');
    console.log('----------------------------------------');
    const configSection = files.source.split('CFGCONbits.PMDLOCK = 1;')[1].split('/* Lock system')[0];
    console.log(configSection);
    console.log('----------------------------------------\n');
}

// Run tests
if (require.main === module) {
    const test1 = testBlinkyConfig();
    console.log('\n' + '='.repeat(80) + '\n');
    testCustomConfig();
    
    if (test1) {
        console.log('\n✅ Clock generator is ready for integration!\n');
    }
}

export { testBlinkyConfig, testCustomConfig };
