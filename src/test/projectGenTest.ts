/**
 * Test XC32 Project Generator
 * Verifies complete project generation workflow
 */

import { generateXC32Project, validateProjectOptions, XC32ProjectOptions } from '../generators/xc32ProjectGen';
import * as fs from 'fs';
import * as path from 'path';

async function testProjectGeneration() {
    console.log('=== XC32 Project Generator Test ===\n');
    
    // Create test settings (minimal configuration)
    const testSettings = new Map<number, string>();
    
    // DEVCFG3
    testSettings.set(0, 'Default RMII');                              // FMIIEN
    testSettings.set(1, 'Default Ethernet I/O Pins');                 // FETHIO
    testSettings.set(2, 'Allow only one reconfiguration');            // PGL1WAY
    testSettings.set(3, 'Allow only one reconfiguration');            // PMDL1WAY
    testSettings.set(4, 'Allow only one reconfiguration');            // IOL1WAY
    testSettings.set(5, 'Controlled by USB Module');                  // FUSBIDIO
    
    // DEVCFG2 (PLL)
    testSettings.set(6, '3x Divider');                                // FPLLIDIV
    testSettings.set(7, '5-10 MHz');                                  // FPLLRNG
    testSettings.set(8, 'POSC (Primary Oscillator)');                 // FPLLICLK
    testSettings.set(9, 'PLL Multiply by 50');                        // FPLLMULT
    testSettings.set(10, '2x Divider');                               // FPLLODIV
    
    // DEVCFG1 (Oscillator)
    testSettings.set(12, 'Primary Oscillator (XT, HS, EC) with PLL'); // FNOSC
    testSettings.set(14, 'Disabled');                                 // FSOSCEN
    testSettings.set(15, 'Disabled');                                 // IESO
    testSettings.set(16, 'HS mode (crystal, 10-40 MHz)');            // POSCMOD
    testSettings.set(17, 'Disabled (REFCLKO I/O pin enabled)');      // OSCIOFNC
    testSettings.set(18, 'Clock switching and FSCM are disabled');   // FCKSM
    testSettings.set(22, 'WDT Disabled');                            // FWDTEN
    
    // DEVCFG0 (Debug)
    testSettings.set(26, 'Debugger is disabled');                    // DEBUG
    testSettings.set(27, 'JTAG Port Enabled');                       // JTAGEN
    testSettings.set(28, 'Communicate on PGEC1/PGED1');             // ICESEL
    testSettings.set(29, 'Trace features are disabled');            // TRCEN
    testSettings.set(30, 'Boot code and Exception code is MIPS32'); // BOOTISA
    
    // Test project options
    const options: XC32ProjectOptions = {
        projectName: 'test_blinky',
        deviceName: 'P32MZ2048EFH100',
        outputPath: 'C:/Temp',
        settings: testSettings
    };
    
    // Validate options
    console.log('1. Validating project options...');
    const errors = validateProjectOptions(options);
    if (errors.length > 0) {
        console.error('Validation errors:');
        errors.forEach(err => console.error(`  - ${err}`));
        return;
    }
    console.log('   ✓ Options valid\n');
    
    // Generate project
    console.log('2. Generating project...');
    try {
        await generateXC32Project(options);
        console.log('   ✓ Project generated\n');
    } catch (error) {
        console.error('   ✗ Generation failed:', error);
        return;
    }
    
    // Verify structure
    console.log('3. Verifying project structure...');
    const projectRoot = path.join(options.outputPath, options.projectName);
    
    const expectedFiles = [
        'Makefile',
        'README.md',
        '.vscode/tasks.json',
        '.vscode/c_cpp_properties.json',
        'config/default/initialization.c',
        'config/default/initialization.h',
        'srcs/main.c',
        'srcs/Makefile',
        'linker/p32MZ2048EFH100.ld'
    ];
    
    const expectedDirs = [
        'incs',
        'bins',
        'objs'
    ];
    
    let allFilesExist = true;
    expectedFiles.forEach(file => {
        const filePath = path.join(projectRoot, file);
        if (fs.existsSync(filePath)) {
            console.log(`   ✓ ${file}`);
        } else {
            console.log(`   ✗ ${file} - MISSING`);
            allFilesExist = false;
        }
    });
    
    expectedDirs.forEach(dir => {
        const dirPath = path.join(projectRoot, dir);
        if (fs.existsSync(dirPath)) {
            console.log(`   ✓ ${dir}/`);
        } else {
            console.log(`   ✗ ${dir}/ - MISSING`);
            allFilesExist = false;
        }
    });
    
    if (!allFilesExist) {
        console.error('\n✗ Project structure incomplete');
        return;
    }
    
    console.log('\n4. Verifying file contents...');
    
    // Check initialization.c contains #pragma config
    const initC = fs.readFileSync(path.join(projectRoot, 'config/default/initialization.c'), 'utf8');
    if (initC.includes('#pragma config')) {
        console.log('   ✓ initialization.c contains #pragma config statements');
    } else {
        console.log('   ✗ initialization.c missing #pragma config');
    }
    
    // Check main.c contains device name
    const mainC = fs.readFileSync(path.join(projectRoot, 'srcs/main.c'), 'utf8');
    if (mainC.includes('P32MZ2048EFH100')) {
        console.log('   ✓ main.c contains device name');
    } else {
        console.log('   ✗ main.c missing device name substitution');
    }
    
    // Check Makefile contains project name
    const makefile = fs.readFileSync(path.join(projectRoot, 'Makefile'), 'utf8');
    if (makefile.includes('test_blinky')) {
        console.log('   ✓ Makefile contains project name');
    } else {
        console.log('   ✗ Makefile missing project name substitution');
    }
    
    console.log('\n=== Test Complete ===');
    console.log(`Project created at: ${projectRoot}`);
    console.log('\nTo test build:');
    console.log(`  cd ${projectRoot}`);
    console.log('  make');
}

// Run test
testProjectGeneration().catch(console.error);
