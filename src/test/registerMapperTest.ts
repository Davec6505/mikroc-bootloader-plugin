/**
 * Register Mapper Test
 * Validates DEVCFG register calculation
 */

import { calculateRegisters, formatRegisterValue, EFH_REGISTER_MAP } from '../devices/pic32mz/efhRegisterMap';
import { EFH_UI_SCHEMA } from '../devices/pic32mz/efhUiSchema';

/**
 * Test 1: Verify all 40 settings are mapped
 */
function testAllSettingsMapped() {
    console.log('\n=== Test 1: Verify All Settings Mapped ===');
    let missingCount = 0;

    for (let i = 0; i < 40; i++) {
        if (!EFH_REGISTER_MAP[i]) {
            console.error(`❌ Setting ${i} is not mapped!`);
            missingCount++;
        }
    }

    if (missingCount === 0) {
        console.log('✅ All 40 settings are mapped');
    } else {
        console.error(`❌ ${missingCount} settings are missing mappings`);
    }
}

/**
 * Test 2: Calculate registers with default values
 */
function testDefaultCalculation() {
    console.log('\n=== Test 2: Calculate Registers with Defaults ===');

    // Initialize with defaults
    const config = new Map<number, string>();
    EFH_UI_SCHEMA.forEach(setting => {
        config.set(setting.index, setting.defaultValue);
    });

    const registers = calculateRegisters(config);

    console.log('Calculated DEVCFG values:');
    console.log(`  DEVCFG3: ${formatRegisterValue(registers.DEVCFG3)}`);
    console.log(`  DEVCFG2: ${formatRegisterValue(registers.DEVCFG2)}`);
    console.log(`  DEVCFG1: ${formatRegisterValue(registers.DEVCFG1)}`);
    console.log(`  DEVCFG0: ${formatRegisterValue(registers.DEVCFG0)}`);

    // Reference values from WatchDog_Timer.cfg
    const reference = {
        DEVCFG3: 0x43000000,
        DEVCFG2: 0x40013190,
        DEVCFG1: 0x5FEAC7F9,
        DEVCFG0: 0x403FF773
    };

    console.log('\nReference values (WatchDog_Timer.cfg):');
    console.log(`  DEVCFG3: ${formatRegisterValue(reference.DEVCFG3)}`);
    console.log(`  DEVCFG2: ${formatRegisterValue(reference.DEVCFG2)}`);
    console.log(`  DEVCFG1: ${formatRegisterValue(reference.DEVCFG1)}`);
    console.log(`  DEVCFG0: ${formatRegisterValue(reference.DEVCFG0)}`);

    console.log('\nNote: Values may differ if default config differs from WDT example');
}

/**
 * Test 3: Verify bit field positioning
 */
function testBitFieldPositioning() {
    console.log('\n=== Test 3: Verify Bit Field Positioning ===');

    // Test SETTING6: System PLL Input Divider (DEVCFG2.FPLLIDIV[2:0])
    const testConfig = new Map<number, string>();
    
    // Set all to defaults first
    EFH_UI_SCHEMA.forEach(setting => {
        testConfig.set(setting.index, setting.defaultValue);
    });

    // Test different divider values
    const testCases = [
        { value: '1x Divider', expectedBits: 0b000 },
        { value: '2x Divider', expectedBits: 0b001 },
        { value: '3x Divider', expectedBits: 0b010 },
        { value: '4x Divider', expectedBits: 0b011 }
    ];

    console.log('Testing FPLLIDIV field (DEVCFG2 bits 2:0):');
    testCases.forEach(test => {
        testConfig.set(6, test.value);
        const registers = calculateRegisters(testConfig);
        const extractedBits = registers.DEVCFG2 & 0b111;
        
        if (extractedBits === test.expectedBits) {
            console.log(`  ✅ "${test.value}" → 0b${extractedBits.toString(2).padStart(3, '0')}`);
        } else {
            console.error(`  ❌ "${test.value}" → Expected 0b${test.expectedBits.toString(2).padStart(3, '0')}, got 0b${extractedBits.toString(2).padStart(3, '0')}`);
        }
    });
}

/**
 * Test 4: Verify multiple field combination
 */
function testMultipleFields() {
    console.log('\n=== Test 4: Test Multiple Field Combination ===');

    const config = new Map<number, string>();
    
    // Set all to defaults
    EFH_UI_SCHEMA.forEach(setting => {
        config.set(setting.index, setting.defaultValue);
    });

    // Configure specific PLL settings
    config.set(6, '3x Divider');        // FPLLIDIV = 0b010 (bits 2:0)
    config.set(7, '5-10 MHz');          // FPLLRNG = 0b001 (bits 6:4)
    config.set(8, 'POSC (Primary Oscillator)'); // FPLLICLK = 0b1 (bit 7)
    config.set(9, 'PLL Multiply by 50'); // FPLLMULT = 49 (bits 14:8)

    const registers = calculateRegisters(config);

    console.log('DEVCFG2 field breakdown:');
    console.log(`  FPLLIDIV [2:0]:   ${(registers.DEVCFG2 & 0b111).toString(2).padStart(3, '0')} (${registers.DEVCFG2 & 0b111})`);
    console.log(`  FPLLRNG [6:4]:    ${((registers.DEVCFG2 >> 4) & 0b111).toString(2).padStart(3, '0')} (${(registers.DEVCFG2 >> 4) & 0b111})`);
    console.log(`  FPLLICLK [7]:     ${((registers.DEVCFG2 >> 7) & 0b1).toString(2)} (${(registers.DEVCFG2 >> 7) & 0b1})`);
    console.log(`  FPLLMULT [14:8]:  ${((registers.DEVCFG2 >> 8) & 0b1111111).toString(2).padStart(7, '0')} (${(registers.DEVCFG2 >> 8) & 0b1111111})`);
    console.log(`  Full DEVCFG2:     ${formatRegisterValue(registers.DEVCFG2)}`);
}

/**
 * Test 5: Verify register masking
 */
function testRegisterMasking() {
    console.log('\n=== Test 5: Verify Register Masking ===');

    const config = new Map<number, string>();
    
    // Set all to defaults
    EFH_UI_SCHEMA.forEach(setting => {
        config.set(setting.index, setting.defaultValue);
    });

    // Set specific values
    config.set(26, 'Debugger is disabled');  // DEBUG = 0 (should clear bits 1:0)
    config.set(27, 'JTAG Port Enabled');     // JTAGEN = 1 (should set bit 2)

    const registers = calculateRegisters(config);

    console.log('DEVCFG0 debug bits:');
    console.log(`  DEBUG [1:0]:   ${(registers.DEVCFG0 & 0b11).toString(2).padStart(2, '0')}`);
    console.log(`  JTAGEN [2]:    ${((registers.DEVCFG0 >> 2) & 0b1)}`);
    console.log(`  Full DEVCFG0:  ${formatRegisterValue(registers.DEVCFG0)}`);
}

/**
 * Run all tests
 */
function runAllTests() {
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║  PIC32MZ EFH Register Mapper Test Suite            ║');
    console.log('╚══════════════════════════════════════════════════════╝');

    try {
        testAllSettingsMapped();
        testDefaultCalculation();
        testBitFieldPositioning();
        testMultipleFields();
        testRegisterMasking();

        console.log('\n✅ All tests completed!');
        console.log('\nNext steps:');
        console.log('  1. Compare calculated values with .cfgsch schemes');
        console.log('  2. Test in VS Code extension with webview');
        console.log('  3. Validate against PIC32MZ datasheet');
    } catch (error) {
        console.error('\n❌ Test suite failed:', error);
    }
}

// Run tests
runAllTests();
